// Rank the shops that (may) have a product for THIS shopper, and explain why.
// Pure: the API feeds it catalog rows + call confirmations; tests feed it fixtures.
import type { Offer, Shop } from "../catalog/types";
import { formatNumber, formatTomanShort } from "../format";
import type { ShopperContext } from "./context";
import { ageLabel, freshnessWeight, priceFreshness, type Freshness } from "./freshness";
import { distanceM, travelEstimate } from "./geo";
import { openStatus, type OpenStatus } from "./hours";

/** What a call / the seller / a shopper confirmed about stock and price. */
export interface Confirmation {
  shopId: string;
  productId: string;
  available: boolean | null;
  price: number | null;
  at: number;
  source: "call" | "seller" | "user";
  holdUntil?: number | null;
  note?: string | null;
}

export interface Reason {
  tone: "good" | "info" | "warn";
  text: string;
}

export interface RankedShop {
  shop: Shop;
  /** null = the shop only declares the product's category; stock unknown. */
  offer: Offer | null;
  confirmation: Confirmation | null;
  distanceM: number | null;
  travel: ReturnType<typeof travelEstimate> | null;
  status: OpenStatus;
  freshness: Freshness;
  /** Confirmed price if any, else the listed price. */
  price: number | null;
  priceSource: "confirmed" | "listed" | "none";
  score: number;
  reasons: Reason[];
}

export interface RankInput {
  shop: Shop;
  offer: Offer | null;
  confirmation?: Confirmation | null;
}

export type HiddenReason = "radius" | "installment" | "torobPay" | "closed" | "warranty" | "fastDelivery" | "budget" | "unavailable";

export const HIDDEN_LABEL: Record<HiddenReason, string> = {
  radius: "خارج از محدوده",
  installment: "بدون خرید قسطی",
  torobPay: "بدون ترب‌پی حضوری",
  closed: "بسته در زمان مراجعه",
  warranty: "بدون گارانتی ثبت‌شده",
  fastDelivery: "بدون ارسال فوری",
  budget: "بالاتر از بودجه",
  unavailable: "گفتن ناموجوده",
};

export interface RankResult {
  shops: RankedShop[];
  hidden: Partial<Record<HiddenReason, number>>;
}

function hiddenReason(x: RankedShop, ctx: ShopperContext): HiddenReason | null {
  if (x.confirmation?.available === false) return "unavailable";
  if (ctx.radiusKm && x.distanceM !== null && x.distanceM > ctx.radiusKm * 1000) return "radius";
  if (ctx.installment && !x.shop.installment) return "installment";
  if (ctx.torobPayInPerson && x.shop.torobPay !== "in_person") return "torobPay";
  if (ctx.openOnly && x.status.state === "closed") return "closed";
  if (ctx.warranty && !x.offer?.warranty) return "warranty";
  if (ctx.fastDelivery && x.shop.fastDelivery !== true) return "fastDelivery";
  if (ctx.budgetMax && x.price && x.price > ctx.budgetMax) return "budget";
  return null;
}

export function rankShops(inputs: RankInput[], ctx: ShopperContext, now = Date.now()): RankResult {
  const at = ctx.visitAt ?? now;
  const base: RankedShop[] = inputs.map(({ shop, offer, confirmation = null }) => {
    const d = ctx.origin ? distanceM(ctx.origin, shop) : null;
    const confirmedPrice = confirmation?.available !== false ? confirmation?.price ?? null : null;
    const price = confirmedPrice ?? offer?.price ?? null;
    return {
      shop,
      offer,
      confirmation,
      distanceM: d,
      travel: d !== null ? travelEstimate(d) : null,
      status: openStatus(shop.hours, at),
      freshness: priceFreshness(offer?.changedAt, now),
      price,
      priceSource: confirmedPrice ? "confirmed" : offer?.price ? "listed" : "none",
      score: 0,
      reasons: [],
    };
  });

  const hidden: Partial<Record<HiddenReason, number>> = {};
  const visible = base.filter((x) => {
    const r = hiddenReason(x, ctx);
    if (r) hidden[r] = (hidden[r] ?? 0) + 1;
    return !r;
  });

  const prices = visible.map((x) => x.price).filter((p): p is number => !!p);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const dists = visible.map((x) => x.distanceM).filter((d): d is number => d !== null);
  const minDist = dists.length ? Math.min(...dists) : null;

  for (const x of visible) {
    const sPrice = x.price && minPrice ? minPrice / x.price : 0.35;
    const sDist = x.distanceM !== null ? 1 / (1 + x.distanceM / 1500) : 0.5;
    const st = x.status;
    const sOpen =
      st.state === "open"
        ? (st.closesIn ?? 999) < 30
          ? 0.6
          : 1
        : st.state === "unknown"
          ? 0.55
          : st.opensAt?.dayOffset === 0
            ? 0.25 // closed now, opens later today
            : 0.1;
    const sFresh = x.confirmation?.available ? 1 : freshnessWeight(x.freshness);
    let score = 0.34 * sPrice + 0.26 * sDist + 0.2 * sOpen + 0.12 * sFresh;
    if (x.confirmation?.available) score += 0.25;
    if (x.offer?.warrantyMonths) score += 0.03;
    if (x.shop.installment) score += 0.02;
    if (!x.offer) score *= 0.6;
    x.score = score;

    // ---- reasons, most persuasive first ----
    const r: Reason[] = [];
    if (x.confirmation?.available) {
      r.push({ tone: "good", text: x.confirmation.source === "user" ? "موجودی رو خریدارها تأیید کردن" : "موجودی تلفنی تأیید شد" });
    }
    if (x.price && minPrice && x.price === minPrice && prices.length > 1) r.push({ tone: "good", text: "ارزون‌ترین" });
    else if (x.price && minPrice && prices.length > 1 && x.price > minPrice * 1.01) {
      r.push({ tone: "info", text: `${formatTomanShort(x.price - minPrice)} گرون‌تر از ارزون‌ترین` });
    }
    if (x.distanceM !== null && minDist !== null && x.distanceM === minDist && dists.length > 1) r.push({ tone: "good", text: "نزدیک‌ترین" });
    if (st.state === "open") r.push({ tone: (st.closesIn ?? 999) < 45 ? "warn" : "good", text: st.label });
    else if (st.state === "closed") r.push({ tone: "warn", text: st.label });
    else r.push({ tone: "info", text: "ساعت کاری نامعلوم" });
    if (!x.offer) r.push({ tone: "info", text: "این دسته رو می‌فروشه؛ موجودی این مدل ثبت نشده" });
    else if (!x.confirmation && x.offer.changedAt) {
      const label = ageLabel(x.offer.changedAt, now);
      if (x.freshness === "fresh") r.push({ tone: "good", text: `قیمت ${label} به‌روز شده` });
      else if (x.freshness === "stale" || x.freshness === "old") r.push({ tone: "warn", text: `قیمت ${label} ثبت شده` });
    }
    if (x.shop.installment) {
      r.push({ tone: "info", text: `قسطی: ${x.shop.payments.map((p) => p.provider).slice(0, 2).join("، ")}` });
    }
    if (x.offer?.warrantyMonths) r.push({ tone: "info", text: `${formatNumber(x.offer.warrantyMonths)} ماه گارانتی` });
    x.reasons = r;
  }

  visible.sort((a, b) => b.score - a.score);
  return { shops: visible, hidden };
}

/** One-line «why this shop» for the top pick, used by the agent summary. */
export function whyLine(x: RankedShop): string {
  return x.reasons
    .filter((r) => r.tone !== "warn")
    .slice(0, 3)
    .map((r) => r.text)
    .join("، ");
}
