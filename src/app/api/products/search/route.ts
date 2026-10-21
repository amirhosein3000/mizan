import { getPriceProvider } from "@/lib/price";
import { matchConfidence } from "@/lib/match";
import { fail, handle } from "@/lib/http";
import { withSummaries } from "@/lib/product-service";

export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(20, Number(url.searchParams.get("limit") ?? 8) || 8);
  if (q.length < 2) return fail(400, "query_too_short", "حداقل دو حرف بنویس.");
  const matches = await getPriceProvider().searchProducts(q, { limit });
  return Response.json({ results: await withSummaries(matches), confidence: matchConfidence(matches) });
});
