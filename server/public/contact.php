<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Allow: POST');

$private = dirname(__DIR__, 2) . '/inddev-private';
try {
    if (!is_file($private . '/config.php') || !is_file($private . '/vendor/autoload.php')) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'message' => 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.']);
        exit;
    }
    require $private . '/vendor/autoload.php';
    require $private . '/src/Contact.php';
    $config = require $private . '/config.php';
    $body = file_get_contents('php://input', false, null, 0, 8193);
    $result = \IndDev\handle($_SERVER, $body === false ? '' : $body, $config);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (\IndDev\HttpError $error) {
    http_response_code($error->status);
    if ($error->status === 429) header('Retry-After: 900');
    echo json_encode(['ok' => false, 'message' => $error->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (\Throwable) {
    http_response_code(503);
    // Do not log SMTP credentials, visitor data or exception messages.
    error_log('IndDev contact: internal failure');
    echo json_encode(['ok' => false, 'message' => 'Formularz jest chwilowo niedostępny. Napisz do nas e-mail.']);
}
