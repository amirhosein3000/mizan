// Seller side of the agent: a shop owner opens /seller, sees the agent's
// questions live and answers with two taps; they can also refresh their own
// prices. Answers become confirmations every shopper sees.
import "server-only";
import { getCatalog } from "../catalog";
import { getSqlite } from "../db";
import { formatTomanShort } from "../format";
import { ASK_LABEL, type Ask, type CallResult } from "./call-sim";
import { confirmationsForShop, recordConfirmation } from "./confirmations";
import { SELLER_TIMEOUT_MS } from "./missions";

const db = () => getSqlite();

export function touchPresence(shopId: string, now = Date.now()): void {
  db()
    .prepare(`INSERT INTO seller_presence (shop_id, last_seen) VALUES (?, ?) ON CONFLICT(shop_id) DO UPDATE SET last_seen = excluded.last_seen`)
    .run(shopId, now);
}

export interface Inquiry {
  callId: string;
  productId: string;
  productTitle: string;
  image: string | null;
  listedPrice: number | null;
  asks: string[];
  question: string | null;
  startedAt: number;
  expiresAt: number;
  answered: CallResult | null;
}

export function sellerInbox(shopId: string, now = Date.now()) {
  touchPresence(shopId, now);
  const catalog = getCatalog();
  const shop = catalog.getShop(shopId);
  if (!shop) return null;
  const rows = db()
    .prepare(
      `SELECT c.id, c.product_id, c.started_at, c.result, m.asks, m.question, m.product_title
       FROM calls c JOIN missions m ON m.id = c.mission_id
       WHERE c.shop_id = ? AND c.channel = 'seller' AND c.started_at > ?
       ORDER BY c.started_at DESC LIMIT 20`,
    )
    .all(shopId, now - 6 * 3600_000) as {
    id: string;
    product_id: string;
    started_at: number;
    result: string | null;
    asks: string;
    question: string | null;
    product_title: string;
  }[];
  const products = new Map(catalog.getProducts([...new Set(rows.map((r) => r.product_id))]).map((p) => [p.id, p]));
  const listed = new Map(catalog.shopOffers(shopId, undefined, 400).map((x) => [x.product.id, x.offer.price]));
  const inquiries: Inquiry[] = rows.map((r) => ({
    callId: r.id,
    productId: r.product_id,
    productTitle: r.product_title,
    image: products.get(r.product_id)?.images[0] ?? null,
    listedPrice: listed.get(r.product_id) ?? null,
    asks: (JSON.parse(r.asks) as Ask[]).filter((a) => a !== "stock").map((a) => ASK_LABEL[a]),
    question: r.question,
    startedAt: r.started_at,
    expiresAt: r.started_at + SELLER_TIMEOUT_MS,
    answered: r.result ? (JSON.parse(r.result) as CallResult) : null,
  }));
  return { shop, inquiries };
}

export interface SellerAnswer {
  callId: string;
  available: boolean;
  price?: number | null;
  holdMinutes?: number | null;
  note?: string | null;
}

export function answerInquiry(shopId: string, a: SellerAnswer, now = Date.now()): boolean {
  const c = db().prepare(`SELECT * FROM calls WHERE id = ? AND shop_id = ? AND channel = 'seller'`).get(a.callId, shopId) as
    | { id: string; product_id: string; result: string | null; started_at: number }
    | undefined;
  if (!c || c.result || now - c.started_at > SELLER_TIMEOUT_MS) return false;
  const listed = getCatalog().shopOffers(shopId, undefined, 400).find((x) => x.product.id === c.product_id)?.offer.price ?? null;
  const price = a.available ? a.price ?? listed : null;
  const holdUntil = a.available && a.holdMinutes ? now + a.holdMinutes * 60_000 : null;
  const result: CallResult = {
    outcome: "answered",
    available: a.available,
    price,
    priceChange: !price ? null : !listed ? "new" : price === listed ? "same" : price > listed ? "up" : "down",
    installment: null,
    warranty: null,
    holdUntil,
    closesAt: null,
    restockDays: null,
    summary: a.available
      ? ["موجوده (پاسخ فروشنده)", price ? `${formatTomanShort(price)} تومن` : null, holdUntil ? "نگه می‌داره" : null].filter(Boolean).join(" • ")
      : "ناموجود (پاسخ فروشنده)",
  };
  db().prepare(`UPDATE calls SET result = ?, ends_at = ?, recorded = 1 WHERE id = ?`).run(JSON.stringify(result), now, c.id);
  recordConfirmation({
    shopId,
    productId: c.product_id,
    available: a.available,
    price,
    holdUntil,
    source: "seller",
    note: a.note ?? null,
    at: now,
    callId: c.id,
  });
  return true;
}

/** Seller refreshes a listed price / stock without an inquiry. */
export function sellerUpdate(shopId: string, productId: string, available: boolean, price: number | null, now = Date.now()): void {
  recordConfirmation({ shopId, productId, available, price: available ? price : null, source: "seller", at: now });
}

/** What the seller sees in "my products": listed vs. confirmed. */
export function sellerProducts(shopId: string, query?: string) {
  const conf = confirmationsForShop(shopId);
  return getCatalog()
    .shopOffers(shopId, query, 40)
    .map(({ offer, product }) => ({ offer, product, confirmation: conf.get(product.id) ?? null }));
}

/** Shops with an inquiry in the last few minutes — quick picks for the demo seller panel. */
export function recentlyCalledShops(now = Date.now()) {
  const rows = db()
    .prepare(`SELECT shop_id, MAX(started_at) AS at FROM calls WHERE started_at > ? GROUP BY shop_id ORDER BY at DESC LIMIT 8`)
    .all(now - 30 * 60_000) as { shop_id: string; at: number }[];
  return getCatalog().getShops(rows.map((r) => r.shop_id));
}
