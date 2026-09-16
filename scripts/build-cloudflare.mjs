import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Public build settings only. TURNSTILE_SECRET belongs in Worker secrets.
const env = { ...process.env, PUBLIC_FORM_ENABLED: 'true', PUBLIC_CONTACT_ENDPOINT: '/api/contact', PUBLIC_TURNSTILE_SITE_KEY: '0x4AAAAAAE4ruoH8tFufjT5j' };
for (const args of [['node_modules/astro/bin/astro.mjs', 'check'], ['node_modules/astro/bin/astro.mjs', 'build'], ['scripts/check-release.mjs', '--production']]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
async function files(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file)); else result.push(file);
  }
  return result;
}
const hashes = new Set();
for (const file of await files('dist')) {
  if (/\.(php|env|ini|log)$/.test(file)) throw new Error(`Unexpected public file: ${file}`);
  if (!file.endsWith('.html')) continue;
  const html = await fs.readFile(file, 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\bsrc=/.test(match[1]) && match[2]) hashes.add(`'sha256-${crypto.createHash('sha256').update(match[2]).digest('base64')}'`);
  }
}
const csp = `default-src 'self'; script-src 'self' https://challenges.cloudflare.com ${[...hashes].join(' ')}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
const headers = `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${csp}\n  Cache-Control: public, max-age=0, must-revalidate\n\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n`;
if (headers.split('\n').some(line => line.length > 2000)) throw new Error('Cloudflare header line exceeds 2000 characters');
await fs.writeFile('dist/_headers', headers);
await fs.writeFile('dist/_redirects', '/oferta /uslugi 301\n/o-studiu /#wspolpraca 301\n');
console.log('Cloudflare build ready. Configure TURNSTILE_SECRET before using the contact form.');
