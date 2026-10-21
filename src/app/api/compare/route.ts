// Side-by-side comparison of 2–4 products: specs + where-to-buy stats.
import { connection } from "next/server";
import { getCatalog, type ProductDetail } from "@/lib/catalog";
import { withShopStats } from "@/lib/agent/shops-service";
import { contextFromRequest, fail, handle } from "@/lib/http";

export const GET = handle(async (req: Request) => {
  await connection();
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 4);
  if (ids.length < 1) return fail(400, "bad_request", "کالایی برای مقایسه انتخاب نشده.");
  const catalog = getCatalog();
  const products = ids.map((id) => catalog.getProduct(id)).filter((p): p is ProductDetail => !!p);
  const stats = withShopStats(products, contextFromRequest(req));
  return Response.json({ items: products.map((product, i) => ({ product, stats: stats[i].stats })) });
});
