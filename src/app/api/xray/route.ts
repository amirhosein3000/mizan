// Price X-ray: one photo of a shelf/counter -> every recognised product with a verdict badge.
import { readProductsFromImage, itemToQuery } from "@/lib/ai/vision";
import { getPriceProvider, summarizeOffers } from "@/lib/price";
import { computeVerdict } from "@/lib/verdict";
import { fail, handle, isImageDataUrl, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";

export const POST = handle(async (req: Request) => {
  const off = featureOff("xray");
  if (off) return off;
  const body = await readJson<{ image?: string; hints?: string[] }>(req);
  if (!isImageDataUrl(body?.image)) return fail(400, "bad_image", "عکس نامعتبره یا خیلی بزرگه.");

  const provider = getPriceProvider();
  const started = Date.now();
  const items = await readProductsFromImage(body.image, { max: 6, hints: body.hints, withPrices: true });

  const results = await Promise.all(
    items.map(async (item, i) => {
      const [match] = await provider.searchProducts(itemToQuery(item), { limit: 1 });
      if (!match || match.score < 0.45) {
        return { key: `x${i}`, bbox: item.bbox, label: itemToQuery(item), storePrice: item.price, match: null };
      }
      const summary = summarizeOffers(await provider.getOffers(match.product.id));
      const verdict =
        summary && item.price ? computeVerdict(item.price, summary, { printedPrice: match.product.printedPrice }) : null;
      return {
        key: `x${i}`,
        bbox: item.bbox,
        label: itemToQuery(item),
        storePrice: item.price,
        match: { product: match.product, score: match.score, summary, verdict },
      };
    }),
  );
  return Response.json({ items: results, ms: Date.now() - started });
});
