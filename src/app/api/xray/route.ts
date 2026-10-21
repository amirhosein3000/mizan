// Price X-ray: one photo of a shelf/counter -> every recognised product with a verdict badge
// against the prices other Tehran shops listed.
import { readProductsFromImage, itemToQuery } from "@/lib/ai/vision";
import { findMatches } from "@/lib/catalog/match";
import { computeVerdict } from "@/lib/verdict";
import { fail, handle, isImageDataUrl, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";

export const POST = handle(async (req: Request) => {
  const off = featureOff("xray");
  if (off) return off;
  const body = await readJson<{ image?: string; hints?: string[] }>(req);
  if (!isImageDataUrl(body?.image)) return fail(400, "bad_image", "عکس نامعتبره یا خیلی بزرگه.");

  const started = Date.now();
  const items = await readProductsFromImage(body.image, { max: 6, hints: body.hints, withPrices: true });
  // Demo-shelf hints («id@price») name the exact products and the prices printed on their tags.
  // The model may list items in any order or misread a tag, so pair each reading with the
  // best-matching unused hinted product and trust the hinted price.
  const hinted = new Map((body.hints ?? []).map((h) => {
    const [id, price] = h.split("@");
    return [id, Number(price) || null] as const;
  }));
  const used = new Set<string>();

  const results = items.map((item, i) => {
    const candidates = findMatches(itemToQuery(item), hinted.size ? 20 : 1);
    let match = candidates[0];
    if (hinted.size) {
      const hit = candidates.find((c) => hinted.has(c.product.id) && !used.has(c.product.id));
      if (hit) {
        used.add(hit.product.id);
        match = { ...hit, score: Math.max(hit.score, 0.45) };
        item = { ...item, price: hinted.get(hit.product.id) ?? item.price };
      }
    }
    if (!match || match.score < 0.45) {
      return { key: `x${i}`, bbox: item.bbox, label: itemToQuery(item), storePrice: item.price, match: null };
    }
    const summary = match.product.price;
    const verdict = summary && item.price ? computeVerdict(item.price, summary) : null;
    return {
      key: `x${i}`,
      bbox: item.bbox,
      label: itemToQuery(item),
      storePrice: item.price,
      match: { product: match.product, score: match.score, summary, verdict },
    };
  });
  return Response.json({ items: results, ms: Date.now() - started });
});
