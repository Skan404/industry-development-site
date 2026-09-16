import fs from 'node:fs/promises';
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="light" cx=".8" cy=".1" r=".9"><stop stop-color="#234736"/><stop offset="1" stop-color="#0a100e"/></radialGradient></defs>
<rect width="1200" height="630" fill="url(#light)"/>
<rect x="36" y="36" width="1128" height="558" rx="24" fill="none" stroke="#b7edcc" stroke-opacity=".2"/>
<g transform="translate(80 70) scale(1.15)"><rect width="64" height="64" rx="12" fill="#0b0d10"/><path d="M18 17h10v30H18zM34 17h6.5C49.8 17 55 22.6 55 32s-5.2 15-14.5 15H34V37h6.4c3 0 4.6-1.8 4.6-5s-1.6-5-4.6-5H34V17z" fill="#f6f6f2"/><circle cx="54" cy="11" r="5" fill="#a2eccb"/></g>
<g font-family="Arial, sans-serif"><text x="178" y="107" font-size="25" fill="#f4f5ee">industry development.</text>
<text x="80" y="273" font-size="73" font-weight="700" fill="#f4f5ee">Twoja firma.</text>
<text x="80" y="363" font-size="73" font-weight="700" fill="#a2eccb">Jej nowa strona.</text>
<text x="84" y="432" font-size="27" fill="#b7c5bc">Strony internetowe dla firm · Płońsk i cała Polska</text>
<text x="84" y="538" font-size="23" fill="#a2eccb">www.inddev.pl</text>
<text x="825" y="538" font-size="23" fill="#b7c5bc">Projekt. Wdrożenie. Opieka.</text></g></svg>`;
await fs.mkdir('public/og', { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile('public/og/inddev.png');
console.log('Generated public/og/inddev.png (1200 × 630).');
