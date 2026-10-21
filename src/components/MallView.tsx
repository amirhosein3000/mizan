"use client";
// «پاساژنما»: one passage, drawn floor by floor, with every shop in it that lists the
// product — price, open/closed, confirmed — so the shopper sees that a single trip
// covers several shops, and can have Mizan call all of them at once.
import { useState } from "react";
import { Building2, Check, DoorOpen, PhoneCall } from "lucide-react";
import { formatNumber, formatTomanShort } from "@/lib/format";
import type { MallGroup } from "@/lib/shop/mall";
import type { RankedShop } from "@/lib/shop/rank";
import { formatDistance } from "@/lib/shop/geo";

const dot = (s: RankedShop) =>
  s.confirmation?.available ? "bg-good" : s.status.state === "open" ? "bg-good" : s.status.state === "closed" ? "bg-high" : "bg-muted/50";

export function MallView({
  groups,
  selected,
  onToggle,
  onCallAll,
}: {
  groups: MallGroup[];
  selected: string[];
  onToggle: (shopId: string) => void;
  onCallAll: (shopIds: string[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const g = groups[Math.min(index, groups.length - 1)];
  if (!g) return null;
  const cheapest = g.minPrice;
  const distances = g.shops.map((s) => s.distanceM).filter((d): d is number => d !== null);
  // Who Mizan would call: open (or unknown hours) first, then cheapest; at most five.
  const callIds = [...g.shops]
    .sort((a, b) => Number(a.status.state === "closed") - Number(b.status.state === "closed") || (a.price ?? Infinity) - (b.price ?? Infinity))
    .slice(0, 5)
    .map((s) => s.shop.id);

  return (
    <section className="rise overflow-hidden rounded-[var(--radius-card)] bg-surface">
      <div className="bg-gradient-to-br from-[#2e2378] via-brand to-[#7a55f0] p-4 text-white">
        <div className="flex items-center gap-1.5 text-[12px] font-bold opacity-90">
          <Building2 className="size-4" /> پاساژنما
        </div>
        <div className="mt-1 text-[16px] font-black leading-7">
          {g.name}: {formatNumber(g.shops.length)} فروشگاه این مدل رو دارن
        </div>
        <div className="text-[12.5px] leading-6 opacity-90">
          {cheapest && g.maxPrice ? `از ${formatTomanShort(cheapest)} تا ${formatTomanShort(g.maxPrice)}؛ ` : ""}
          {g.open ? `${formatNumber(g.open)} تا الان بازن؛ ` : ""}
          یه بار برو، همه رو طبقه‌به‌طبقه مقایسه کن.
          {distances.length ? ` (${formatDistance(Math.min(...distances))} تا تو)` : ""}
        </div>
        {groups.length > 1 && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4">
            {groups.slice(0, 4).map((m, i) => (
              <button
                key={m.name}
                onClick={() => setIndex(i)}
                className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-bold ${i === index ? "bg-white text-brand" : "bg-white/15 text-white"}`}
              >
                {m.name} ({formatNumber(m.shops.length)})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The building: roof, floors top to bottom, entrance. */}
      <div className="px-3 pb-3 pt-2">
        <div className="mx-6 h-2 rounded-t-xl bg-line" aria-hidden />
        <div className="rounded-xl border-2 border-line">
          {g.floors.map((f, fi) => (
            <div key={f.label} className={`flex items-stretch gap-2 p-2 ${fi ? "border-t-2 border-dashed border-line" : ""}`}>
              <div className="flex w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-center text-[11px] font-extrabold leading-4 text-muted">
                {f.label}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                {f.shops.map((s) => {
                  const on = selected.includes(s.shop.id);
                  const best = !!cheapest && s.price === cheapest;
                  return (
                    <button
                      key={s.shop.id}
                      onClick={() => onToggle(s.shop.id)}
                      aria-pressed={on}
                      className={`flex max-w-full items-center gap-1.5 rounded-xl px-2 py-1.5 text-start ring-2 transition-colors ${
                        on ? "bg-brand-soft ring-brand" : best ? "bg-good-soft ring-good/40" : "bg-surface-2 ring-transparent"
                      }`}
                    >
                      <span className={`size-2 shrink-0 rounded-full ${dot(s)}`} />
                      <span className="min-w-0">
                        <span className="block max-w-[118px] truncate text-[12px] font-bold">{s.shop.name}</span>
                        <span className="tabular block text-[11px] text-muted">
                          {s.price ? formatTomanShort(s.price) : "بدون قیمت"}
                          {s.priceSource === "confirmed" ? " ✓" : ""}
                          {best ? "، ارزون‌ترین" : ""}
                        </span>
                      </span>
                      {on && <Check className="size-3.5 shrink-0 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <span className="-mt-0.5 flex items-center gap-1 rounded-b-lg bg-line px-3 py-0.5 text-[10.5px] font-bold text-muted">
            <DoorOpen className="size-3" /> ورودی
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-good" /> باز</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-high" /> بسته</span>
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-muted/50" /> ساعت نامعلوم</span>
          <span>روی هر فروشگاه بزنی، برای تماس انتخاب می‌شه.</span>
        </div>
        <button
          onClick={() => onCallAll(callIds)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink text-[14px] font-extrabold text-white active:opacity-90"
        >
          <PhoneCall className="size-4.5" /> میزان به {formatNumber(callIds.length)} فروشگاهِ همین پاساژ زنگ بزنه
        </button>
      </div>
    </section>
  );
}
