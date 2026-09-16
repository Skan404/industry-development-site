import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const output = path.resolve(root, 'release/hostido');
if (path.dirname(output) !== path.resolve(root, 'release')) throw new Error('Unsafe release path');
await fs.access('dist/index.html');
await fs.access('server/vendor/autoload.php');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.cp('dist', path.join(output, 'public_html'), { recursive: true });
const privateDir = path.join(output, 'inddev-private');
await fs.mkdir(privateDir, { recursive: true });
for (const entry of ['src', 'vendor', 'composer.json', 'composer.lock', 'config.example.php', 'check.php', 'prune.php']) {
  await fs.cp(path.join('server', entry), path.join(privateDir, entry), {
    recursive: true,
    filter: source => !source.split(path.sep).some(part => ['.git', '.github', '.phan', 'test', 'tests', 'examples'].includes(part)),
  });
}
await fs.mkdir(path.join(output, 'public_html/api'), { recursive: true });
await fs.copyFile('server/public/contact.php', path.join(output, 'public_html/api/contact.php'));
await fs.rm(path.join(output, 'public_html/_redirects'), { force: true });
const hashes = new Set();
async function files(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(full)); else result.push(full);
  }
  return result;
}
for (const file of await files('dist')) {
  if (!file.endsWith('.html')) continue;
  const html = await fs.readFile(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(match[1]) && match[2]) hashes.add(`'sha256-${crypto.createHash('sha256').update(match[2]).digest('base64')}'`);
  }
}
const csp = `default-src 'self'; script-src 'self' https://challenges.cloudflare.com ${[...hashes].join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
const rules = await fs.readFile('deploy/hostido.htaccess', 'utf8');
await fs.writeFile(path.join(output, 'public_html/.htaccess'), `${rules}\n<IfModule mod_headers.c>\nHeader always set Content-Security-Policy "${csp}"\n</IfModule>\n`);
await fs.mkdir(path.join(output, 'public_html/_astro'), { recursive: true });
await fs.writeFile(path.join(output, 'public_html/_astro/.htaccess'), '<IfModule mod_headers.c>\nHeader set Cache-Control "public, max-age=31536000, immutable"\n</IfModule>\n');
await fs.writeFile(path.join(privateDir, '.htaccess'), 'Require all denied\n');
await fs.copyFile('docs/HOSTIDO.md', path.join(output, 'PRZECZYTAJ-PRZED-WDROZENIEM.md'));
const manifest = {};
for (const file of await files(output)) {
  manifest[path.relative(output, file).replaceAll('\\', '/')] = crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
}
await fs.writeFile(path.join(output, 'SHA256.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(output, 'STATUS.json'), JSON.stringify({
  type: 'predeployment-candidate', origin: 'https://www.inddev.pl',
  requires: ['Private SMTP and Turnstile configuration', 'Production build with real public key', 'Hostido/Cloudflare checks from README'],
  generatedAt: new Date().toISOString(),
}, null, 2));
console.log(`Prepared ${output}. Private credentials and config.php are deliberately excluded.`);
