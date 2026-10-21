import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { ensureTables } from "@/lib/db";
import { getPriceProvider, summarizeOffers } from "@/lib/price";
import { SHOPPING_SQL, shoppingItems, shoppingMeta } from "./schema";

const db = () => ensureTables("shopping-list", SHOPPING_SQL);

export function getList(deviceId: string) {
  const items = db()
    .select()
    .from(shoppingItems)
    .where(eq(shoppingItems.deviceId, deviceId))
    .orderBy(asc(shoppingItems.done), asc(shoppingItems.createdAt))
    .all();
  const meta = db().select().from(shoppingMeta).where(eq(shoppingMeta.deviceId, deviceId)).get();
  return { items, budget: meta?.budget ?? null };
}

/** Add free-text items; each is matched to a catalog product when the match is decent. */
export async function addItems(deviceId: string, texts: string[]) {
  const provider = getPriceProvider();
  const now = Date.now();
  for (const [i, text] of texts.entries()) {
    const [match] = await provider.searchProducts(text, { limit: 1 });
    const good = match && match.score >= 0.5 ? match : null;
    const summary = good ? summarizeOffers(await provider.getOffers(good.product.id)) : null;
    db()
      .insert(shoppingItems)
      .values({
        deviceId,
        text: text.slice(0, 120),
        productId: good?.product.id ?? null,
        productName: good?.product.nameFa ?? null,
        onlineMedian: summary?.median ?? null,
        onlineMin: summary?.min ?? null,
        createdAt: now + i,
      })
      .run();
  }
}

export function updateItem(deviceId: string, id: number, patch: { done?: boolean; price?: number | null }) {
  const set = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(set).length === 0) return;
  db()
    .update(shoppingItems)
    .set(set)
    .where(and(eq(shoppingItems.id, id), eq(shoppingItems.deviceId, deviceId)))
    .run();
}

export function deleteItem(deviceId: string, id: number) {
  db()
    .delete(shoppingItems)
    .where(and(eq(shoppingItems.id, id), eq(shoppingItems.deviceId, deviceId)))
    .run();
}

export function clearDone(deviceId: string) {
  db()
    .delete(shoppingItems)
    .where(and(eq(shoppingItems.deviceId, deviceId), eq(shoppingItems.done, true)))
    .run();
}

export function setBudget(deviceId: string, budget: number | null) {
  db()
    .insert(shoppingMeta)
    .values({ deviceId, budget })
    .onConflictDoUpdate({ target: shoppingMeta.deviceId, set: { budget } })
    .run();
}
