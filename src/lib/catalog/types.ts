// Catalog contract (Torob challenge dataset). Shared by server and client.
// Feature code depends on these types and the Catalog interface only — never on
// the SQLite implementation (see getCatalog() in ./index.ts).
import type { WeekHours } from "../shop/hours";

/** Coarse product family, used for buying checklists and fallback icons. */
export type ProductKind = "mobile" | "laptop" | "appliance" | "other";

export interface PriceSummary {
  min: number;
  median: number;
  max: number;
  /** Number of offers with a usable listed price. */
  count: number;
}

export interface Product {
  id: string;
  /** Persian title from the dataset. */
  title: string;
  brand: string | null;
  /** Dataset category name, e.g. «گوشی موبایل». */
  category: string;
  kind: ProductKind;
  model: string | null;
  images: string[];
  /** Number of shops listing it (offers). */
  offerCount: number;
  /** Summary of LISTED prices across Tehran shops in the dataset. */
  price: PriceSummary | null;
  /** Most recent listed-price change, epoch ms. */
  lastChange: number | null;
}

export interface ProductDetail extends Product {
  specs: [string, string][];
}

export type TorobPay = "none" | "unknown" | "in_person";

export interface PaymentOption {
  provider: string;
  /** Seller declared it works in the shop (vs. unknown channel, maybe online only). */
  inPerson: boolean;
}

export interface Shop {
  id: string;
  name: string;
  /** False for the ~98% of shops whose name was replaced in the public dataset. */
  nameReal: boolean;
  address: string | null;
  /** Neighbourhood label from the dataset, e.g. «شیخ هادی». */
  area: string | null;
  lat: number;
  lon: number;
  phone: string | null;
  /** Instagram profile URL (only the ~22 shops that kept their real name). */
  instagram: string | null;
  website: string | null;
  categories: string[];
  hours: WeekHours | null;
  payments: PaymentOption[];
  installment: boolean;
  torobPay: TorobPay;
  fastDelivery: boolean | null;
  mall: string | null;
  floor: string | null;
  unit: string | null;
  /** Products listed by this shop in the dataset (0 = only its activity categories are known). */
  offerCount: number;
}

export interface Offer {
  productId: string;
  shopId: string;
  /** Title the seller registered for this product. */
  title: string;
  description: string | null;
  /** Listed price in Toman; null when the shop listed no usable price. */
  price: number | null;
  /** When the listed price last changed, epoch ms. */
  changedAt: number | null;
  warranty: string | null;
  warrantyMonths: number | null;
}

export interface Facet {
  value: string;
  count: number;
}

export interface SearchFilters {
  category?: string | null;
  brand?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
}

export interface SearchResult {
  products: Product[];
  /** Matches before category/brand/price filters. */
  total: number;
  facets: { categories: Facet[]; brands: Facet[] };
  /** Price percentiles of the matches, for budget suggestions. */
  priceBands: number[];
}

export interface Area {
  name: string;
  lat: number;
  lon: number;
  shops: number;
}

export interface CatalogStats {
  shops: number;
  products: number;
  offers: number;
  /** Latest price change in the snapshot, epoch ms. */
  snapshotAt: number;
}

export interface Catalog {
  search(query: string, filters?: SearchFilters, limit?: number): SearchResult;
  getProduct(id: string): ProductDetail | null;
  getProducts(ids: string[]): Product[];
  /** All offers for a product with their shops. */
  offersFor(productId: string): { offer: Offer; shop: Shop }[];
  getShop(id: string): Shop | null;
  getShops(ids: string[]): Shop[];
  /** What a shop lists, optionally filtered by text. */
  shopOffers(shopId: string, query?: string, limit?: number): { offer: Offer; product: Product }[];
  /** Shops that declare this activity category but list no offer for the given product. */
  categoryShops(category: string, excludeShopIds: string[], limit?: number): Shop[];
  /** Comparable products in the same category with a similar price. */
  similar(productId: string, limit?: number): Product[];
  /** Shops near a point (any category), optionally limited to those declaring a category. */
  shopsNear(center: { lat: number; lon: number }, radiusM: number, opts?: { category?: string; limit?: number }): Shop[];
  areas(): Area[];
  stats(): CatalogStats;
  /** Popular, well-covered products for the home screen. */
  featured(limit?: number): Product[];
}

const IMAGE_BASE = "https://image.torob.com/base/images/";

/** Catalog stores image suffixes; expand to a full URL. */
export function imageUrl(stored: string): string {
  return stored.startsWith("http") ? stored : IMAGE_BASE + stored;
}

export function productKind(category: string): ProductKind {
  if (category === "گوشی موبایل") return "mobile";
  if (/لپ.?تاپ|نوت.?بوک/.test(category)) return "laptop";
  if (/یخچال|لباسشویی|ظرفشویی|تلویزیون|کولر|جارو|اجاق|مایکروویو|ماشین|آبگرمکن|پکیج/.test(category)) return "appliance";
  return "other";
}
