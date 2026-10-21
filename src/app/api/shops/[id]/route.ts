// A shop: details, opening status, what it lists (with confirmations) and neighbours in the same passage.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { confirmationsForShop } from "@/lib/agent/confirmations";
import { contextFromRequest, fail, handle } from "@/lib/http";
import { distanceM } from "@/lib/shop/geo";
import { openStatus } from "@/lib/shop/hours";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await connection();
  const { id } = await ctx.params;
  const catalog = getCatalog();
  const shop = catalog.getShop(decodeURIComponent(id));
  if (!shop) return fail(404, "not_found", "این فروشگاه پیدا نشد.");
  const q = new URL(req.url).searchParams.get("q")?.trim() || undefined;
  const shopper = contextFromRequest(req);
  const at = shopper.visitAt ?? Date.now();
  const conf = confirmationsForShop(shop.id);
  const offers = catalog.shopOffers(shop.id, q, 40).map((x) => ({ ...x, confirmation: conf.get(x.product.id) ?? null }));
  const neighbours = catalog
    .shopsNear(shop, 120, { limit: 40 })
    .filter((s) => s.id !== shop.id && s.offerCount > 0)
    .slice(0, 8)
    .map((s) => ({ shop: s, distanceM: distanceM(shop, s), status: openStatus(s.hours, at) }));
  return Response.json({
    shop,
    status: openStatus(shop.hours, at),
    distanceM: shopper.origin ? distanceM(shopper.origin, shop) : null,
    offers,
    neighbours,
  });
});
