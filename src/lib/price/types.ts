// The price-data contract. Feature code depends ONLY on these types and the
// PriceProvider interface — never on a concrete provider.

export type CategoryId = "mobile" | "laptop" | "appliance" | "grocery";

export interface Product {
  id: string;
  nameFa: string;
  nameEn: string;
  brand: string;
  brandFa: string;
  /** Short model string used for matching, e.g. "Galaxy A56 5G 256GB". */
  model: string;
  category: CategoryId;
  /** Persian sub-category label, e.g. «یخچال و فریزر». */
  subcategory: string;
  barcode?: string;
  specs: Record<string, string>;
  /** Consumer price printed on the package (groceries) — «قیمت مصرف‌کننده». */
  printedPrice?: number;
  imageUrl?: string | null;
}

export interface Offer {
  sellerId: string;
  sellerName: string;
  city: string;
  /** Price in Toman. */
  price: number;
  guarantee?: string;
  inStock: boolean;
  /** ISO date of last price update. */
  updatedAt: string;
  url?: string | null;
}

export interface PriceSummary {
  min: number;
  median: number;
  max: number;
  mean: number;
  /** Number of in-stock sellers. */
  count: number;
  cheapestSeller?: string;
}

export interface ProductMatch {
  product: Product;
  /** 0..1 match confidence. */
  score: number;
}

export interface ProductWithSummary {
  product: Product;
  summary: PriceSummary | null;
}

export interface PriceProvider {
  readonly name: "mock" | "torob";
  /** Free-text search (Persian or English). Results sorted by score desc. */
  searchProducts(query: string, opts?: { limit?: number; category?: CategoryId }): Promise<ProductMatch[]>;
  getProduct(id: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  getOffers(productId: string): Promise<Offer[]>;
  /** Comparable / cheaper products in the same sub-category. */
  getAlternatives(productId: string, opts?: { limit?: number }): Promise<ProductWithSummary[]>;
  /** A few popular products, used for demo pickers and the empty home state. */
  listFeatured(limit?: number): Promise<Product[]>;
}
