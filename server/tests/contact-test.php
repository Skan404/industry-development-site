<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/Contact.php';
require dirname(__DIR__) . '/vendor/autoload.php';
use IndDev\HttpError;

$root = sys_get_temp_dir() . '/inddev-test-' . bin2hex(random_bytes(8));
$config = [
    'enabled' => true, 'origin' => 'https://www.inddev.pl', 'turnstile_secret' => 'test-secret',
    'turnstile_hostname' => 'www.inddev.pl', 'turnstile_action' => 'contact',
    'rate_secret' => str_repeat('a', 64), 'storage_path' => $root,
    'recipient' => 'receiver@example.test', 'smtp' => [
        'from' => 'sender@example.test', 'host' => 'smtp.example.test', 'username' => 'sender',
        'password' => 'test-only', 'port' => 465, 'encryption' => 'smtps',
    ],
];
$server = ['REQUEST_METHOD' => 'POST', 'CONTENT_TYPE' => 'application/json', 'HTTP_ORIGIN' => $config['origin'], 'REMOTE_ADDR' => '192.0.2.1'];
$input = ['name' => 'Jan Testowy', 'company' => 'Przykład', 'email' => 'jan@example.test', 'phone' => '', 'companyUrl' => '', 'requestId' => '00000000-0000-4000-8000-000000000001', 'cf-turnstile-response' => 'test-token'];
$tests = 0;
function check(bool $value, string $message): void { global $tests; if (!$value) throw new RuntimeException($message); $tests++; echo "PASS $message\n"; }
function fails(int $status, callable $fn, string $message): void {
    try { $fn(); } catch (HttpError $error) { check($error->status === $status, $message); return; }
    throw new RuntimeException("Expected $status: $message");
}
$validate = fn(array $data) => IndDev\validateRequest($server, json_encode($data), $config);
try {
    check($validate($input)['name'] === 'Jan Testowy', 'valid payload');
    check(IndDev\validTurnstileResult(['success' => true, 'hostname' => 'www.inddev.pl', 'action' => 'contact'], $config), 'Turnstile expected hostname and action accepted');
    check(!IndDev\validTurnstileResult(['success' => true, 'hostname' => 'evil.test', 'action' => 'contact'], $config), 'Turnstile other hostname rejected');
    check(!IndDev\validTurnstileResult(['success' => true, 'hostname' => 'www.inddev.pl', 'action' => 'login'], $config), 'Turnstile other action rejected');
    check(!IndDev\validTurnstileResult(['success' => false, 'hostname' => 'www.inddev.pl', 'action' => 'contact'], $config), 'Turnstile failure rejected');
    $mail = IndDev\buildMail($validate($input), $config);
    check($mail->From === 'sender@example.test' && $mail->getReplyToAddresses()[0][0] === 'jan@example.test', 'authenticated sender and visitor Reply-To are separate');
    check($mail->SMTPSecure === 'ssl' && $mail->SMTPAuth === true && $mail->Port === 465, 'SMTP requires encrypted authenticated transport');
    check($mail->preSend() && str_contains($mail->getSentMIMEMessage(), 'Reply-To:'), 'PHPMailer composes a valid MIME message without sending');
    fails(422, fn() => $validate(array_replace($input, ['email' => "a@example.test\r\nBcc: attacker@example.test"])), 'header injection rejected');
    fails(422, fn() => $validate(array_replace($input, ['name' => str_repeat('ą', 101)])), 'unicode length enforced');
    fails(422, fn() => $validate(array_replace($input, ['name' => ['bad']])), 'nested field rejected');
    fails(422, fn() => $validate(array_replace($input, ['companyUrl' => 'spam'])), 'honeypot rejected');
    fails(422, fn() => $validate(array_replace($input, ['cf-turnstile-response' => ''])), 'missing token rejected');
    fails(403, fn() => IndDev\validateRequest(array_replace($server, ['HTTP_ORIGIN' => 'https://evil.test']), json_encode($input), $config), 'foreign origin rejected');
    fails(405, fn() => IndDev\validateRequest(array_replace($server, ['REQUEST_METHOD' => 'GET']), '{}', $config), 'GET rejected');
    fails(415, fn() => IndDev\validateRequest(array_replace($server, ['CONTENT_TYPE' => 'text/plain']), '{}', $config), 'plain text rejected');
    fails(413, fn() => IndDev\validateRequest($server, str_repeat('x', 8193), $config), 'oversized body rejected');
    fails(400, fn() => IndDev\validateRequest($server, '{broken', $config), 'malformed JSON rejected');
    fails(400, fn() => IndDev\validateRequest($server, '[]', $config), 'array JSON rejected');
    fails(503, fn() => IndDev\validateConfig(array_replace($config, ['enabled' => false])), 'unconfigured backend fails closed');
    check(IndDev\visitorIp($server + ['HTTP_CF_CONNECTING_IP' => '203.0.113.9'], $config) === '192.0.2.1', 'spoofed proxy header ignored');
    check(IndDev\visitorIp($server + ['HTTP_CF_CONNECTING_IP' => '203.0.113.9'], array_replace($config, ['trusted_proxy_cidrs' => ['192.0.2.0/24']])) === '203.0.113.9', 'explicit trusted proxy accepted');
    check(IndDev\ipInCidr('2001:db8::1', '2001:db8::/32') && !IndDev\ipInCidr('2001:db9::1', '2001:db8::/32'), 'IPv6 CIDR boundaries');
    $sent = 0; $verified = 0;
    $verify = function () use (&$verified) { $verified++; return true; };
    $send = function () use (&$sent) { $sent++; };
    $result = IndDev\handle($server, json_encode($input), $config, $verify, $send);
    check($result['ok'] === true && $sent === 1, 'successful request calls delivery once');
    IndDev\handle($server, json_encode($input), $config, $verify, $send);
    check($sent === 1 && $verified === 1, 'retry returns receipt without resending or reusing token');
    fails(409, fn() => IndDev\handle($server, json_encode(array_replace($input, ['name' => 'Different'])), $config, $verify, $send), 'idempotency key cannot change payload');
    $newInput = array_replace($input, ['requestId' => '00000000-0000-4000-8000-000000000002']);
    fails(422, fn() => IndDev\handle($server, json_encode($newInput), $config, fn() => false, $send), 'failed Turnstile prevents delivery');
    check($sent === 1, 'failed verification sent no email');
    fails(502, fn() => IndDev\handle($server, json_encode($newInput), $config, $verify, function () { throw new RuntimeException('SMTP failed'); }), 'SMTP failure returns error');
    fails(409, fn() => IndDev\handle($server, json_encode($newInput), $config, $verify, $send), 'ambiguous SMTP request cannot be duplicated');
    for ($i = 3; $i <= 4; $i++) {
        $attempt = array_replace($input, ['requestId' => sprintf('00000000-0000-4000-8000-%012d', $i)]);
        fails(422, fn() => IndDev\handle($server, json_encode($attempt), $config, fn() => false, $send), "failed verification counts toward rate limit $i");
    }
    $attempt = array_replace($input, ['requestId' => '00000000-0000-4000-8000-000000000005']);
    fails(429, fn() => IndDev\handle($server, json_encode($attempt), $config, $verify, $send), 'per-IP rate limit');
    $state = file_get_contents($root . '/state.json');
    check(!str_contains($state, 'jan@example') && !str_contains($state, '192.0.2.1') && !str_contains($state, 'test-token'), 'state contains no raw contact data');
    echo "$tests tests passed. No external requests or messages sent.\n";
} finally {
    if (is_file($root . '/state.json')) unlink($root . '/state.json');
    if (is_dir($root)) rmdir($root);
}
