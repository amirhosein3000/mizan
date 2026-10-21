// Client-safe types for agent/shop API responses.
import type { Product } from "../catalog/types";

export interface ShopStats {
  /** Shops passing the shopper's filters. */
  shops: number;
  openNow: number;
  installment: number;
  nearestM: number | null;
  cheapest: number | null;
  confirmed: number;
}

export interface ProductWithStats {
  product: Product;
  stats: ShopStats;
  /** Shops hidden by the shopper's filters. */
  hiddenCount: number;
}
