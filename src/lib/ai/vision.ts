// Photo -> structured product readings. Used by single-product identify and
// by the Price X-ray (many products + their shelf prices in one photo).
import "server-only";
import { getLLM, parseJsonReply } from "@/lib/llm";
import { getPriceProvider, summarizeOffers, type Product } from "@/lib/price";
import { roundNice } from "@/lib/format";

export interface VisionItem {
  brand: string;
  model: string;
  /** Other visible text (Persian or English). */
  text: string;
  category: string;
  /** In-store price on a visible tag, in Toman. */
  price: number | null;
  /** [x, y, w, h], normalized 0..1. */
  bbox: [number, number, number, number] | null;
}

const PROMPT = `You are the vision system of a shopping assistant used inside Iranian stores.
List every distinct retail product you can identify in the photo (at most {max}), largest/most central first.
For each product return:
- "brand": brand in English (e.g. "Samsung", "Golestan"), "" if unknown
- "model": model name/number exactly as printed in English (e.g. "Galaxy A56 5G 256GB"), "" if unknown
- "text": other visible text that helps identify it (Persian or English, short)
- "category": one of "mobile", "laptop", "appliance", "grocery", "other"
- "price": the in-store price shown on a tag/label for THAT product, as an integer in Toman. If the tag says ریال (Rial), divide by 10. Persian digits allowed in the image, but return Latin digits. null if no price is visible.
- "bbox": [x, y, width, height] of the product in the image, each normalized 0..1
Return ONLY JSON: {"items": [...]}. If nothing is recognizable, return {"items": []}.`;

function clamp01(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

function sanitize(raw: unknown): VisionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const bbox = Array.isArray(r.bbox) && r.bbox.length === 4 ? (r.bbox.map(clamp01) as VisionItem["bbox"]) : null;
  const price = r.price == null ? null : Number(String(r.price).replace(/[^\d.]/g, ""));
  const item: VisionItem = {
    brand: String(r.brand ?? "").trim(),
    model: String(r.model ?? "").trim(),
    text: String(r.text ?? "").trim(),
    category: String(r.category ?? "other"),
    price: price && Number.isFinite(price) && price > 0 ? Math.round(price) : null,
    bbox,
  };
  return item.brand || item.model || item.text ? item : null;
}

export async function readProductsFromImage(
  imageDataUrl: string,
  opts: { max?: number; hints?: string[]; withPrices?: boolean } = {},
): Promise<VisionItem[]> {
  const max = opts.max ?? 6;
  const llm = getLLM();
  if (llm.mode === "mock") return mockRead(imageDataUrl, max, opts.hints, opts.withPrices);

  const reply = await llm.chat(
    [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT.replace("{max}", String(max)) },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    { vision: true, json: true, temperature: 0.1, maxTokens: 1200 },
  );
  const parsed = parseJsonReply<{ items?: unknown[] }>(reply);
  return (parsed.items ?? []).map(sanitize).filter((x): x is VisionItem => !!x).slice(0, max);
}

export function itemToQuery(item: VisionItem): string {
  return [item.brand, item.model, item.text].filter(Boolean).join(" ");
}

// ---------------- MOCK ----------------
// Deterministic per image, so the same photo always gives the same result.

function hashString(s: string): number {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(s.length / 4000));
  for (let i = 0; i < s.length; i += step) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Store-price multipliers vs. the online median, so X-ray badges show a mix of colours. */
const MOCK_PRICE_FACTORS = [0.96, 1.07, 1.21, 0.99, 1.14, 1.03];

async function mockRead(image: string, max: number, hints?: string[], withPrices = true): Promise<VisionItem[]> {
  const provider = getPriceProvider();
  const h = hashString(image);
  let products: Product[] = [];
  // Hints are "productId" or "productId@storePrice" (the demo shelf draws those prices).
  const hintPrices = new Map<string, number>();
  if (hints?.length) {
    for (const hint of hints) {
      const [id, price] = hint.split("@");
      const p = await provider.getProduct(id);
      if (!p) continue;
      products.push(p);
      if (Number(price) > 0) hintPrices.set(p.id, Number(price));
    }
  } else {
    const featured = await provider.listFeatured(40);
    // Pick a "shelf" of one category so the scene is believable.
    const cats = ["mobile", "grocery", "appliance", "laptop"] as const;
    const cat = cats[h % cats.length];
    const pool = featured.filter((p) => p.category === cat);
    const n = max === 1 ? 1 : Math.min(pool.length, 4);
    for (let i = 0; i < n; i++) products.push(pool[(h + i) % pool.length]);
    products = [...new Map(products.map((p) => [p.id, p])).values()];
  }
  products = products.slice(0, max);

  // Same 2-column grid as the demo shelf drawing (src/lib/demo-shelf.ts).
  const cols = Math.min(products.length, 2);
  const rows = Math.ceil(products.length / cols);
  const items: VisionItem[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const summary = summarizeOffers(await provider.getOffers(p.id));
    const factor = MOCK_PRICE_FACTORS[(i + h) % MOCK_PRICE_FACTORS.length];
    const col = i % cols;
    const row = Math.floor(i / cols);
    // When the photo shows one product, sometimes "read" the label only partially
    // so the candidate picker gets exercised.
    const partial = max === 1 && !hints?.length && h % 3 === 0;
    const price = hintPrices.get(p.id) ?? (summary ? roundNice(summary.median * factor) : null);
    items.push({
      brand: p.brand,
      model: partial ? p.model.split(" ").slice(0, 2).join(" ") : p.model,
      text: p.subcategory,
      category: p.category,
      price: withPrices ? price : null,
      bbox: [(col + 0.12) / cols, (row + 0.1) / rows, 0.76 / cols, 0.56 / rows],
    });
  }
  // Simulate model latency a little, so loading states are visible in demos.
  await new Promise((r) => setTimeout(r, 600));
  return items;
}
