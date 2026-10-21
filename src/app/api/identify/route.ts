// Photo -> vision model -> fuzzy match against the catalog -> candidates + confidence.
import { readProductsFromImage, itemToQuery } from "@/lib/ai/vision";
import { getPriceProvider } from "@/lib/price";
import { matchConfidence } from "@/lib/match";
import { fail, handle, isImageDataUrl, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";
import { withSummaries } from "@/lib/product-service";

export const POST = handle(async (req: Request) => {
  const off = featureOff("identify");
  if (off) return off;
  const body = await readJson<{ image?: string; hints?: string[] }>(req);
  if (!isImageDataUrl(body?.image)) return fail(400, "bad_image", "عکس نامعتبره یا خیلی بزرگه.");

  const items = await readProductsFromImage(body.image, { max: 1, hints: body.hints, withPrices: true });
  const item = items[0];
  if (!item) {
    return Response.json({ reading: null, candidates: [], confidence: "low" });
  }
  const query = itemToQuery(item);
  const matches = await getPriceProvider().searchProducts(query, { limit: 3 });
  return Response.json({
    reading: { ...item, query },
    candidates: await withSummaries(matches),
    confidence: matchConfidence(matches),
  });
});
