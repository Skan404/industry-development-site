import fs from 'node:fs/promises';
import path from 'node:path';
import site from '../config/site.json' with { type: 'json' };

try { process.loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const production = process.argv.includes('--production');
const errors = [];
const blockers = [];
const check = (condition, text) => { if (!condition) errors.push(text); };
const pages = ['index.html', 'uslugi/index.html', 'kontakt/index.html', 'realizacje/index.html', 'polityka-prywatnosci/index.html', 'regulamin/index.html', '404.html'];
for (const page of pages) {
  const html = await fs.readFile(path.join('dist', page), 'utf8');
  check(/<title>[^<]+<\/title>/.test(html), `${page}: missing title`);
  check(/name="description" content="[^"]+"/.test(html), `${page}: missing description`);
  check(html.includes('https://www.inddev.pl'), `${page}: incorrect canonical origin`);
  check(!/https?:\/\/(?:example\.com|localhost|127\.0\.0\.1)/.test(html), `${page}: local or placeholder origin`);
  check(!/\{(?:NIP|EMAIL|TELEFON|IMIE_I_NAZWISKO|ADRES_FIRMY|DATA_AKTUALIZACJI)\}/.test(html), `${page}: placeholder`);
  check((html.match(/<h1\b/g) || []).length === 1, `${page}: expected one h1`);
  check(html.includes('property="og:image"'), `${page}: missing OG image`);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  const expectedPath = page === 'index.html' ? '/' : page === '404.html' ? '/404' : `/${page.replace(/\/index\.html$/, '')}`;
  check(canonical?.[1] === `${site.origin}${expectedPath}`, `${page}: incorrect canonical URL`);
  for (const image of html.matchAll(/<img\b[^>]*>/g)) {
    check(/\balt="[^"]*"/.test(image[0]), `${page}: image missing alt attribute`);
  }
  let previousHeading = 0;
  for (const heading of html.matchAll(/<h([1-6])\b/g)) {
    const level = Number(heading[1]);
    check(level <= previousHeading + 1, `${page}: skipped heading level h${level}`);
    previousHeading = level;
  }
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    if (match[1].startsWith('/api/')) continue;
    const local = path.join('dist', decodeURIComponent(match[1]));
    let exists = false;
    for (const candidate of [local, path.join(local, 'index.html')]) {
      try { if ((await fs.stat(candidate)).isFile()) exists = true; } catch { /* checked below */ }
    }
    check(exists, `${page}: missing internal target ${match[1]}`);
  }
}
const sitemap = await fs.readFile('dist/sitemap.xml', 'utf8');
const portfolio = await fs.readFile('src/data/projects.ts', 'utf8');
if (/projects:\s*Project\[\]\s*=\s*\[\s*\]/.test(portfolio)) {
  check(!sitemap.includes('/realizacje'), 'Empty portfolio must not be in sitemap');
  check((await fs.readFile('dist/realizacje/index.html', 'utf8')).includes('noindex'), 'Empty portfolio must be noindex');
}
check(sitemap.includes('https://www.inddev.pl/uslugi'), 'Sitemap origin incorrect');
check((await fs.stat('public/og/inddev.png')).size < 200_000, 'OG image must stay below 200 KB');
const contact = await fs.readFile('dist/kontakt/index.html', 'utf8');
check(!contact.includes('analytics-consent'), 'Unused analytics must be removed');
if (!site.legalIdentityConfirmed) blockers.push('Confirm formal service provider / data controller in config/site.json');
if (!site.contactEmailConfirmed) blockers.push('Confirm contact mailbox in config/site.json');
if (process.env.PUBLIC_FORM_ENABLED !== 'true') blockers.push('Configure backend, then build with PUBLIC_FORM_ENABLED=true');
const key = process.env.PUBLIC_TURNSTILE_SITE_KEY || '';
if (!key || /000000000000000000/.test(key)) blockers.push('Set a real production Turnstile sitekey (not test key)');
if (production) {
  check(contact.includes('data-endpoint="/api/contact.php"'), 'Built frontend does not target the production endpoint');
  check(contact.includes('data-sitekey=') && contact.includes(key), 'Built frontend does not contain the configured Turnstile key');
  errors.push(...blockers);
}
errors.forEach(error => console.error(`FAIL: ${error}`));
if (errors.length) process.exit(1);
console.log('Static release checks passed: metadata, links, sitemap, privacy routes and OG image.');
if (!production) blockers.forEach(blocker => console.log(`DEPLOYMENT TODO: ${blocker}`));
