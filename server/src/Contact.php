<?php
declare(strict_types=1);

namespace IndDev;

final class HttpError extends \RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function validateConfig(array $config): void
{
    if (($config['enabled'] ?? false) !== true) {
        throw new HttpError(503, 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.');
    }
    foreach (['origin', 'turnstile_secret', 'turnstile_hostname', 'turnstile_action', 'rate_secret', 'storage_path', 'recipient'] as $key) {
        if (!is_string($config[$key] ?? null) || $config[$key] === '') {
            throw new HttpError(503, 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.');
        }
    }
    $smtp = $config['smtp'] ?? [];
    if (strlen($config['rate_secret']) < 64 ||
        !filter_var($config['recipient'], FILTER_VALIDATE_EMAIL) ||
        !filter_var($smtp['from'] ?? '', FILTER_VALIDATE_EMAIL) ||
        !in_array([$smtp['encryption'] ?? '', $smtp['port'] ?? 0], [['smtps', 465], ['starttls', 587]], true)) {
        throw new HttpError(503, 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.');
    }
    foreach (['host', 'username', 'password'] as $key) {
        if (!is_string($smtp[$key] ?? null) || $smtp[$key] === '') {
            throw new HttpError(503, 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.');
        }
    }
}

function validateRequest(array $server, string $body, array $config): array
{
    if (($server['REQUEST_METHOD'] ?? '') !== 'POST') {
        throw new HttpError(405, 'Dozwolone jest wyłącznie wysłanie formularza.');
    }
    if (strlen($body) > 8192 || (int)($server['CONTENT_LENGTH'] ?? 0) > 8192) {
        throw new HttpError(413, 'Zgłoszenie jest zbyt duże.');
    }
    if (strtolower(trim(explode(';', $server['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        throw new HttpError(415, 'Nieobsługiwany format zgłoszenia.');
    }
    if (($server['HTTP_ORIGIN'] ?? '') !== $config['origin']) {
        throw new HttpError(403, 'Wyślij formularz bezpośrednio ze strony IndDev.');
    }
    try {
        $input = json_decode($body, false, 16, JSON_THROW_ON_ERROR);
    } catch (\JsonException) {
        throw new HttpError(400, 'Nieprawidłowy format zgłoszenia.');
    }
    if (!$input instanceof \stdClass) {
        throw new HttpError(400, 'Nieprawidłowy format zgłoszenia.');
    }
    $data = (array)$input;
    $fields = ['name' => 100, 'company' => 160, 'email' => 254, 'phone' => 40];
    $clean = [];
    foreach ($fields as $field => $max) {
        $value = $data[$field] ?? '';
        if (!is_string($value) || !mb_check_encoding($value, 'UTF-8') ||
            preg_match('/[\x00-\x1f\x7f]/u', $value) || mb_strlen($value) > $max) {
            throw new HttpError(422, 'Sprawdź długość i poprawność danych w formularzu.');
        }
        $clean[$field] = trim($value);
        if ($field !== 'phone' && $clean[$field] === '') {
            throw new HttpError(422, 'Uzupełnij imię i nazwisko, firmę oraz e-mail.');
        }
    }
    if (!filter_var($clean['email'], FILTER_VALIDATE_EMAIL) ||
        ($clean['phone'] !== '' && !preg_match('/^\+?[0-9 ()\-.]{6,40}$/D', $clean['phone']))) {
        throw new HttpError(422, 'Podaj poprawny e-mail i numer telefonu.');
    }
    if (!is_string($data['companyUrl'] ?? '') || ($data['companyUrl'] ?? '') !== '') {
        throw new HttpError(422, 'Nie udało się zweryfikować zgłoszenia.');
    }
    if (!is_string($data['requestId'] ?? null) || !preg_match('/^[a-f0-9-]{36}$/D', $data['requestId'])) {
        throw new HttpError(400, 'Odśwież stronę i spróbuj ponownie.');
    }
    if (!is_string($data['cf-turnstile-response'] ?? null) || strlen($data['cf-turnstile-response']) < 1 || strlen($data['cf-turnstile-response']) > 2048) {
        throw new HttpError(422, 'Dokończ weryfikację antyspamową i spróbuj ponownie.');
    }
    return $clean + ['requestId' => $data['requestId'], 'token' => $data['cf-turnstile-response']];
}

function ipInCidr(string $ip, string $cidr): bool
{
    [$network, $bits] = array_pad(explode('/', $cidr, 2), 2, '');
    $address = @inet_pton($ip);
    $range = @inet_pton($network);
    if ($address === false || $range === false || strlen($address) !== strlen($range) || !ctype_digit($bits) || (int)$bits > strlen($range) * 8) return false;
    $bytes = intdiv((int)$bits, 8);
    $rest = (int)$bits % 8;
    return substr($address, 0, $bytes) === substr($range, 0, $bytes) &&
        ($rest === 0 || (ord($address[$bytes]) & (255 << (8 - $rest))) === (ord($range[$bytes]) & (255 << (8 - $rest))));
}

function visitorIp(array $server, array $config): string
{
    $peer = $server['REMOTE_ADDR'] ?? '';
    if (!filter_var($peer, FILTER_VALIDATE_IP)) throw new HttpError(400, 'Nieprawidłowe żądanie.');
    foreach ($config['trusted_proxy_cidrs'] ?? [] as $cidr) {
        if (ipInCidr($peer, $cidr)) {
            $forwarded = $server['HTTP_CF_CONNECTING_IP'] ?? '';
            if (filter_var($forwarded, FILTER_VALIDATE_IP)) return $forwarded;
        }
    }
    return $peer;
}

function verifyTurnstile(string $token, array $config): bool
{
    $curl = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query(['secret' => $config['turnstile_secret'], 'response' => $token]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    $body = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($body === false || $status !== 200) throw new HttpError(503, 'Weryfikacja antyspamowa jest chwilowo niedostępna. Spróbuj później.');
    $result = json_decode($body, true);
    return validTurnstileResult($result, $config);
}

function validTurnstileResult(mixed $result, array $config): bool
{
    return is_array($result) && ($result['success'] ?? false) === true &&
        ($result['hostname'] ?? '') === $config['turnstile_hostname'] &&
        ($result['action'] ?? '') === $config['turnstile_action'];
}

function buildMail(array $data, array $config): \PHPMailer\PHPMailer\PHPMailer
{
    $smtp = $config['smtp'];
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $smtp['host'];
    $mail->Port = $smtp['port'];
    $mail->SMTPAuth = true;
    $mail->SMTPSecure = $smtp['encryption'] === 'smtps' ? 'ssl' : 'tls';
    $mail->Username = $smtp['username'];
    $mail->Password = $smtp['password'];
    $mail->Timeout = 10;
    $mail->getSMTPInstance()->Timelimit = 15;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($smtp['from'], $smtp['from_name'] ?? 'IndDev');
    $mail->addAddress($config['recipient']);
    $mail->addReplyTo($data['email'], $data['name']);
    $mail->Subject = 'IndDev — nowe zapytanie ze strony';
    $mail->Body = "Nowe zapytanie ze strony IndDev\n\nImię i nazwisko: {$data['name']}\nFirma: {$data['company']}\nE-mail: {$data['email']}\nTelefon: " . ($data['phone'] ?: 'Nie podano') . "\n\nIdentyfikator: {$data['requestId']}\n";
    return $mail;
}

function deliver(array $data, array $config): void
{
    buildMail($data, $config)->send();
}

// A single bounded state file contains only HMAC identifiers and timestamps,
// never names, email addresses, raw IPs, tokens or message contents.
function handle(array $server, string $body, array $config, ?callable $verify = null, ?callable $send = null): array
{
    validateConfig($config);
    $data = validateRequest($server, $body, $config);
    $ip = visitorIp($server, $config);
    $directory = $config['storage_path'];
    if (!is_dir($directory) && !@mkdir($directory, 0700, true)) throw new HttpError(503, 'Formularz jest chwilowo niedostępny.');
    $file = @fopen($directory . '/state.json', 'c+');
    if ($file === false) throw new HttpError(503, 'Formularz jest chwilowo niedostępny.');
    if (!flock($file, LOCK_EX | LOCK_NB)) { fclose($file); throw new HttpError(429, 'Formularz jest zajęty. Spróbuj ponownie za chwilę.'); }
    try {
        $raw = stream_get_contents($file);
        $state = $raw === '' ? ['buckets' => [], 'receipts' => []] : json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($state['buckets'] ?? null) || !is_array($state['receipts'] ?? null)) throw new \RuntimeException('Invalid state');
        $now = time();
        $state['buckets'] = array_filter($state['buckets'], fn($bucket) => $bucket['until'] > $now);
        $state['receipts'] = array_filter($state['receipts'], fn($receipt) => $receipt['until'] > $now);
        $hash = fn(string $value) => hash_hmac('sha256', $value, $config['rate_secret']);
        $requestKey = $hash('request:' . $data['requestId']);
        $payload = $hash(json_encode(array_intersect_key($data, array_flip(['name', 'company', 'email', 'phone'])), JSON_UNESCAPED_UNICODE));
        $previous = $state['receipts'][$requestKey] ?? null;
        if ($previous) {
            if ($previous['payload'] !== $payload) throw new HttpError(409, 'To zgłoszenie ma już przypisane inne dane. Odśwież stronę.');
            if ($previous['status'] === 'sent') return ['ok' => true, 'requestId' => $data['requestId']];
            throw new HttpError(409, 'Nie można potwierdzić poprzedniej wysyłki. Skontaktuj się z nami e-mailem, aby uniknąć duplikatu.');
        }
        $save = function () use ($file, &$state): void {
            $json = json_encode($state, JSON_THROW_ON_ERROR);
            rewind($file);
            if (!ftruncate($file, 0) || fwrite($file, $json) !== strlen($json) || !fflush($file)) throw new \RuntimeException('State write failed');
        };
        foreach ([$hash('ip:' . $ip) => 5, 'global' => 100] as $key => $limit) {
            $bucket = $state['buckets'][$key] ?? ['count' => 0, 'until' => $now + 900];
            if ($bucket['count'] >= $limit) throw new HttpError(429, 'Zbyt wiele zgłoszeń. Spróbuj ponownie za 15 minut lub napisz e-mail.');
            $bucket['count']++;
            $state['buckets'][$key] = $bucket;
        }
        $save();
        if (!(($verify ?? __NAMESPACE__ . '\\verifyTurnstile')($data['token'], $config))) throw new HttpError(422, 'Weryfikacja antyspamowa wygasła lub nie powiodła się. Spróbuj ponownie.');
        $state['receipts'][$requestKey] = ['payload' => $payload, 'until' => $now + 86400, 'status' => 'pending'];
        $save();
        try {
            ($send ?? __NAMESPACE__ . '\\deliver')($data, $config);
        } catch (\Throwable) {
            // Delivery can be ambiguous after an SMTP timeout. Do not resend automatically.
            throw new HttpError(502, 'Nie udało się potwierdzić wysyłki. Skontaktuj się z nami e-mailem.');
        }
        $state['receipts'][$requestKey]['status'] = 'sent';
        $save();
        return ['ok' => true, 'requestId' => $data['requestId']];
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}
