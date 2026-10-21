// Seller panel: live inquiries from the agent (polled; also marks the seller online)
// and the shop's own listings with confirmations.
import { connection } from "next/server";
import { sellerInbox, sellerProducts } from "@/lib/agent/seller";
import { featureOff } from "@/lib/features-server";
import { fail, handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  await connection();
  const off = featureOff("seller");
  if (off) return off;
  const url = new URL(req.url);
  const shopId = url.searchParams.get("shop") ?? "";
  const inbox = sellerInbox(shopId);
  if (!inbox) return fail(404, "not_found", "این فروشگاه پیدا نشد.");
  const withProducts = url.searchParams.get("products") === "1";
  return Response.json({
    ...inbox,
    products: withProducts ? sellerProducts(shopId, url.searchParams.get("q") ?? undefined) : undefined,
    now: Date.now(),
  });
});
