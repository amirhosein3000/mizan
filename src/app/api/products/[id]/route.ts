// Step 2 — one product: where to buy it in Tehran, ranked for this shopper,
// plus shops that may have it and comparable alternatives.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { shopStats, shopsForProduct, withShopStats } from "@/lib/agent/shops-service";
import { contextFromRequest, fail, handle } from "@/lib/http";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await connection();
  const { id } = await ctx.params;
  const catalog = getCatalog();
  const product = catalog.getProduct(decodeURIComponent(id));
  if (!product) return fail(404, "not_found", "این کالا پیدا نشد.");
  const shopper = contextFromRequest(req);
  const { ranked, maybe } = shopsForProduct(product.id, product.category, shopper);
  return Response.json({
    product,
    shops: ranked.shops,
    hidden: ranked.hidden,
    maybe,
    stats: shopStats(ranked),
    similar: withShopStats(catalog.similar(product.id, 6), shopper),
    snapshotAt: catalog.stats().snapshotAt,
  });
});
