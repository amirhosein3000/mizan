// Photo -> vision model -> fuzzy match against the catalog -> candidates + confidence.
import { readProductsFromImage, itemToQuery } from "@/lib/ai/vision";
import { findMatches } from "@/lib/catalog/match";
import { matchConfidence } from "@/lib/match";
import { fail, handle, isImageDataUrl, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";

export const POST = handle(async (req: Request) => {
  const off = featureOff("identify");
  if (off) return off;
  const body = await readJson<{ image?: string; hints?: string[] }>(req);
  if (!isImageDataUrl(body?.image)) return fail(400, "bad_image", "عکس نامعتبره یا خیلی بزرگه.");

  const items = await readProductsFromImage(body.image, { max: 1, hints: body.hints, withPrices: true });
  const item = items[0];
  if (!item) return Response.json({ reading: null, candidates: [], confidence: "low" });
  const query = itemToQuery(item);
  const matches = findMatches(query, 3);
  return Response.json({
    reading: { ...item, query },
    candidates: matches.map((m) => ({ product: m.product, score: m.score, summary: m.product.price })),
    confidence: matchConfidence(matches),
  });
});
