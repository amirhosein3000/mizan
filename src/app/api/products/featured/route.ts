import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { withShopStats } from "@/lib/agent/shops-service";
import { contextFromRequest, handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  await connection();
  const limit = Math.min(24, Number(new URL(req.url).searchParams.get("limit") ?? 10) || 10);
  return Response.json({ results: withShopStats(getCatalog().featured(limit), contextFromRequest(req)) });
});
