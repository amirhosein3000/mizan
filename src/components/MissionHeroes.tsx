"use client";
// The payoff of a mission: what Mizan saved you (report card), a card to show the
// shopkeeper at the counter, and one-tap sharing of the plan.
import { useState } from "react";
import { BadgeCheck, Clock, Footprints, Share2, Store, Wallet, X } from "lucide-react";
import type { MissionView } from "@/lib/agent/missions";
import { formatNumber, formatToman, formatTomanShort, toFaDigits } from "@/lib/format";
import { mapLinks } from "@/lib/shop/geo";
import type { RankedShop } from "@/lib/shop/rank";
import { hhmmFromTs } from "./shop";
import { Portal } from "./Portal";

/** Minutes a shopper spends on one call themselves: find the number, wait, ask, note it. */
const MINUTES_PER_CALL = 3;

export function missionReport(m: MissionView, best: RankedShop) {
  const done = m.calls.filter((c) => c.state === "done" && c.result);
  const deadEnds = done.filter((c) => c.result!.outcome !== "answered" || c.result!.available === false);
  // A dead end you'd otherwise have found out about at the door: the round trip to that shop.
  const tripMinutes = deadEnds.reduce((sum, c) => {
    const s = m.shops.find((x) => x.shop.id === c.shop.id);
    return sum + (s?.travel ? s.travel.minutes * 2 : 0);
  }, 0);
  const median = m.product?.price?.median ?? null;
  const confirmedPrices = done.map((c) => c.result!.price).filter((p): p is number => !!p);
  const worst = confirmedPrices.length ? Math.max(...confirmedPrices) : null;
  const vsMedian = median && best.price ? median - best.price : 0;
  const vsWorst = worst && best.price ? worst - best.price : 0;
  return {
    calls: done.length,
    answered: done.filter((c) => c.result!.outcome === "answered").length,
    deadEnds: deadEnds.length,
    minutesSaved: done.length * MINUTES_PER_CALL + tripMinutes,
    saved: Math.max(vsMedian, vsWorst, 0),
    savedVs: vsMedian >= vsWorst ? ("median" as const) : ("worst" as const),
  };
}

export function MissionReport({ m, best }: { m: MissionView; best: RankedShop }) {
  const r = missionReport(m, best);
  if (!r.calls) return null;
  const stats = [
    { icon: Store, value: formatNumber(r.calls), label: `تماس؛ ${formatNumber(r.answered)} جواب داد` },
    {
      icon: Footprints,
      value: formatNumber(r.deadEnds),
      label: r.deadEnds ? "مسیر بیهوده که نرفتی" : "مسیر بیهوده",
    },
    r.minutesSaved >= 60
      ? { icon: Clock, value: toFaDigits((r.minutesSaved / 60).toFixed(1).replace(/\.0$/, "")).replace(".", "٫"), label: "ساعت از وقتت آزاد شد" }
      : { icon: Clock, value: formatNumber(r.minutesSaved), label: "دقیقه از وقتت آزاد شد" },
  ];
  return (
    <section className="rise overflow-hidden rounded-[var(--radius-card)] bg-ink text-white">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <span className="text-[13px] font-extrabold">کارنامه‌ی میزان</span>
        {r.saved > 0 && (
          <span className="pop-in flex items-center gap-1 rounded-full bg-[#ffd166] px-2.5 py-1 text-[12px] font-black text-ink">
            <Wallet className="size-3.5" /> {formatTomanShort(r.saved)} کمتر
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {stats.map((s, i) => (
          <div key={s.label} className="pop-in rounded-2xl bg-white/10 px-2 py-2.5 text-center" style={{ animationDelay: `${120 + i * 110}ms` }}>
            <s.icon className="mx-auto size-4 opacity-80" />
            <div className="tabular mt-1 text-[20px] font-black leading-7">{s.value}</div>
            <div className="text-[10.5px] leading-4 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>
      {r.saved > 0 && (
        <p className="px-4 pb-3.5 text-[11.5px] leading-5 opacity-80">
          {r.savedVs === "median"
            ? `قیمت پیشنهادی ${formatTomanShort(r.saved)} زیر قیمت معمول تهرانه.`
            : `${formatTomanShort(r.saved)} ارزون‌تر از گرون‌ترین جوابی که گرفتم.`}{" "}
          زمان‌ها تقریبی‌اند: هر تماس حدود {formatNumber(MINUTES_PER_CALL)} دقیقه و رفت‌وبرگشت تا مغازه‌هایی که نداشتن.
        </p>
      )}
    </section>
  );
}

/** Four-digit reference code (easy to read aloud) shown to the shopkeeper; stable per mission. */
export function missionCode(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return toFaDigits(String(1000 + (h % 9000)));
}

/** Full-screen, high-contrast card to show at the counter. */
export function WalkInCard({ m, best, onClose }: { m: MissionView; best: RankedShop; onClose: () => void }) {
  const c = best.confirmation;
  const title = (m.product?.title ?? m.productTitle).split("|")[0].trim();
  return (
    <Portal>
      <div className="fade-in fixed inset-0 z-[60] flex flex-col bg-white text-[#0d0b1a]" role="dialog" aria-modal="true" aria-label="کارت فروشنده">
        <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <span className="text-[12px] font-bold text-muted">این صفحه رو به فروشنده نشون بده</span>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-surface-2" aria-label="بستن">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-5 px-6 text-center">
          <div className="text-[15px] font-bold text-muted">سلام، وقت بخیر 👋</div>
          <div className="text-[19px] font-black leading-9">{title}</div>
          <div className="mx-auto rounded-3xl bg-good-soft px-6 py-4">
            <div className="text-[12px] font-bold text-good">{c?.source === "seller" ? "قیمتی که از پنل فروشنده تأیید کردید" : "قیمتی که تلفنی تأیید کردید"}</div>
            <div className="tabular mt-1 text-[30px] font-black text-good">{best.price ? formatToman(best.price) : "—"}</div>
          </div>
          <div className="space-y-1 text-[14px] leading-7">
            <div className="font-bold">{best.shop.name}</div>
            {c?.at && <div className="text-muted">هماهنگی: امروز ساعت {hhmmFromTs(c.at)}</div>}
            {c?.holdUntil && <div className="font-bold text-brand">قرار شد تا ساعت {hhmmFromTs(c.holdUntil)} برام نگه دارید</div>}
          </div>
          <div className="mx-auto rounded-2xl border-2 border-dashed border-line px-5 py-2">
            <div className="text-[11px] text-muted">کد پیگیری میزان</div>
            <div className="tabular text-[28px] font-black tracking-[0.2em]">
              {missionCode(m.id)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[11px] text-muted">
          <BadgeCheck className="size-4 text-brand" /> هماهنگ‌شده با میزان، دستیار خرید حضوری
        </div>
      </div>
    </Portal>
  );
}

/** Share the plan (shop, exact address, price, navigation link) with Web Share, else copy it. */
export function SharePlanButton({ m, best }: { m: MissionView; best: RankedShop }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const s = best.shop;
    const where = [s.mall, s.floor ? `طبقه ${s.floor}` : null, s.unit].filter(Boolean).join("، ");
    const text = [
      (m.product?.title ?? m.productTitle).split("|")[0].trim(),
      `${s.name}${where ? ` — ${toFaDigits(where)}` : ""}`,
      s.address ? toFaDigits(s.address) : null,
      best.price ? `قیمت ${best.priceSource === "confirmed" ? "تأییدشده" : "ثبت‌شده"}: ${formatToman(best.price)}` : null,
      // Links keep Latin digits.
      `مسیریابی: ${mapLinks(s).neshan}`,
      "با میزان، دستیار خرید حضوری",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: s.name, text });
        return;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: nothing else to do */
    }
  }
  return (
    <button
      onClick={share}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[13.5px] font-bold active:bg-brand-soft"
    >
      <Share2 className="size-4" /> {copied ? "کپی شد" : "بفرست برای کسی"}
    </button>
  );
}
