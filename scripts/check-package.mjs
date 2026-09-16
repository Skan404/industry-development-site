import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';

const root = 'release/hostido';
const manifest = JSON.parse(await fs.readFile(`${root}/SHA256.json`, 'utf8'));
const errors = [];
let count = 0;
async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (entry.isDirectory()) { await visit(file); continue; }
    count++;
    const bytes = await fs.readFile(file);
    if (!['SHA256.json', 'STATUS.json'].includes(relative) && manifest[relative] !== crypto.createHash('sha256').update(bytes).digest('hex')) errors.push(`Manifest mismatch: ${relative}`);
    if (/(^|\/)(?:\.git|\.env(?:\..*)?|config\.php|state\.json|node_modules|tests|\.tools)(\/|$)/.test(relative)) errors.push(`Unexpected private/development file: ${relative}`);
    if (/\.(?:html|js|css|php|json|svg|txt)$/.test(relative)) {
      const text = bytes.toString('utf8');
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/.test(text)) errors.push(`Potential secret: ${relative}`);
      if (relative.startsWith('public_html/') && /https?:\/\/(?:localhost|127\.0\.0\.1|example\.com)(?=[:/"'\s])/.test(text)) errors.push(`Test URL in public file: ${relative}`);
    }
  }
}
await visit(root);
for (const file of Object.keys(manifest)) {
  try { await fs.access(path.join(root, file)); } catch { errors.push(`Missing manifest entry: ${file}`); }
}
for (const file of ['public_html/index.html', 'public_html/api/contact.php', 'public_html/.htaccess', 'inddev-private/config.example.php', 'inddev-private/vendor/autoload.php']) {
  try { await fs.access(path.join(root, file)); } catch { errors.push(`Required file missing: ${file}`); }
}
const assets = {};
for (const file of Object.keys(manifest).filter(file => /^public_html\/_astro\/.*\.(js|css)$/.test(file))) {
  const kind = path.extname(file);
  const bytes = await fs.readFile(path.join(root, file));
  assets[kind] ??= { rawBytes: 0, gzipBytes: 0 };
  assets[kind].rawBytes += bytes.length;
  assets[kind].gzipBytes += gzipSync(bytes).length;
}
if (errors.length) { errors.forEach(error => console.error(error)); process.exit(1); }
console.log(`Package verified: ${count} files, SHA256 manifest, required files, sensitive paths and common secret patterns.`);
console.log('Total built JS/CSS asset sizes (all pages, gzip estimate; not runtime performance):', assets);
