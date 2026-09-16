<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/src/Contact.php';
$issues = [];
if (PHP_VERSION_ID < 80200) $issues[] = 'PHP 8.2+ required';
foreach (['curl', 'mbstring', 'openssl'] as $extension) if (!extension_loaded($extension)) $issues[] = "Missing extension: $extension";
if (!is_file(__DIR__ . '/vendor/autoload.php')) $issues[] = 'Missing Composer dependencies';
if (!is_file(__DIR__ . '/config.php')) $issues[] = 'Missing private config.php';
else {
    try {
        $config = require __DIR__ . '/config.php';
        IndDev\validateConfig($config);
        if ($config['origin'] !== 'https://www.inddev.pl' || $config['turnstile_hostname'] !== 'www.inddev.pl') $issues[] = 'Unexpected origin or Turnstile hostname';
        if (str_contains($config['turnstile_secret'], '000000000000000000000')) $issues[] = 'Test Turnstile key is not allowed';
        $storage = $config['storage_path'];
        if (!is_dir($storage)) mkdir($storage, 0700, true);
        if (!is_writable($storage)) $issues[] = 'Storage must be writable';
    } catch (Throwable) { $issues[] = 'Private configuration is incomplete or disabled'; }
}
foreach ($issues as $issue) echo "BLOCKED: $issue\n";
if ($issues) exit(1);
echo "Configuration checks passed. SMTP delivery, TLS, Turnstile and DNS still require a live test.\n";
