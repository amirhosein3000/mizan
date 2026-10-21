import { connection } from "next/server";
import { getPriceProvider } from "@/lib/price";
import { handle } from "@/lib/http";
import { productsWithSummaries } from "@/lib/product-service";

export const GET = handle(async () => {
  await connection();
  const products = await getPriceProvider().listFeatured(12);
  return Response.json({ results: await productsWithSummaries(products) });
});
