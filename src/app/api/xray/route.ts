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
  const hinted = new Map((body.hints ?? []).map((h, i) => [i, h.split("@")[0]]));

  const results = items.map((item, i) => {
    // Demo-shelf hints name the exact product; otherwise match the reading.
    const hintId = hinted.get(i);
    const match = hintId ? findMatches(itemToQuery(item), 5).find((m) => m.product.id === hintId) ?? findMatches(itemToQuery(item), 1)[0] : findMatches(itemToQuery(item), 1)[0];
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
