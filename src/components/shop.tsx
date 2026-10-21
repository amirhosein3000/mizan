"use client";
// Shop building blocks. The one rule here: a LISTED price, WHEN it was listed,
// and CONFIRMED stock are three different facts — never blur them.
import Link from "next/link";
import { Building2, Check, CircleHelp, Footprints, Car, MapPinned, PhoneCall, ShieldCheck } from "lucide-react";
import type { Shop } from "@/lib/catalog/types";
import { formatNumber, formatToman, formatTomanShort, timeAgo, toFaDigits } from "@/lib/format";
import { ageLabel } from "@/lib/shop/freshness";
import { formatDistance, inTrafficZone, mapLinks } from "@/lib/shop/geo";
import { hhmm, type OpenStatus } from "@/lib/shop/hours";
import type { Confirmation, RankedShop, Reason } from "@/lib/shop/rank";
import { useNow } from "@/lib/use-now";
import { Pill, type Tone } from "./ui";

export function OpenPill({ status }: { status: OpenStatus }) {
  const tone: Tone = status.state === "open" ? ((status.closesIn ?? 999) < 45 ? "fair" : "good") : status.state === "closed" ? "high" : "muted";
  return (
    <Pill tone={tone}>
      <span className={`size-1.5 rounded-full ${status.state === "open" ? "bg-good" : status.state === "closed" ? "bg-high" : "bg-muted"}`} />
      {status.label}
    </Pill>
  );
}

const SOURCE_LABEL: Record<Confirmation["source"], string> = {
  call: "تأیید تلفنی میزان",
  seller: "تأیید خود فروشنده",
  user: "گزارش خریدار",
};

/** Price + where it comes from + stock knowledge, in that order. */
export function PriceTruth({ x, compact = false }: { x: Pick<RankedShop, "price" | "priceSource" | "offer" | "confirmation" | "freshness">; compact?: boolean }) {
  const c = x.confirmation;
  return (
    <div className="text-end">
      <div className={`tabular font-black ${compact ? "text-[15px]" : "text-[17px]"} ${x.priceSource === "confirmed" ? "text-good" : "text-ink"}`}>
        {x.price ? formatTomanShort(x.price) : "—"}
        {x.price ? <span className="text-[11px] font-bold text-muted"> تومان</span> : null}
      </div>
      {c?.available ? (
        <div className="text-[11px] font-bold text-good">
          <Check className="inline size-3" /> {SOURCE_LABEL[c.source]}، {timeAgo(c.at)}
        </div>
      ) : x.offer?.price && x.offer.changedAt ? (
        <div className={`text-[11px] ${x.freshness === "stale" || x.freshness === "old" ? "font-bold text-fair" : "text-info"}`}>
          قیمت ثبت‌شده، {ageLabel(x.offer.changedAt)}
        </div>
      ) : x.offer ? (
        <div className="text-[11px] text-muted">قیمت ثبت نشده</div>
      ) : (
        <div className="text-[11px] text-muted">این مدل رو ثبت نکرده</div>
      )}
    </div>
  );
}

export function StockLine({ c }: { c: Confirmation | null }) {
  const now = useNow();
  if (c?.available) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-good">
        <Check className="size-3.5" /> موجود
        {c.holdUntil && c.holdUntil > now ? `، نگه می‌دارن تا ${hhmmFromTs(c.holdUntil)}` : ""}
      </span>
    );
  }
  if (c?.available === false) return <span className="text-[12px] font-bold text-high">ناموجود ({timeAgo(c.at)})</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <CircleHelp className="size-3.5" /> موجودی تأیید نشده
    </span>
  );
}

export function hhmmFromTs(ts: number): string {
  const min = Math.floor((ts + 3.5 * 3600_000) / 60_000) % 1440;
  return hhmm(min);
}

/** «پاساژ علاءالدین ۲، طبقه ۵، واحد ۵۲۱» — what you need at the door. */
export function AddressLine({ shop, full = false }: { shop: Shop; full?: boolean }) {
  const parts = [shop.mall, shop.floor ? `طبقه ${shop.floor}` : null, shop.unit].filter(Boolean);
  const head = toFaDigits(parts.join("، "));
  const address = shop.address ? toFaDigits(shop.address) : null;
  // The full address usually already spells out the mall / floor / unit; don't say it twice.
  const repeats = !!address && !!shop.mall && address.includes(toFaDigits(shop.mall));
  const showAddress = !!address && (!parts.length || (full && !repeats));
  return (
    <div className="flex items-start gap-1.5 text-[12.5px] leading-5 text-muted">
      <Building2 className="mt-0.5 size-3.5 shrink-0" />
      <span className="min-w-0">
        {full && repeats ? (
          <b className="font-bold text-ink">{address}</b>
        ) : (
          <>
            {parts.length ? <b className="font-bold text-ink">{head}</b> : null}
            {showAddress ? <span className="block">{address}</span> : null}
          </>
        )}
      </span>
    </div>
  );
}

export function TravelLine({ x }: { x: Pick<RankedShop, "distanceM" | "travel"> }) {
  if (x.distanceM === null || !x.travel) return null;
  const Icon = x.travel.mode === "walk" ? Footprints : Car;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
      <Icon className="size-3.5" />
      {formatDistance(x.distanceM)}، {x.travel.label}
    </span>
  );
}

const REASON_TONE: Record<Reason["tone"], Tone> = { good: "good", info: "muted", warn: "fair" };

export function Reasons({ reasons, max = 4 }: { reasons: Reason[]; max?: number }) {
  // Opening status, confirmed stock and price age have their own lines on the card; skip them here.
  const list = reasons.filter((r) => !/^باز|^بسته|ساعت کاری|^موجودی|^قیمت .*(به‌روز|ثبت) شده/.test(r.text)).slice(0, max);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((r) => (
        <Pill key={r.text} tone={REASON_TONE[r.tone]}>
          {r.text}
        </Pill>
      ))}
    </div>
  );
}

export function ShopCard({
  x,
  productId,
  selected,
  onToggle,
  rank,
}: {
  x: RankedShop;
  productId?: string;
  selected?: boolean;
  onToggle?: () => void;
  rank?: number;
}) {
  const href = `/s/${encodeURIComponent(x.shop.id)}${productId ? `?p=${encodeURIComponent(productId)}` : ""}`;
  return (
    <div className={`rounded-[var(--radius-card)] bg-surface p-3.5 ring-2 transition-colors ${selected ? "ring-brand" : "ring-transparent"}`}>
      <div className="flex items-start gap-3">
        {onToggle && (
          <button
            onClick={onToggle}
            aria-pressed={selected}
            aria-label={selected ? "حذف از تماس" : "اضافه به تماس"}
            className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 ${selected ? "border-brand bg-brand text-white" : "border-line text-transparent"}`}
          >
            <Check className="size-4" strokeWidth={3} />
          </button>
        )}
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {rank !== undefined && rank < 3 && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-black text-brand">
                    {formatNumber(rank + 1)}
                  </span>
                )}
                <span className="truncate text-[15px] font-extrabold">{x.shop.name}</span>
              </div>
              <div className="mt-1">
                <AddressLine shop={x.shop} />
              </div>
            </div>
            <PriceTruth x={x} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <OpenPill status={x.status} />
            <TravelLine x={x} />
            <StockLine c={x.confirmation} />
          </div>
          <div className="mt-2">
            <Reasons reasons={x.reasons} />
          </div>
        </Link>
      </div>
    </div>
  );
}

export function MapButtons({ shop }: { shop: Shop }) {
  const links = mapLinks(shop);
  const cls = "flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[13px] font-bold active:bg-line";
  return (
    <div className="flex gap-2">
      <a href={links.neshan} target="_blank" rel="noreferrer" className={cls}>
        <MapPinned className="size-4" /> نشان
      </a>
      <a href={links.balad} target="_blank" rel="noreferrer" className={cls}>
        <MapPinned className="size-4" /> بلد
      </a>
      <a href={links.google} target="_blank" rel="noreferrer" className={cls}>
        <MapPinned className="size-4" /> گوگل
      </a>
    </div>
  );
}

export function CallSelfButton({ shop }: { shop: Shop }) {
  if (!shop.phone) return null;
  return (
    <a
      href={`tel:${shop.phone.replace(/[^\d۰-۹+]/g, "")}`}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[13px] font-bold active:bg-line"
    >
      <PhoneCall className="size-4" /> خودم زنگ می‌زنم
    </a>
  );
}

export function PaymentBadges({ shop }: { shop: Shop }) {
  if (!shop.payments.length) return <span className="text-[12px] text-muted">خرید قسطی ثبت نکرده</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shop.payments.map((p) => (
        <Pill key={p.provider} tone={p.inPerson ? "good" : "muted"}>
          {p.provider}
          {p.inPerson ? "، حضوری" : "، نوع پذیرش نامشخص"}
        </Pill>
      ))}
    </div>
  );
}

export function TrafficHint({ shop }: { shop: Shop }) {
  if (!inTrafficZone(shop)) return null;
  return (
    <p className="flex items-start gap-1.5 rounded-2xl bg-fair-soft px-3 py-2 text-[12px] leading-5 text-fair">
      <ShieldCheck className="mt-0.5 size-4 shrink-0" />
      این آدرس احتمالاً داخل محدوده‌ی طرح ترافیکه؛ با مترو یا تاکسی راحت‌تری.
    </p>
  );
}

export function priceLabel(n: number | null): string {
  return n ? formatToman(n) : "—";
}
