// TorobPriceProvider — STUB.
//
// To be implemented against whatever data or API the sponsor (Torob) provides
// at the event. Do NOT scrape any website. See docs/spec-day.md and prompt 5
// in the project playbook. Until then, every method throws so a misconfigured
// deployment fails loudly instead of silently showing wrong prices.
import type { Offer, PriceProvider, Product, ProductMatch, ProductWithSummary } from "./types";

export class TorobPriceProvider implements PriceProvider {
  readonly name = "torob" as const;

  constructor(
    private readonly config = {
      baseUrl: process.env.TOROB_API_BASE_URL ?? "",
      apiKey: process.env.TOROB_API_KEY ?? "",
    },
  ) {}

  private notReady(): never {
    throw new Error(
      `TorobPriceProvider is not implemented yet (baseUrl=${this.config.baseUrl || "unset"}). Set PRICE_PROVIDER=mock.`,
    );
  }

  async searchProducts(): Promise<ProductMatch[]> {
    return this.notReady();
  }
  async getProduct(): Promise<Product | null> {
    return this.notReady();
  }
  async findByBarcode(): Promise<Product | null> {
    return this.notReady();
  }
  async getOffers(): Promise<Offer[]> {
    return this.notReady();
  }
  async getAlternatives(): Promise<ProductWithSummary[]> {
    return this.notReady();
  }
  async listFeatured(): Promise<Product[]> {
    return this.notReady();
  }
}
