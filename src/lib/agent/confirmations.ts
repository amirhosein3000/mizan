// Shared knowledge the agent builds up: what calls, sellers and shoppers
// confirmed about stock and price. Every shopper benefits from every call —
// this is how stale listed prices get updated.
import "server-only";
import { getSqlite } from "../db";
import type { Confirmation } from "../shop/rank";

/** Confirmations older than this are not shown as "confirmed". */
export const CONFIRMATION_TTL_MS = 3 * 86_400_000;

interface Row {
  shop_id: string;
  product_id: string;
  available: number | null;
  price: number | null;
  hold_until: number | null;
  source: Confirmation["source"];
  note: string | null;
  at: number;
}

function toConfirmation(r: Row): Confirmation {
  return {
    shopId: r.shop_id,
    productId: r.product_id,
    available: r.available === null ? null : !!r.available,
    price: r.price,
    holdUntil: r.hold_until,
    source: r.source,
    note: r.note,
    at: r.at,
  };
}

export function recordConfirmation(c: Confirmation & { callId?: string | null }): void {
  getSqlite()
    .prepare(
      `INSERT INTO confirmations (shop_id, product_id, available, price, hold_until, source, note, call_id, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      c.shopId,
      c.productId,
      c.available === null ? null : c.available ? 1 : 0,
      c.price,
      c.holdUntil ?? null,
      c.source,
      c.note ?? null,
      c.callId ?? null,
      c.at,
    );
}

/** Latest fresh confirmation per shop for a product. */
export function confirmationsFor(productId: string, now = Date.now()): Map<string, Confirmation> {
  const rows = getSqlite()
    .prepare(`SELECT * FROM confirmations WHERE product_id = ? AND at > ? ORDER BY at ASC`)
    .all(productId, now - CONFIRMATION_TTL_MS) as Row[];
  const m = new Map<string, Confirmation>();
  for (const r of rows) m.set(r.shop_id, toConfirmation(r));
  return m;
}

/** Latest fresh confirmations for a shop (any product). */
export function confirmationsForShop(shopId: string, now = Date.now()): Map<string, Confirmation> {
  const rows = getSqlite()
    .prepare(`SELECT * FROM confirmations WHERE shop_id = ? AND at > ? ORDER BY at ASC`)
    .all(shopId, now - CONFIRMATION_TTL_MS) as Row[];
  const m = new Map<string, Confirmation>();
  for (const r of rows) m.set(r.product_id, toConfirmation(r));
  return m;
}
