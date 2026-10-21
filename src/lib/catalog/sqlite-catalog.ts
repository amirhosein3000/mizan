// Catalog backed by catalog/catalog.db (built by scripts/build-catalog.ts from
// Torob's challenge dataset). Read-only. Shops (6.5k rows) are cached in memory;
// products and offers are queried on demand.
import "server-only";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { distanceM } from "../shop/geo";
import type { WeekHours } from "../shop/hours";
import { normalizeText } from "../text";
import { categoryFit, coverage, ftsAnd, ftsOr, headNounMatch, queryTokens, unaskedAccessory } from "./query";
import {
  imageUrl,
  productKind,
  type Area,
  type Catalog,
  type CatalogStats,
  type Facet,
  type Offer,
  type PaymentOption,
  type Product,
  type ProductDetail,
  type SearchFilters,
  type SearchResult,
  type Shop,
} from "./types";

interface ProductRow {
  rid: number;
  id: string;
  title: string;
  brand: string | null;
  category: string;
  model: string | null;
  images: string;
  offer_count: number;
  priced_count: number;
  price_min: number | null;
  price_med: number | null;
  price_max: number | null;
  last_change: number | null;
}

interface ShopRow {
  rid: number;
  id: string;
  name: string;
  name_real: number;
  address: string | null;
  area: string | null;
  lat: number;
  lon: number;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  categories: string;
  hours: string;
  payments: string;
  installment: number;
  torobpay: number;
  fast_delivery: number | null;
  mall: string | null;
  floor: string | null;
  unit: string | null;
  offer_count: number;
}

interface OfferRow {
  product_id: string;
  shop_rid: number;
  title: string;
  description: string | null;
  price: number | null;
  changed_at: number | null;
  warranty: string | null;
  warranty_months: number | null;
}

const PRODUCT_COLS = `p.rid, p.id, p.title, p.brand, p.category, p.model, p.images, p.offer_count, p.priced_count,
  p.price_min, p.price_med, p.price_max, p.last_change`;

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    category: r.category,
    kind: productKind(r.category),
    model: r.model,
    images: r.images ? r.images.split(" ").map(imageUrl) : [],
    offerCount: r.offer_count,
    price:
      r.price_med && r.price_min && r.price_max
        ? { min: r.price_min, median: r.price_med, max: r.price_max, count: r.priced_count }
        : null,
    lastChange: r.last_change,
  };
}

/** Dataset stores Instagram as {"handle", "profile_url"} JSON. */
function instagramUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { profile_url?: string; handle?: string };
    return j.profile_url ?? (j.handle ? `https://www.instagram.com/${j.handle}/` : null);
  } catch {
    return raw.startsWith("http") ? raw : `https://www.instagram.com/${raw.replace("@", "")}/`;
  }
}

function toShop(r: ShopRow): Shop {
  const tp = r.torobpay;
  return {
    id: r.id,
    name: r.name,
    nameReal: !!r.name_real,
    address: r.address,
    area: r.area,
    lat: r.lat,
    lon: r.lon,
    phone: r.phone,
    instagram: instagramUrl(r.instagram),
    website: r.website,
    categories: JSON.parse(r.categories) as string[],
    hours: JSON.parse(r.hours) as WeekHours | null,
    payments: JSON.parse(r.payments) as PaymentOption[],
    installment: !!r.installment,
    torobPay: tp === 2 ? "in_person" : tp === 1 ? "unknown" : "none",
    fastDelivery: r.fast_delivery === null ? null : !!r.fast_delivery,
    mall: r.mall,
    floor: r.floor,
    unit: r.unit,
    offerCount: r.offer_count,
  };
}

function toOffer(r: OfferRow, shopId: string): Offer {
  return {
    productId: r.product_id,
    shopId,
    title: r.title,
    description: r.description,
    price: r.price,
    changedAt: r.changed_at,
    warranty: r.warranty,
    warrantyMonths: r.warranty_months,
  };
}

function countFacet(values: (string | null)[], limit: number): Facet[] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

export class SqliteCatalog implements Catalog {
  private db: Database.Database;
  private shopsByRid = new Map<number, Shop>();
  private shopsById = new Map<string, Shop>();
  private ridById = new Map<string, number>();

  constructor(file: string) {
    this.db = new Database(file, { readonly: true, fileMustExist: true });
    this.db.pragma("cache_size = -32000");
    for (const r of this.db.prepare(`SELECT * FROM shops`).all() as ShopRow[]) {
      const s = toShop(r);
      this.shopsByRid.set(r.rid, s);
      this.shopsById.set(s.id, s);
      this.ridById.set(s.id, r.rid);
    }
  }

  search(query: string, filters: SearchFilters = {}, limit = 30): SearchResult {
    const empty: SearchResult = { products: [], total: 0, facets: { categories: [], brands: [] }, priceBands: [] };
    const run = (match: string | null) =>
      match
        ? (this.db
            .prepare(
              `SELECT ${PRODUCT_COLS} FROM product_fts JOIN products p ON p.rid = product_fts.rowid
               WHERE product_fts MATCH ? ORDER BY bm25(product_fts) LIMIT 600`,
            )
            .all(match) as ProductRow[])
        : [];
    let rows = run(ftsAnd(query));
    if (!rows.length) rows = run(ftsOr(query));
    if (!rows.length) return empty;

    const n = rows.length;
    const scored = rows.map((r, i) => {
      const cov = coverage(query, `${r.title} ${r.brand ?? ""} ${r.category} ${r.model ?? ""}`);
      const pop = Math.min(1, Math.log1p(r.offer_count) / Math.log1p(60));
      const score =
        0.45 * cov +
        0.15 * (1 - i / n) +
        0.2 * pop +
        0.2 * categoryFit(query, r.category) +
        (headNounMatch(query, r.title) ? 0.12 : 0) -
        (unaskedAccessory(query, r.category) ? 0.18 : 0) +
        (r.price_med ? 0.05 : 0);
      return { r, score };
    });

    const facets = {
      categories: countFacet(rows.map((r) => r.category), 8),
      brands: countFacet(rows.map((r) => r.brand), 8),
    };
    const filtered = scored.filter(({ r }) => {
      if (filters.category && r.category !== filters.category) return false;
      if (filters.brand && r.brand !== filters.brand) return false;
      if (filters.priceMax && (!r.price_min || r.price_min > filters.priceMax)) return false;
      if (filters.priceMin && (!r.price_max || r.price_max < filters.priceMin)) return false;
      return true;
    });
    filtered.sort((a, b) => b.score - a.score);
    const medians = filtered
      .map(({ r }) => r.price_med)
      .filter((x): x is number => !!x)
      .sort((a, b) => a - b);
    return {
      products: filtered.slice(0, limit).map(({ r }) => toProduct(r)),
      total: filtered.length,
      facets,
      priceBands: medians.length >= 4 ? [0.25, 0.5, 0.75].map((p) => percentile(medians, p)) : [],
    };
  }

  getProduct(id: string): ProductDetail | null {
    const r = this.db.prepare(`SELECT ${PRODUCT_COLS}, p.specs FROM products p WHERE p.id = ?`).get(id) as
      | (ProductRow & { specs: Buffer | null })
      | undefined;
    if (!r) return null;
    let specs: [string, string][] = [];
    if (r.specs) {
      try {
        specs = JSON.parse(inflateRawSync(r.specs).toString("utf8")) as [string, string][];
      } catch {
        specs = [];
      }
    }
    return { ...toProduct(r), specs };
  }

  getProducts(ids: string[]): Product[] {
    if (!ids.length) return [];
    const rows = this.db
      .prepare(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.id IN (${ids.map(() => "?").join(",")})`)
      .all(...ids) as ProductRow[];
    const byId = new Map(rows.map((r) => [r.id, toProduct(r)]));
    return ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }

  offersFor(productId: string): { offer: Offer; shop: Shop }[] {
    const rows = this.db
      .prepare(
        `SELECT p.id AS product_id, o.shop_rid, o.title, o.description, o.price, o.changed_at, o.warranty, o.warranty_months
         FROM offers o JOIN products p ON p.rid = o.product_rid WHERE p.id = ?`,
      )
      .all(productId) as OfferRow[];
    // A few shops list the same product twice: keep the most recently updated priced listing.
    const best = new Map<number, OfferRow>();
    for (const r of rows) {
      const cur = best.get(r.shop_rid);
      const better = !cur || (!!r.price && !cur.price) || (!!r.price === !!cur.price && (r.changed_at ?? 0) > (cur.changed_at ?? 0));
      if (better) best.set(r.shop_rid, r);
    }
    return [...best.values()].flatMap((r) => {
      const shop = this.shopsByRid.get(r.shop_rid);
      return shop ? [{ offer: toOffer(r, shop.id), shop }] : [];
    });
  }

  getShop(id: string): Shop | null {
    return this.shopsById.get(id) ?? null;
  }

  getShops(ids: string[]): Shop[] {
    return ids.map((id) => this.shopsById.get(id)).filter((s): s is Shop => !!s);
  }

  shopOffers(shopId: string, query?: string, limit = 60): { offer: Offer; product: Product }[] {
    const rid = this.ridById.get(shopId);
    if (!rid) return [];
    const rows = this.db
      .prepare(
        `SELECT ${PRODUCT_COLS}, o.title AS o_title, o.description AS o_description, o.price AS o_price,
           o.changed_at AS o_changed_at, o.warranty AS o_warranty, o.warranty_months AS o_warranty_months
         FROM offers o JOIN products p ON p.rid = o.product_rid WHERE o.shop_rid = ?`,
      )
      .all(rid) as (ProductRow & Record<string, unknown>)[];
    const tokens = query ? queryTokens(query) : [];
    const list = rows
      .map((r) => ({
        product: toProduct(r),
        offer: toOffer(
          {
            product_id: r.id,
            shop_rid: rid,
            title: r.o_title as string,
            description: r.o_description as string | null,
            price: r.o_price as number | null,
            changed_at: r.o_changed_at as number | null,
            warranty: r.o_warranty as string | null,
            warranty_months: r.o_warranty_months as number | null,
          },
          shopId,
        ),
        cov: tokens.length ? coverage(query!, `${r.title} ${r.o_title} ${r.category} ${r.brand ?? ""}`) : 1,
      }))
      .filter((x) => x.cov > 0.5)
      .sort((a, b) => b.cov - a.cov || (b.offer.changedAt ?? 0) - (a.offer.changedAt ?? 0));
    // Same product listed twice by one shop: keep the first (most relevant, most recent).
    const seen = new Set<string>();
    const unique = list.filter((x) => !seen.has(x.product.id) && !!seen.add(x.product.id));
    return unique.slice(0, limit).map(({ offer, product }) => ({ offer, product }));
  }

  categoryShops(category: string, excludeShopIds: string[], limit = 300): Shop[] {
    const exclude = new Set(excludeShopIds);
    const rows = this.db.prepare(`SELECT shop_rid FROM shop_categories WHERE category = ?`).all(category) as { shop_rid: number }[];
    const out: Shop[] = [];
    for (const { shop_rid } of rows) {
      const s = this.shopsByRid.get(shop_rid);
      if (s && !exclude.has(s.id)) out.push(s);
      if (out.length >= limit) break;
    }
    return out;
  }

  similar(productId: string, limit = 6): Product[] {
    const base = this.getProduct(productId);
    if (!base) return [];
    const med = base.price?.median;
    const rows = (
      med
        ? this.db
            .prepare(
              `SELECT ${PRODUCT_COLS} FROM products p WHERE p.category = ? AND p.id != ? AND p.price_med BETWEEN ? AND ?
               ORDER BY p.offer_count DESC LIMIT 400`,
            )
            .all(base.category, base.id, Math.round(med * 0.55), Math.round(med * 1.35))
        : this.db
            .prepare(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.category = ? AND p.id != ? ORDER BY p.offer_count DESC LIMIT 400`)
            .all(base.category, base.id)
    ) as ProductRow[];
    const baseTokens = new Set(queryTokens(base.title));
    const baseNorm = normalizeText(base.title);
    const scored = rows
      .filter((r) => normalizeText(r.title) !== baseNorm)
      .map((r) => {
        const t = queryTokens(r.title);
        const overlap = t.length ? t.filter((x) => baseTokens.has(x)).length / Math.max(t.length, baseTokens.size) : 0;
        const priceFit = med && r.price_med ? 1 - Math.min(1, Math.abs(Math.log(r.price_med / med)) / 0.6) : 0.3;
        const pop = Math.min(1, Math.log1p(r.offer_count) / Math.log1p(40));
        return { r, score: 0.45 * overlap + 0.3 * priceFit + 0.25 * pop };
      })
      .sort((a, b) => b.score - a.score);
    // One per near-identical title (colour/size variants crowd the list otherwise).
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const { r } of scored) {
      const key = queryTokens(r.title).slice(0, 4).join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(toProduct(r));
      if (out.length >= limit) break;
    }
    return out;
  }

  shopsNear(center: { lat: number; lon: number }, radiusM: number, opts: { category?: string; limit?: number } = {}): Shop[] {
    let pool: Iterable<Shop> = this.shopsByRid.values();
    if (opts.category) {
      const rids = this.db.prepare(`SELECT shop_rid FROM shop_categories WHERE category = ?`).all(opts.category) as { shop_rid: number }[];
      pool = rids.map((r) => this.shopsByRid.get(r.shop_rid)).filter((s): s is Shop => !!s);
    }
    const out: { s: Shop; d: number }[] = [];
    for (const s of pool) {
      const d = distanceM(center, s);
      if (d <= radiusM) out.push({ s, d });
    }
    return out
      .sort((a, b) => a.d - b.d)
      .slice(0, opts.limit ?? 200)
      .map((x) => x.s);
  }

  private areaCache: Area[] | null = null;
  areas(): Area[] {
    if (this.areaCache) return this.areaCache;
    const m = new Map<string, { lat: number; lon: number; n: number }>();
    for (const s of this.shopsByRid.values()) {
      if (!s.area) continue;
      const a = m.get(s.area) ?? { lat: 0, lon: 0, n: 0 };
      a.lat += s.lat;
      a.lon += s.lon;
      a.n++;
      m.set(s.area, a);
    }
    this.areaCache = [...m.entries()]
      .map(([name, a]) => ({ name, lat: a.lat / a.n, lon: a.lon / a.n, shops: a.n }))
      .sort((a, b) => b.shops - a.shops);
    return this.areaCache;
  }

  private statsCache: CatalogStats | null = null;
  stats(): CatalogStats {
    if (this.statsCache) return this.statsCache;
    const meta = new Map(
      (this.db.prepare(`SELECT key, value FROM meta`).all() as { key: string; value: string }[]).map((r) => [r.key, r.value]),
    );
    const counts = JSON.parse(meta.get("counts") ?? "{}") as { shops: number; products: number; offers: number };
    this.statsCache = { ...counts, snapshotAt: Number(meta.get("snapshot_at") ?? 0) };
    return this.statsCache;
  }

  private featuredCache: Product[] | null = null;
  featured(limit = 12): Product[] {
    if (!this.featuredCache) {
      const rows = this.db
        .prepare(
          `SELECT ${PRODUCT_COLS} FROM products p
           WHERE p.offer_count >= 6 AND p.price_med IS NOT NULL AND p.images != ''
           ORDER BY p.offer_count DESC LIMIT 600`,
        )
        .all() as ProductRow[];
      const seen = new Set<string>();
      this.featuredCache = [];
      for (const r of rows) {
        if (seen.has(r.category)) continue;
        seen.add(r.category);
        this.featuredCache.push(toProduct(r));
      }
    }
    return this.featuredCache.slice(0, limit);
  }
}

export function openCatalog(): SqliteCatalog {
  // turbopackIgnore: runtime path, not a file to trace into the bundle.
  const file = resolve(/*turbopackIgnore: true*/ process.env.CATALOG_PATH ?? "./catalog/catalog.db");
  if (!existsSync(file)) {
    throw new Error(`Catalog database not found at ${file}. Run \`npm run catalog\` (see docs/data.md).`);
  }
  return new SqliteCatalog(file);
}
