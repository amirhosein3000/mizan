import { answerInquiry } from "@/lib/agent/seller";
import { featureOff } from "@/lib/features-server";
import { fail, handle, readJson } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const off = featureOff("seller");
  if (off) return off;
  const body = await readJson<{ shopId?: string; callId?: string; available?: boolean; price?: number | null; holdMinutes?: number | null }>(req);
  if (!body?.shopId || !body.callId || typeof body.available !== "boolean") return fail(400, "bad_request", "اطلاعات ناقصه.");
  const ok = answerInquiry(body.shopId, {
    callId: body.callId,
    available: body.available,
    price: body.price && body.price > 0 ? Math.round(body.price) : null,
    holdMinutes: body.holdMinutes ?? null,
  });
  if (!ok) return fail(409, "expired", "این درخواست منقضی شده یا قبلاً جواب داده شده.");
  return Response.json({ ok: true });
});
