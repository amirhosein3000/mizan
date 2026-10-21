// MockPriceProvider — backed by generated seed JSON (src/data/mock/products.json).
// All prices/sellers/offers are INVENTED demo data.
import seed from "@/data/mock/products.json";
import { indexProducts, searchIndex } from "@/lib/match";
import { normalizeText } from "@/lib/text";
import { summarizeOffers } from "./summary";
import type { CategoryId, Offer, PriceProvider, Product, ProductMatch, ProductWithSummary } from "./types";

type SeedProduct = Product & { offers: Offer[]; popular?: boolean };

const all = (seed as unknown as { products: SeedProduct[] }).products;
const byId = new Map(all.map((p) => [p.id, p]));
const byBarcode = new Map(all.filter((p) => p.barcode).map((p) => [p.barcode!, p]));
const index = indexProducts(all);

function strip(p: SeedProduct): Product {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { offers, popular, ...product } = p;
  return product;
}

/** "Galaxy A56 5G 256GB" -> "galaxy a56" — used to skip variants of the same model. */
function family(p: Product): string {
  return normalizeText(p.model).split(" ").slice(0, 2).join(" ");
}

export class MockPriceProvider implements PriceProvider {
  readonly name = "mock" as const;

  async searchProducts(query: string, opts: { limit?: number; category?: CategoryId } = {}): Promise<ProductMatch[]> {
    const digits = normalizeText(query).replace(/ /g, "");
    if (/^\d{8,14}$/.test(digits)) {
      const hit = byBarcode.get(digits);
      if (hit) return [{ product: strip(hit), score: 1 }];
    }
    const results = searchIndex(index, query, (opts.limit ?? 10) * 2)
      .filter((m) => !opts.category || m.product.category === opts.category)
      .slice(0, opts.limit ?? 10);
    return results.map((m) => ({ product: strip(m.product as SeedProduct), score: m.score }));
  }

  async getProduct(id: string): Promise<Product | null> {
    const p = byId.get(id);
    return p ? strip(p) : null;
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const p = byBarcode.get(normalizeText(barcode).replace(/ /g, ""));
    return p ? strip(p) : null;
  }

  async getOffers(productId: string): Promise<Offer[]> {
    return byId.get(productId)?.offers ?? [];
  }

  async getAlternatives(productId: string, opts: { limit?: number } = {}): Promise<ProductWithSummary[]> {
    const p = byId.get(productId);
    if (!p) return [];
    const base = summarizeOffers(p.offers);
    if (!base) return [];
    const fam = family(p);
    return all
      .filter((o) => o.id !== p.id && o.subcategory === p.subcategory && o.category === p.category)
      .map((o) => ({ o, summary: summarizeOffers(o.offers) }))
      .filter((x) => x.summary && x.summary.median >= base.median * 0.55 && x.summary.median <= base.median * 1.2)
      .map((x) => ({
        ...x,
        // Prefer different models that are a bit cheaper than the original.
        rank: Math.abs(x.summary!.median / base.median - 0.88) + (family(x.o) === fam ? 0.5 : 0),
      }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, opts.limit ?? 4)
      .map((x) => ({ product: strip(x.o), summary: x.summary }));
  }

  async listFeatured(limit = 12): Promise<Product[]> {
    return all
      .filter((p) => p.popular)
      .slice(0, limit)
      .map(strip);
  }
}
