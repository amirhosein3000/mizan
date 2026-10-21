// Server-side composition: catalog rows + confirmations + the shopper's context
// -> ranked shops for a product. Used by the product page, search and missions.
import "server-only";
import { getCatalog, type Product } from "../catalog";
import type { ShopperContext } from "../shop/context";
import { distanceM } from "../shop/geo";
import { rankShops, type RankedShop, type RankResult } from "../shop/rank";
import { confirmationsFor } from "./confirmations";
import type { ProductWithStats, ShopStats } from "./types";

export type { ProductWithStats, ShopStats };

export interface ProductShops {
  ranked: RankResult;
  /** Shops that only declare the category (stock unknown) — candidates to call. */
  maybe: RankedShop[];
}

export function shopsForProduct(productId: string, category: string, ctx: ShopperContext, now = Date.now()): ProductShops {
  const catalog = getCatalog();
  const offers = catalog.offersFor(productId);
  const conf = confirmationsFor(productId, now);
  const listedIds = new Set(offers.map((o) => o.shop.id));
  const ranked = rankShops(
    offers.map(({ offer, shop }) => ({ shop, offer, confirmation: conf.get(shop.id) ?? null })),
    ctx,
    now,
  );

  // "Maybe" shops: same activity category, no listing for this exact product.
  let pool = catalog.categoryShops(category, [...listedIds], 400);
  if (ctx.origin) {
    const o = ctx.origin;
    pool = pool
      .map((s) => ({ s, d: distanceM(o, s) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 40)
      .map((x) => x.s);
  } else {
    pool = pool.slice(0, 40);
  }
  const maybe = rankShops(
    pool.map((shop) => ({ shop, offer: null, confirmation: conf.get(shop.id) ?? null })),
    ctx,
    now,
  ).shops.slice(0, 8);
  return { ranked, maybe };
}

/**
 * `floor`: the product's trimmed minimum listed price. Listed prices far below it are
 * outliers (wrong unit, a part, a knock-off) and shouldn't headline "from X"; prices
 * confirmed by a call are always trusted.
 */
export function shopStats(r: RankResult, floor?: number | null): ShopStats {
  const s = r.shops;
  const dists = s.map((x) => x.distanceM).filter((d): d is number => d !== null);
  const prices = s
    .filter((x) => !floor || x.priceSource === "confirmed" || (x.price ?? 0) >= floor * 0.85)
    .map((x) => x.price)
    .filter((p): p is number => !!p);
  return {
    shops: s.length,
    openNow: s.filter((x) => x.status.state === "open").length,
    installment: s.filter((x) => x.shop.installment).length,
    nearestM: dists.length ? Math.min(...dists) : null,
    cheapest: prices.length ? Math.min(...prices) : null,
    confirmed: s.filter((x) => x.confirmation?.available).length,
  };
}

/** Search hits enriched with where-to-buy stats under the shopper's context. */
export function withShopStats(products: Product[], ctx: ShopperContext, now = Date.now()): ProductWithStats[] {
  const catalog = getCatalog();
  return products.map((product) => {
    const offers = catalog.offersFor(product.id);
    const conf = confirmationsFor(product.id, now);
    const ranked = rankShops(
      offers.map(({ offer, shop }) => ({ shop, offer, confirmation: conf.get(shop.id) ?? null })),
      ctx,
      now,
    );
    return { product, stats: shopStats(ranked, product.price?.min), hiddenCount: Object.values(ranked.hidden).reduce((a, b) => a + (b ?? 0), 0) };
  });
}

