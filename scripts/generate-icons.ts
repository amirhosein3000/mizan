/**
 * Generates the PWA icons from an original SVG (no fonts, pure shapes):
 * a white price tag with green/yellow/red verdict dots on a violet gradient.
 *
 *   npm run icons
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

function svg(size: number, { maskable = false } = {}): string {
  // Maskable icons need the art inside the central 80% safe zone.
  const pad = maskable ? size * 0.18 : size * 0.1;
  const s = size - pad * 2;
  const r = maskable ? 0 : size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2e2378"/>
      <stop offset="0.55" stop-color="#5b47e0"/>
      <stop offset="1" stop-color="#8a5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="url(#g)"/>
  <g transform="translate(${pad} ${pad}) rotate(-12 ${s / 2} ${s / 2})">
    <path d="M ${s * 0.3} ${s * 0.16}
             L ${s * 0.86} ${s * 0.16}
             Q ${s * 0.92} ${s * 0.16} ${s * 0.92} ${s * 0.22}
             L ${s * 0.92} ${s * 0.78}
             Q ${s * 0.92} ${s * 0.84} ${s * 0.86} ${s * 0.84}
             L ${s * 0.3} ${s * 0.84}
             L ${s * 0.08} ${s * 0.5} Z"
          fill="#ffffff"/>
    <circle cx="${s * 0.27}" cy="${s * 0.5}" r="${s * 0.055}" fill="#5b47e0"/>
    <circle cx="${s * 0.47}" cy="${s * 0.5}" r="${s * 0.075}" fill="#11994a"/>
    <circle cx="${s * 0.64}" cy="${s * 0.5}" r="${s * 0.075}" fill="#f2b400"/>
    <circle cx="${s * 0.81}" cy="${s * 0.5}" r="${s * 0.075}" fill="#e0393e"/>
  </g>
</svg>`;
}

async function main() {
  const dir = join(process.cwd(), "public", "icons");
  mkdirSync(dir, { recursive: true });
  const jobs: [string, number, boolean][] = [
    ["icon-192.png", 192, false],
    ["icon-512.png", 512, false],
    ["maskable-512.png", 512, true],
    ["apple-touch-icon.png", 180, true],
  ];
  for (const [name, size, maskable] of jobs) {
    await sharp(Buffer.from(svg(size, { maskable }))).png().toFile(join(dir, name));
  }
  writeFileSync(join(dir, "icon.svg"), svg(512));
  console.log("icons written to", dir);
}

main();
