// Build the read-only catalog database from Torob's challenge dataset (CSV export).
//
//   npm run catalog                       # reads ./dataset/*.csv
//   DATASET_DIR=/path/to/csv npm run catalog
//
// Output: catalog/catalog.db (SQLite, read-only at runtime) with
//   shops, products, offers, shop_categories, categories, meta, product_fts (FTS5).
// The CSVs are never shipped; only this compact, indexed database is.
import Database from "better-sqlite3";
import { parse } from "csv-parse";
import { createReadStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { deflateRawSync } from "node:zlib";
import { parseAddress } from "../src/lib/shop/address";
import { normalizeText } from "../src/lib/text";

const DIR = resolve(process.env.DATASET_DIR ?? "./dataset");
const OUT = resolve(process.env.CATALOG_PATH ?? "./catalog/catalog.db");
const TMP = `${OUT}.tmp`;

/** Prices outside this range (Toman) are data-entry errors and are stored as NULL. */
const MIN_PRICE = 1_000;
const MAX_PRICE = 50_000_000_000;

/** Product images share this prefix; only the suffix is stored (see catalog/images.ts). */
const IMAGE_PREFIX = "https://image.torob.com/base/images/";

const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"] as const;

function nul(v: string | undefined): string | null {
  return v === undefined || v === "null" || v === "" ? null : v;
}

function json<T>(v: string | undefined, fallback: T): T {
  const s = nul(v);
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

async function* rows(file: string): AsyncGenerator<Record<string, string>> {
  const parser = createReadStream(join(DIR, file)).pipe(
    parse({ columns: true, relax_quotes: true, skip_empty_lines: true, bom: true }),
  );
  for await (const r of parser) yield r as Record<string, string>;
}

function minutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** weekly_hours -> [sat..fri] each: null (unknown) | [] (closed) | [[openMin, closeMin], ...]. */
function parseHours(raw: string | undefined): (number[][] | null)[] | null {
  const j = json<Record<string, { status?: string; shifts?: { start_time: string; end_time: string }[] }>>(raw, {});
  if (!Object.keys(j).length) return null;
  const week = DAYS.map((d) => {
    const day = j[d];
    if (!day || day.status === "unsupported") return null;
    if (day.status === "closed") return [];
    const shifts = (day.shifts ?? [])
      .map((s) => [minutes(s.start_time), minutes(s.end_time)])
      .filter(([a, b]) => !(a === 0 && b === 0))
      // "10:00 -> 00:00" means until midnight; "18:00 -> 02:00" spills past midnight: cap at 24:00.
      .map(([a, b]) => [a, b <= a ? 1440 : b]);
    return shifts;
  });
  return week.every((d) => d === null) ? null : week;
}

interface Warranty {
  description?: string | null;
  period_months?: number | null;
  provider?: string | null;
}

function warrantyText(w: Warranty | null): { text: string | null; months: number | null } {
  if (!w) return { text: null, months: null };
  const months = w.period_months && w.period_months > 0 ? w.period_months : null;
  const parts: string[] = [];
  if (months) parts.push(`${months} ماه`);
  if (w.provider) parts.push(`گارانتی ${w.provider}`);
  else if (months) parts.push("گارانتی");
  let text = parts.join(" ");
  if (!text && w.description) text = w.description.trim().slice(0, 120);
  return { text: text || null, months };
}

function cleanSpecValue(v: string): string {
  return v.replace(/(,\s*)+$/g, "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function median(sorted: number[]): number {
  const m = sorted.length >> 1;
  return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2);
}

async function main() {
  for (const f of ["shops.csv", "products.csv", "offers.csv"]) {
    if (!existsSync(join(DIR, f))) {
      console.error(`Missing ${join(DIR, f)}. Set DATASET_DIR to the folder with the challenge CSVs.`);
      process.exit(1);
    }
  }
  mkdirSync(resolve(OUT, ".."), { recursive: true });
  rmSync(TMP, { force: true });
  const db = new Database(TMP);
  db.pragma("journal_mode = OFF");
  db.pragma("synchronous = OFF");
  db.pragma("page_size = 4096");

  db.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE shops (
      rid INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, name_real INTEGER NOT NULL,
      address TEXT, area TEXT, lat REAL NOT NULL, lon REAL NOT NULL,
      phone TEXT, instagram TEXT, website TEXT,
      categories TEXT NOT NULL, hours TEXT, payments TEXT NOT NULL,
      installment INTEGER NOT NULL, torobpay INTEGER NOT NULL, fast_delivery INTEGER,
      mall TEXT, floor TEXT, unit TEXT,
      offer_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE products (
      rid INTEGER PRIMARY KEY, id TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      brand TEXT, category TEXT NOT NULL, model TEXT, images TEXT NOT NULL, specs BLOB,
      offer_count INTEGER NOT NULL DEFAULT 0, priced_count INTEGER NOT NULL DEFAULT 0,
      price_min INTEGER, price_med INTEGER, price_max INTEGER, last_change INTEGER
    );
    CREATE TABLE offers (
      rid INTEGER PRIMARY KEY, product_rid INTEGER NOT NULL, shop_rid INTEGER NOT NULL,
      title TEXT NOT NULL, description TEXT, price INTEGER, changed_at INTEGER,
      warranty TEXT, warranty_months INTEGER
    );
    CREATE TABLE shop_categories (shop_rid INTEGER NOT NULL, category TEXT NOT NULL);
    CREATE TABLE categories (
      name TEXT PRIMARY KEY, norm TEXT NOT NULL,
      product_count INTEGER NOT NULL, offer_count INTEGER NOT NULL, shop_count INTEGER NOT NULL
    );
  `);

  // ---------------- shops ----------------
  const insShop = db.prepare(`INSERT INTO shops VALUES (NULL,@id,@name,@name_real,@address,@area,@lat,@lon,@phone,@instagram,@website,
    @categories,@hours,@payments,@installment,@torobpay,@fast_delivery,@mall,@floor,@unit,0)`);
  const insShopCat = db.prepare(`INSERT INTO shop_categories VALUES (?, ?)`);
  const shopRid = new Map<string, number>();
  let shopCount = 0;
  db.exec("BEGIN");
  for await (const r of rows("shops.csv")) {
    const cats = json<string[]>(r.category_names, []);
    const contacts = json<{ channel: string; display_number?: string }[]>(r.contacts, []);
    const payments = json<{ provider_name: string; channel: string }[]>(r.payment_options, []).map((p) => ({
      provider: p.provider_name,
      inPerson: p.channel === "in_person",
    }));
    const torob = payments.find((p) => p.provider === "ترب‌پی");
    const addr = parseAddress(r.address ?? "");
    const instagram = nul(r.instagram);
    const website = nul(r.website_url);
    const info = insShop.run({
      id: r.shop_id,
      name: r.name,
      // Per the dataset notes: only shops with an Instagram page or website keep their real name.
      name_real: instagram || website ? 1 : 0,
      address: nul(r.address),
      area: nul(r.location_label?.trim()),
      lat: Number(r.lat),
      lon: Number(r.lon),
      phone: contacts.find((c) => c.channel === "phone")?.display_number ?? null,
      instagram,
      website,
      categories: JSON.stringify(cats),
      hours: JSON.stringify(parseHours(r.weekly_hours)),
      payments: JSON.stringify(payments),
      installment: payments.length ? 1 : 0,
      torobpay: torob ? (torob.inPerson ? 2 : 1) : 0,
      fast_delivery: r.supports_fast_delivery === "true" ? 1 : r.supports_fast_delivery === "false" ? 0 : null,
      mall: addr.mall,
      floor: addr.floor,
      unit: addr.unit,
    });
    shopRid.set(r.shop_id, Number(info.lastInsertRowid));
    for (const c of new Set(cats)) insShopCat.run(info.lastInsertRowid, c);
    shopCount++;
  }
  db.exec("COMMIT");
  console.log(`shops: ${shopCount}`);

  // ---------------- products ----------------
  const insProduct = db.prepare(`INSERT INTO products (id,title,brand,category,model,images,specs)
    VALUES (@id,@title,@brand,@category,@model,@images,@specs)`);
  const productRid = new Map<string, number>();
  /** Latin product name from the specs, indexed for search ("Galaxy A56"). */
  const latinName = new Map<number, string>();
  let productCount = 0;
  db.exec("BEGIN");
  for await (const r of rows("products.csv")) {
    const images = json<string[]>(r.image_urls, []).slice(0, 4);
    const specs = json<{ key: string; value: string }[]>(r.specs, [])
      .filter((s) => s.key && s.value && s.value !== "title")
      .slice(0, 40)
      .map((s) => [s.key.trim().slice(0, 60), cleanSpecValue(String(s.value))]);
    const info = insProduct.run({
      id: r.product_id,
      title: r.persian_title.trim(),
      brand: nul(r.brand_name),
      category: r.category_name,
      model: nul(r.model),
      images: images.map((u) => (u.startsWith(IMAGE_PREFIX) ? u.slice(IMAGE_PREFIX.length) : u)).join(" "),
      specs: specs.length ? deflateRawSync(Buffer.from(JSON.stringify(specs))) : null,
    });
    const rid = Number(info.lastInsertRowid);
    productRid.set(r.product_id, rid);
    const latin = specs.find(([k, v]) => (k === "نام محصول" || k === "مدل") && /[a-z]/i.test(v))?.[1];
    if (latin) latinName.set(rid, latin);
    productCount++;
  }
  db.exec("COMMIT");
  console.log(`products: ${productCount}`);

  // ---------------- offers ----------------
  const insOffer = db.prepare(`INSERT INTO offers VALUES (NULL,@product_rid,@shop_rid,@title,@description,@price,@changed_at,@warranty,@warranty_months)`);
  let offerCount = 0;
  let badPrice = 0;
  let maxChanged = 0;
  db.exec("BEGIN");
  for await (const r of rows("offers.csv")) {
    const raw = Number(nul(r.price_toman));
    const price = Number.isFinite(raw) && raw >= MIN_PRICE && raw <= MAX_PRICE ? Math.round(raw) : null;
    if (nul(r.price_toman) && price === null) badPrice++;
    const changed = nul(r.last_price_changed_at) ? Date.parse(r.last_price_changed_at) : NaN;
    if (Number.isFinite(changed)) maxChanged = Math.max(maxChanged, changed);
    const w = warrantyText(json<Warranty | null>(r.warranty, null));
    const product_rid = productRid.get(r.product_id);
    const shop_rid = shopRid.get(r.shop_id);
    if (!product_rid || !shop_rid) continue;
    insOffer.run({
      product_rid,
      shop_rid,
      title: r.seller_title.trim(),
      description: nul(r.description?.trim())?.slice(0, 400) ?? null,
      price,
      changed_at: Number.isFinite(changed) ? changed : null,
      warranty: w.text,
      warranty_months: w.months,
    });
    offerCount++;
  }
  db.exec("COMMIT");
  console.log(`offers: ${offerCount} (invalid prices nulled: ${badPrice})`);

  db.exec(`
    CREATE INDEX offers_product ON offers (product_rid);
    CREATE INDEX offers_shop ON offers (shop_rid);
    CREATE INDEX shop_categories_cat ON shop_categories (category);
    CREATE INDEX products_category ON products (category);
  `);

  // ---------------- per-product price summary ----------------
  const offersByProduct = db.prepare(`SELECT product_rid AS p, price, changed_at FROM offers ORDER BY product_rid`);
  const updProduct = db.prepare(`UPDATE products SET offer_count=?, priced_count=?, price_min=?, price_med=?, price_max=?, last_change=? WHERE rid=?`);
  db.exec("BEGIN");
  let cur: number | null = null;
  let prices: number[] = [];
  let n = 0;
  let last = 0;
  const flush = () => {
    if (!cur) return;
    prices.sort((a, b) => a - b);
    // Ignore wild outliers (wrong unit, typo, bundle price) when summarising: keep median/3..median*3.
    const med = prices.length ? median(prices) : null;
    const sane = med ? prices.filter((p) => p >= med / 3 && p <= med * 3) : [];
    updProduct.run(n, sane.length, sane[0] ?? null, sane.length ? median(sane) : null, sane.at(-1) ?? null, last || null, cur);
  };
  for (const o of offersByProduct.all() as Array<{ p: number; price: number | null; changed_at: number | null }>) {
    if (o.p !== cur) {
      flush();
      cur = o.p;
      prices = [];
      n = 0;
      last = 0;
    }
    n++;
    if (o.price) prices.push(o.price);
    if (o.changed_at) last = Math.max(last, o.changed_at);
  }
  flush();
  db.exec(`UPDATE shops SET offer_count = (SELECT COUNT(*) FROM offers WHERE offers.shop_rid = shops.rid)`);
  db.exec("COMMIT");

  // ---------------- categories ----------------
  db.exec(`
    INSERT INTO categories (name, norm, product_count, offer_count, shop_count)
    SELECT p.category, '', COUNT(*), SUM(p.offer_count),
      (SELECT COUNT(DISTINCT sc.shop_rid) FROM shop_categories sc WHERE sc.category = p.category)
    FROM products p GROUP BY p.category;
  `);
  const cats = db.prepare(`SELECT name FROM categories`).all() as { name: string }[];
  const updCat = db.prepare(`UPDATE categories SET norm=? WHERE name=?`);
  db.exec("BEGIN");
  for (const c of cats) updCat.run(normalizeText(c.name), c.name);
  db.exec("COMMIT");

  // ---------------- full-text search ----------------
  db.exec(`CREATE VIRTUAL TABLE product_fts USING fts5(body, content='', tokenize='unicode61 remove_diacritics 2')`);
  const insFts = db.prepare(`INSERT INTO product_fts (rowid, body) VALUES (?, ?)`);
  const titlesByProduct = db.prepare(`SELECT title FROM offers WHERE product_rid = ? LIMIT 3`);
  db.exec("BEGIN");
  for (const p of db.prepare(`SELECT rid, title, brand, category, model FROM products`).all() as Array<{
    rid: number;
    title: string;
    brand: string | null;
    category: string;
    model: string | null;
  }>) {
    const sellerTitles = (titlesByProduct.all(p.rid) as { title: string }[]).map((t) => t.title);
    const body = normalizeText(
      [p.title, p.brand, p.category, p.model, latinName.get(p.rid), ...new Set(sellerTitles)].filter(Boolean).join(" "),
    );
    insFts.run(p.rid, body);
  }
  db.exec("COMMIT");
  db.exec(`INSERT INTO product_fts(product_fts) VALUES('optimize')`);

  const insMeta = db.prepare(`INSERT INTO meta VALUES (?, ?)`);
  insMeta.run("snapshot_at", String(maxChanged));
  insMeta.run("built_at", String(Date.now()));
  insMeta.run("counts", JSON.stringify({ shops: shopCount, products: productCount, offers: offerCount }));
  db.exec("ANALYZE");
  db.close();

  const vac = new Database(TMP);
  vac.exec("VACUUM");
  vac.close();
  rmSync(OUT, { force: true });
  renameSync(TMP, OUT);
  console.log(`wrote ${OUT} (${(statSync(OUT).size / 1e6).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
