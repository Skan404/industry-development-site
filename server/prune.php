<?php
declare(strict_types=1);
// Run hourly via Hostido cron; no secrets or visitor data are printed.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$config = require __DIR__ . '/config.php';
$path = $config['storage_path'] . '/state.json';
if (!is_file($path)) exit;
$file = fopen($path, 'r+');
if (!$file || !flock($file, LOCK_EX | LOCK_NB)) exit(1);
try {
    $state = json_decode(stream_get_contents($file), true, 16, JSON_THROW_ON_ERROR);
    foreach (['buckets', 'receipts'] as $group) $state[$group] = array_filter($state[$group], fn($entry) => $entry['until'] > time());
    $json = json_encode($state, JSON_THROW_ON_ERROR);
    rewind($file); ftruncate($file, 0); fwrite($file, $json); fflush($file);
} finally { flock($file, LOCK_UN); fclose($file); }
