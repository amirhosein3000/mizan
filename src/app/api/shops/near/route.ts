// Shops around a point for the map: optional activity category and purchase conditions.
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { contextFromRequest, handle } from "@/lib/http";
import { distanceM } from "@/lib/shop/geo";
import { openStatus } from "@/lib/shop/hours";
import { CENTRAL_TEHRAN } from "@/lib/shop/places";

export const GET = handle(async (req: Request) => {
  await connection();
  const url = new URL(req.url);
  const ctx = contextFromRequest(req);
  const center = ctx.origin ?? CENTRAL_TEHRAN;
  const radius = Math.min(15_000, (ctx.radiusKm ?? 1.5) * 1000);
  const category = url.searchParams.get("category") || undefined;
  const at = ctx.visitAt ?? Date.now();
  const shops = getCatalog()
    .shopsNear(center, radius, { category, limit: 800 })
    .map((s) => ({ shop: s, distanceM: distanceM(center, s), status: openStatus(s.hours, at) }))
    .filter(({ shop, status }) => {
      if (ctx.installment && !shop.installment) return false;
      if (ctx.torobPayInPerson && shop.torobPay !== "in_person") return false;
      if (ctx.openOnly && status.state === "closed") return false;
      if (ctx.fastDelivery && shop.fastDelivery !== true) return false;
      return true;
    })
    .slice(0, 300);
  return Response.json({ center, radius, shops });
});
