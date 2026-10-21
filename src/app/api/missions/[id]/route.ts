// One mission: live call progress (polled), and the shopper's follow-up actions.
import { connection } from "next/server";
import { getMission, updateMission, type MissionAction } from "@/lib/agent/missions";
import { featureOff } from "@/lib/features-server";
import { fail, getDeviceId, handle, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await connection();
  const off = featureOff("agentCalls");
  if (off) return off;
  const { id } = await ctx.params;
  const mission = getMission(id, await getDeviceId());
  if (!mission) return fail(404, "not_found", "این پیگیری پیدا نشد.");
  return Response.json({ mission, now: Date.now() });
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const off = featureOff("agentCalls");
  if (off) return off;
  const { id } = await ctx.params;
  const body = await readJson<MissionAction>(req);
  const ok = !!body && ["choose", "status", "recheck", "more", "runNow", "later"].includes(body.action) && updateMission(id, await getDeviceId(), body);
  if (!ok) return fail(400, "bad_request", "این کار انجام نشد.");
  return Response.json({ mission: getMission(id, await getDeviceId()) });
});
