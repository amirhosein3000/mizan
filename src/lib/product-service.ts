// Server-side composition of provider calls used by several routes.
import "server-only";
import { getPriceProvider, summarizeOffers, type Product, type ProductMatch } from "@/lib/price";

export async function withSummaries(matches: ProductMatch[]) {
  const provider = getPriceProvider();
  return Promise.all(
    matches.map(async (m) => ({ ...m, summary: summarizeOffers(await provider.getOffers(m.product.id)) })),
  );
}

export async function productsWithSummaries(products: Product[]) {
  return withSummaries(products.map((product) => ({ product, score: 1 })));
}

export async function getProductBundle(id: string) {
  const provider = getPriceProvider();
  const product = await provider.getProduct(id);
  if (!product) return null;
  const [offers, alternatives] = await Promise.all([
    provider.getOffers(id),
    provider.getAlternatives(id, { limit: 4 }),
  ]);
  return { product, offers, summary: summarizeOffers(offers), alternatives };
}

export type ProductBundle = NonNullable<Awaited<ReturnType<typeof getProductBundle>>>;
