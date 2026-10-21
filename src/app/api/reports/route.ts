// A shopper reports what they found (after calling or visiting): stock + price.
// Becomes a confirmation other shoppers see, labelled as a shopper report.
import { getCatalog } from "@/lib/catalog";
import { recordConfirmation } from "@/lib/agent/confirmations";
import { fail, handle, readJson } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const body = await readJson<{ shopId?: string; productId?: string; available?: boolean; price?: number | null }>(req);
  if (!body?.shopId || !body.productId || typeof body.available !== "boolean") return fail(400, "bad_request", "اطلاعات ناقصه.");
  const catalog = getCatalog();
  if (!catalog.getShop(body.shopId) || !catalog.getProducts([body.productId]).length) return fail(404, "not_found", "پیدا نشد.");
  const price = body.available && body.price && body.price > 0 && body.price < 50_000_000_000 ? Math.round(body.price) : null;
  recordConfirmation({ shopId: body.shopId, productId: body.productId, available: body.available, price, source: "user", at: Date.now() });
  return Response.json({ ok: true });
});
