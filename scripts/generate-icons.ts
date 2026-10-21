/**
 * Generates the PWA icons from an original SVG (no fonts, pure shapes):
 * a white balance scale (ترازو) with a green and a red pan and a yellow pivot, on a violet gradient.
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
  <g transform="translate(${pad} ${pad})" fill="none" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="${s * 0.045}">
    <!-- post, base and beam -->
    <path d="M ${s * 0.5} ${s * 0.2} L ${s * 0.5} ${s * 0.82}"/>
    <path d="M ${s * 0.32} ${s * 0.84} L ${s * 0.68} ${s * 0.84}"/>
    <path d="M ${s * 0.14} ${s * 0.3} L ${s * 0.86} ${s * 0.26}"/>
    <!-- pan strings -->
    <path d="M ${s * 0.14} ${s * 0.3} L ${s * 0.05} ${s * 0.56} M ${s * 0.14} ${s * 0.3} L ${s * 0.23} ${s * 0.56}" stroke-width="${s * 0.025}"/>
    <path d="M ${s * 0.86} ${s * 0.26} L ${s * 0.77} ${s * 0.52} M ${s * 0.86} ${s * 0.26} L ${s * 0.95} ${s * 0.52}" stroke-width="${s * 0.025}"/>
  </g>
  <g transform="translate(${pad} ${pad})">
    <!-- pans: green (good deal) and red (overpriced), yellow pivot -->
    <path d="M ${s * 0.02} ${s * 0.56} L ${s * 0.26} ${s * 0.56} A ${s * 0.12} ${s * 0.1} 0 0 1 ${s * 0.02} ${s * 0.56} Z" fill="#11994a"/>
    <path d="M ${s * 0.74} ${s * 0.52} L ${s * 0.98} ${s * 0.52} A ${s * 0.12} ${s * 0.1} 0 0 1 ${s * 0.74} ${s * 0.52} Z" fill="#e0393e"/>
    <circle cx="${s * 0.5}" cy="${s * 0.2}" r="${s * 0.065}" fill="#f2b400"/>
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
