// Step 1 — find and compare products: catalog search + facets + where-to-buy stats
// under the shopper's context (distance, open now, installment…).
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { withShopStats } from "@/lib/agent/shops-service";
import { contextFromRequest, fail, handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  await connection();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return fail(400, "query_too_short", "حداقل دو حرف بنویس.");
  const num = (k: string) => Number(url.searchParams.get(k)) || null;
  const ctx = contextFromRequest(req);
  const result = getCatalog().search(
    q,
    {
      category: url.searchParams.get("category"),
      brand: url.searchParams.get("brand"),
      priceMin: num("min"),
      priceMax: num("pmax") ?? ctx.budgetMax,
    },
    Math.min(40, num("limit") ?? 24),
  );
  return Response.json({
    query: q,
    total: result.total,
    facets: result.facets,
    priceBands: result.priceBands,
    results: withShopStats(result.products, ctx),
  });
});
