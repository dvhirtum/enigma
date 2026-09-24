// Renders assets/icon.svg and assets/icon-small.svg into assets/icon.ico and assets/icon.png.
// Run with `npm run icon` after changing either SVG.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const assets = path.resolve(import.meta.dirname, '../assets');
/** @param {string} name */
const svg = (name) => readFileSync(path.join(assets, name), 'utf8');
const large = svg('icon.svg');
const small = svg('icon-small.svg');

const sizes = [
  { size: 16, source: small },
  { size: 24, source: small },
  { size: 32, source: small },
  { size: 48, source: large },
  { size: 64, source: large },
  { size: 128, source: large },
  { size: 256, source: large },
];

const browser = await chromium.launch();
const page = await browser.newPage();
const images = [];
for (const { size, source } of sizes) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  images.push({ size, png: await page.screenshot({ omitBackground: true }) });
}
await browser.close();

const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach(({ size, png }, i) => {
  const entry = 6 + 16 * i;
  header.writeUInt8(size % 256, entry);
  header.writeUInt8(size % 256, entry + 1);
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});

writeFileSync(path.join(assets, 'icon.ico'), Buffer.concat([header, ...images.map((image) => image.png)]));
writeFileSync(path.join(assets, 'icon.png'), images.at(-1).png);
