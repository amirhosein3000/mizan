// Free text / vision reading -> best catalog matches with a 0..1 score.
import "server-only";
import { scoreMatch, type ScoredMatch } from "../match";
import { getCatalog } from "./index";
import type { Product } from "./types";

export function findMatches(query: string, limit = 3): ScoredMatch<Product>[] {
  const hits = getCatalog().search(query, {}, 12).products;
  return hits
    .map((product, i) => ({
      product,
      // Keep the catalog's relevance order as a tie-breaker.
      score: Math.min(1, scoreMatch(query, `${product.title} ${product.brand ?? ""} ${product.model ?? ""}`) + (i === 0 ? 0.05 : 0)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
