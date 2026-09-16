<?php
declare(strict_types=1);

// Copy to config.php inside inddev-private, never into public_html.
// No credentials belong in Git, PUBLIC_* variables or a public directory.
return [
    'enabled' => false,
    'origin' => 'https://www.inddev.pl',
    'turnstile_secret' => '',
    'turnstile_hostname' => 'www.inddev.pl',
    'turnstile_action' => 'contact',
    'rate_secret' => '', // Generate: php -r "echo bin2hex(random_bytes(32));"
    'storage_path' => __DIR__ . '/storage',
    // Use REMOTE_ADDR by default. Add verified proxy CIDRs only if Hostido
    // does not already restore visitor IPs. Never trust arbitrary headers.
    'trusted_proxy_cidrs' => [],
    'recipient' => 'kontakt@inddev.pl',
    'smtp' => [
        'host' => '', // Exact hostname from the Hostido panel.
        'port' => 465,
        'encryption' => 'smtps', // smtps:465 or starttls:587, no plaintext.
        'username' => '',
        'password' => '',
        'from' => '', // Actual authenticated Hostido mailbox.
        'from_name' => 'IndDev — formularz',
    ],
];
