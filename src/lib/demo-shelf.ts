"use client";
// Draws a fake store shelf (product boxes + price tags) on a canvas. Used by
// the X-ray "sample photo" button so the hero moment can be demoed anywhere —
// no camera, no real shelf. With a real vision model the drawn text is legible,
// so the model actually reads names and prices off it.
import { formatNumber, roundNice } from "./format";
import type { PriceSummary, Product } from "./catalog/types";

export interface ShelfItem {
  product: Product;
  summary: PriceSummary;
}

/** Store-price multipliers vs. online median: a mix of green / yellow / red. */
const FACTORS = [0.95, 1.07, 1.22, 1.0];

const BOX_COLORS = ["#1f3b73", "#0f766e", "#7c2d12", "#3f3f46", "#6d28d9", "#b45309"];

export function drawDemoShelf(items: ShelfItem[]): { dataUrl: string; hints: string[] } {
  const W = 1200;
  const H = 900;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily;

  // Wall + shelves
  const wall = ctx.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, "#efe7da");
  wall.addColorStop(1, "#d9cdb8");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, H);

  const cols = 2;
  const rows = Math.ceil(items.length / cols);
  const cellW = W / cols;
  const cellH = H / rows;
  const hints: string[] = [];

  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = "#8b6b4a";
    ctx.fillRect(0, (r + 1) * cellH - 28, W, 28);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(0, (r + 1) * cellH, W, 6);
  }

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellW + cellW * 0.12;
    const y = row * cellH + cellH * 0.1;
    const w = cellW * 0.76;
    const h = cellH * 0.56;
    const price = roundNice(item.summary.median * FACTORS[i % FACTORS.length]);
    hints.push(`${item.product.id}@${price}`);

    // Product box
    ctx.fillStyle = BOX_COLORS[i % BOX_COLORS.length];
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x, y + h * 0.62, w, h * 0.38);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.font = `800 38px ${font}`;
    ctx.fillText(item.product.brand ?? "", x + w / 2, y + 60);
    // Up to two lines of the title, shrunk until each fits the box.
    const words = item.product.title.split("|")[0].trim().split(/\s+/).slice(0, 8);
    const half = Math.ceil(words.length / 2);
    [words.slice(0, half).join(" "), words.slice(half).join(" ")].forEach((line, li) => {
      let size = 30;
      do {
        ctx.font = `700 ${size}px ${font}`;
        size -= 2;
      } while (ctx.measureText(line).width > w - 36 && size > 14);
      ctx.fillText(line, x + w / 2, y + 104 + li * 38);
    });
    ctx.font = `500 22px ${font}`;
    ctx.fillText(item.product.category, x + w / 2, y + h - 26);

    // Price tag
    const tw = 300;
    const th = 82;
    const tx = x + w / 2 - tw / 2;
    const ty = row * cellH + cellH - 28 - th - 8;
    ctx.fillStyle = "#fffef5";
    ctx.strokeStyle = "#e0393e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.direction = "rtl";
    ctx.font = `900 38px ${font}`;
    ctx.fillText(`${formatNumber(price)} تومان`, x + w / 2, ty + 54);
  });

  return { dataUrl: c.toDataURL("image/jpeg", 0.85), hints };
}
