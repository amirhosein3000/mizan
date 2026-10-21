// Step 3 — the agent's missions: list (tracking) and start (calls shops).
import { connection } from "next/server";
import { createMission, listMissions } from "@/lib/agent/missions";
import type { Ask } from "@/lib/agent/call-sim";
import { featureOff } from "@/lib/features-server";
import { fail, getDeviceId, handle, readJson } from "@/lib/http";
import { DEFAULT_CONTEXT, type ShopperContext } from "@/lib/shop/context";

const ASKS: Ask[] = ["stock", "price", "installment", "warranty", "hold"];

export const GET = handle(async () => {
  await connection();
  const off = featureOff("agentCalls");
  if (off) return off;
  return Response.json({ missions: listMissions(await getDeviceId()) });
});

export const POST = handle(async (req: Request) => {
  const off = featureOff("agentCalls");
  if (off) return off;
  const body = await readJson<{
    productId?: string;
    context?: Partial<ShopperContext>;
    asks?: string[];
    question?: string;
    shopIds?: string[];
  }>(req);
  if (!body?.productId) return fail(400, "bad_request", "کالا مشخص نیست.");
  const id = createMission(await getDeviceId(), {
    productId: body.productId,
    context: { ...DEFAULT_CONTEXT, ...(body.context ?? {}) },
    asks: (body.asks ?? []).filter((a): a is Ask => ASKS.includes(a as Ask)),
    question: body.question?.slice(0, 200) ?? null,
    shopIds: (body.shopIds ?? []).slice(0, 5),
  });
  if (!id) return fail(404, "not_found", "این کالا پیدا نشد.");
  return Response.json({ id });
});
