import { getCatalog } from "@/lib/catalog";
import { sellerUpdate } from "@/lib/agent/seller";
import { featureOff } from "@/lib/features-server";
import { fail, handle, readJson } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const off = featureOff("seller");
  if (off) return off;
  const body = await readJson<{ shopId?: string; productId?: string; available?: boolean; price?: number | null }>(req);
  if (!body?.shopId || !body.productId || typeof body.available !== "boolean") return fail(400, "bad_request", "اطلاعات ناقصه.");
  if (!getCatalog().getShop(body.shopId)) return fail(404, "not_found", "این فروشگاه پیدا نشد.");
  sellerUpdate(body.shopId, body.productId, body.available, body.price && body.price > 0 ? Math.round(body.price) : null);
  return Response.json({ ok: true });
});
