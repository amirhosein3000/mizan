import type { Offer, PriceSummary } from "./types";

export function summarizeOffers(offers: Offer[]): PriceSummary | null {
  const live = offers.filter((o) => o.inStock && o.price > 0);
  if (live.length === 0) return null;
  const prices = live.map((o) => o.price).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
  const cheapest = live.reduce((a, b) => (b.price < a.price ? b : a));
  return {
    min: prices[0],
    median,
    max: prices[prices.length - 1],
    mean: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    count: live.length,
    cheapestSeller: cheapest.sellerName,
  };
}
