import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const portable = path.resolve('.tools/php/php.exe');
const php = process.env.PHP_BINARY || (fs.existsSync(portable) ? portable : 'php');
const args = php === portable ? ['-c', path.resolve('.tools/php/php.ini')] : [];
const files = ['server/src/Contact.php', 'server/public/contact.php', 'server/config.example.php', 'server/check.php', 'server/prune.php', 'server/tests/contact-test.php'];
for (const file of files) {
  const result = spawnSync(php, [...args, '-l', file], { stdio: 'inherit' });
  if (result.error) throw new Error('PHP 8.2+ required. Set PHP_BINARY to the local PHP executable.');
  if (result.status !== 0) process.exit(result.status || 1);
}
const result = spawnSync(php, [...args, 'server/tests/contact-test.php'], { stdio: 'inherit' });
process.exit(result.status || 0);
