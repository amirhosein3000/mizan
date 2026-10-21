// Fuzzy product matching: free text (typed, spoken, or extracted by the vision
// model) -> ranked catalog products with a 0..1 confidence.
import { normalizeText, STOP_WORDS, tokenize } from "./text";
import type { Product, ProductMatch } from "./price/types";

interface Indexed {
  product: Product;
  tokens: Set<string>;
  modelTokens: string[];
  brandTokens: Set<string>;
  compact: string;
}

function meaningful(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

/**
 * Do two tokens match? Exact, or one is the other plus a pure-letter unit
 * suffix ("256" ~ "256gb", "8" ~ "8gb") — but never "a5" ~ "a56".
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  if (short.length < 2 || !long.startsWith(short)) return false;
  const rest = long.slice(short.length);
  return /^\d+$/.test(short) && /^\p{L}+$/u.test(rest) && rest.length <= 3;
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice coefficient on character bigrams. */
export function dice(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) ?? 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

export function indexProducts(products: Product[]): Indexed[] {
  return products.map((product) => {
    const all = meaningful(
      tokenize([product.nameEn, product.nameFa, product.brand, product.brandFa, product.model].join(" ")),
    );
    const modelTokens = meaningful(tokenize(product.model));
    return {
      product,
      tokens: new Set(all),
      modelTokens,
      brandTokens: new Set(tokenize(`${product.brand} ${product.brandFa}`)),
      compact: normalizeText(`${product.brand} ${product.model}`).replace(/ /g, ""),
    };
  });
}

function scoreOne(queryTokens: string[], queryCompact: string, item: Indexed): number {
  if (queryTokens.length === 0) return 0;
  let hit = 0;
  for (const q of queryTokens) {
    for (const t of item.tokens) {
      if (tokensMatch(q, t)) {
        hit++;
        break;
      }
    }
  }
  const queryCoverage = hit / queryTokens.length;
  // How much of the product's own model string the query explains — this is
  // what separates "A56 128GB" from "A56 256GB".
  let modelHit = 0;
  for (const m of item.modelTokens) {
    if (queryTokens.some((q) => tokensMatch(q, m))) modelHit++;
  }
  const modelCoverage = item.modelTokens.length ? modelHit / item.modelTokens.length : 0;
  const brandHit = queryTokens.some((q) => item.brandTokens.has(q)) ? 1 : 0;
  const fuzzy = dice(queryCompact, item.compact);
  // Typos and vision OCR noise are handled by the dice term.
  return Math.min(1, 0.45 * queryCoverage + 0.3 * modelCoverage + 0.1 * brandHit + 0.15 * fuzzy);
}

export function searchIndex(index: Indexed[], query: string, limit = 10): ProductMatch[] {
  const queryTokens = meaningful(tokenize(query));
  const queryCompact = normalizeText(query).replace(/ /g, "");
  if (queryTokens.length === 0) return [];
  return index
    .map((item) => ({ product: item.product, score: scoreOne(queryTokens, queryCompact, item) }))
    .filter((m) => m.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export type MatchConfidence = "high" | "medium" | "low";

/**
 * Decide whether to jump straight to the top match or ask the user to pick.
 * High = clearly the best and a strong score; otherwise show top candidates.
 */
export function matchConfidence(matches: ProductMatch[]): MatchConfidence {
  if (matches.length === 0) return "low";
  const [first, second] = matches;
  const margin = second ? first.score - second.score : first.score;
  if (first.score >= 0.75 && margin >= 0.08) return "high";
  if (first.score >= 0.5) return "medium";
  return "low";
}
