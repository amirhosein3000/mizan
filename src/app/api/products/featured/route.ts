import { connection } from "next/server";
import { getPriceProvider } from "@/lib/price";
import { handle } from "@/lib/http";
import { productsWithSummaries } from "@/lib/product-service";

export const GET = handle(async (req: Request) => {
  await connection();
  const limit = Math.min(40, Number(new URL(req.url).searchParams.get("limit") ?? 12) || 12);
  const products = await getPriceProvider().listFeatured(limit);
  return Response.json({ results: await productsWithSummaries(products) });
});
