// Fuzzy matching helpers: how well a free-text reading (typed, spoken, or read off
// a photo by the vision model) matches a catalog product title, 0..1.
import { normalizeText, STOP_WORDS, tokenize } from "./text";

export interface ScoredMatch<P> {
  product: P;
  /** 0..1 */
  score: number;
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

/**
 * Score a reading against a product title. Token coverage (with unit-suffix
 * tolerance: "256" ~ "256gb") plus a character-bigram term for OCR noise.
 */
export function scoreMatch(query: string, title: string): number {
  const q = meaningful(tokenize(query));
  if (!q.length) return 0;
  const t = meaningful(tokenize(title));
  let hit = 0;
  for (const a of q) if (t.some((b) => tokensMatch(a, b))) hit++;
  const cov = hit / q.length;
  // How much of the title the query explains separates "A56 128GB" from "A56 256GB".
  const titleCov = t.length ? t.filter((b) => q.some((a) => tokensMatch(a, b))).length / t.length : 0;
  const fuzzy = dice(normalizeText(query).replace(/ /g, ""), normalizeText(title).replace(/ /g, ""));
  return Math.min(1, 0.6 * cov + 0.2 * titleCov + 0.2 * fuzzy);
}

export type MatchConfidence = "high" | "medium" | "low";

/**
 * Decide whether to jump straight to the top match or ask the user to pick.
 * High = clearly the best and a strong score; otherwise show top candidates.
 */
export function matchConfidence(matches: ScoredMatch<unknown>[]): MatchConfidence {
  if (matches.length === 0) return "low";
  const [first, second] = matches;
  const margin = second ? first.score - second.score : first.score;
  if (first.score >= 0.75 && margin >= 0.08) return "high";
  if (first.score >= 0.5) return "medium";
  return "low";
}
