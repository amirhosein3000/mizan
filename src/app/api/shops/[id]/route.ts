// A shop: details, opening status, what it lists (with confirmations) and neighbours in the same passage.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { confirmationsForShop } from "@/lib/agent/confirmations";
import { shopsForProduct } from "@/lib/agent/shops-service";
import { contextFromRequest, fail, handle } from "@/lib/http";
import { distanceM } from "@/lib/shop/geo";
import { openStatus } from "@/lib/shop/hours";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await connection();
  const { id } = await ctx.params;
  const catalog = getCatalog();
  const shop = catalog.getShop(decodeURIComponent(id));
  if (!shop) return fail(404, "not_found", "این فروشگاه پیدا نشد.");
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim() || undefined;
  const shopper = contextFromRequest(req);
  const at = shopper.visitAt ?? Date.now();
  const conf = confirmationsForShop(shop.id);
  const offers = catalog.shopOffers(shop.id, q, 40).map((x) => ({ ...x, confirmation: conf.get(x.product.id) ?? null }));
  const neighbours = catalog
    .shopsNear(shop, 120, { limit: 40 })
    .filter((s) => s.id !== shop.id && s.offerCount > 0)
    .slice(0, 8)
    .map((s) => ({ shop: s, distanceM: distanceM(shop, s), status: openStatus(s.hours, at) }));
  const status = openStatus(shop.hours, at);

  // Plan B: opened for a product and this shop is closed -> nearest shops that list it and are open.
  const focus = params.get("p");
  const product = focus && status.state === "closed" ? catalog.getProduct(focus) : null;
  const openInstead = product
    ? shopsForProduct(product.id, product.category, shopper)
        .ranked.shops.filter((x) => x.shop.id !== shop.id && x.status.state === "open")
        .map((x) => ({ shop: x.shop, price: x.price, priceSource: x.priceSource, status: x.status, distanceM: distanceM(shop, x.shop) }))
        .sort((a, b) => a.distanceM - b.distanceM)
        .slice(0, 3)
    : [];

  return Response.json({
    shop,
    status,
    openInstead,
    distanceM: shopper.origin ? distanceM(shopper.origin, shop) : null,
    offers,
    neighbours,
  });
});
