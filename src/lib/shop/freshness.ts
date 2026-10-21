// How much to trust a listed price, based on when the shop last changed it.
// A listed price is NOT a confirmed price and says nothing about stock; the UI
// keeps the three apart (see PriceTruth in components).
import { formatNumber } from "../format";

export type Freshness = "fresh" | "recent" | "stale" | "old" | "unknown";

const DAY = 86_400_000;

export function priceFreshness(changedAt: number | null | undefined, now = Date.now()): Freshness {
  if (!changedAt) return "unknown";
  const days = (now - changedAt) / DAY;
  if (days <= 10) return "fresh";
  if (days <= 30) return "recent";
  if (days <= 90) return "stale";
  return "old";
}

/** «۵ روز پیش», «۳ ماه پیش», «بیش از یک سال پیش». */
export function ageLabel(changedAt: number, now = Date.now()): string {
  const days = Math.max(0, Math.floor((now - changedAt) / DAY));
  if (days < 1) return "امروز";
  if (days === 1) return "دیروز";
  if (days < 30) return `${formatNumber(days)} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${formatNumber(months)} ماه پیش`;
  return "بیش از یک سال پیش";
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: "قیمت تازه",
  recent: "نسبتاً تازه",
  stale: "قیمت قدیمی",
  old: "خیلی قدیمی",
  unknown: "زمان ثبت نامعلوم",
};

/** 0..1 — how likely the listed price still holds. Used for ranking and the call simulator. */
export function freshnessWeight(f: Freshness): number {
  return { fresh: 1, recent: 0.8, stale: 0.5, old: 0.25, unknown: 0.4 }[f];
}
