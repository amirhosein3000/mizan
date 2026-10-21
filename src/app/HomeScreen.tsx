"use client";
import Link from "next/link";
import { ChevronLeft, MapPin, PhoneCall, Scale, Search, Sparkles, Store, Zap } from "lucide-react";
import { AskBox } from "@/components/AskBox";
import { MissionRow } from "@/components/MissionRow";
import { ProductCard } from "@/components/ProductRow";
import { SectionTitle, Skeleton } from "@/components/ui";
import { isEnabled } from "@/config/features";
import type { CatalogStats } from "@/lib/catalog/types";
import type { MissionSummary } from "@/lib/agent/missions";
import type { ProductWithStats } from "@/lib/agent/types";
import { formatNumber } from "@/lib/format";
import { APP_NAME, EXAMPLES, GREETING, TAGLINE } from "@/lib/persona";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";
import { useAsk } from "@/lib/use-ask";

const STEPS = [
  { icon: Search, title: "می‌فهمم چی می‌خوای", text: "با جمله‌ی خودت؛ بودجه و محله رو هم بگو" },
  { icon: Scale, title: "مقایسه می‌کنم", text: "کالاها و فروشگاه‌ها، با قیمت و فاصله" },
  { icon: PhoneCall, title: "زنگ می‌زنم", text: "موجودی و قیمت امروز رو تأیید می‌گیرم" },
  { icon: MapPin, title: "می‌فرستمت", text: "آدرس دقیق تا طبقه و واحد، و پیگیری" },
];

export function HomeScreen() {
  const { ctx, query } = useShopper();
  const { ask } = useAsk();
  const featured = useApi<{ results: ProductWithStats[] }>(withCtx("/api/products/featured?limit=8", query));
  const missions = useApi<{ missions: MissionSummary[] }>(isEnabled("track") ? "/api/missions" : null);
  const stats = useApi<{ stats: CatalogStats }>("/api/areas");
  const active = (missions.data?.missions ?? []).filter((m) => !["bought", "cancelled"].includes(m.status)).slice(0, 2);

  return (
    <main className="px-4 pb-8 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {/* Brand row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-brand to-[#8a5cf6] text-[20px] font-black text-white">
            م
          </span>
          <div>
            <div className="text-[19px] font-black leading-6">{APP_NAME}</div>
            <div className="text-[11px] text-muted">{TAGLINE}</div>
          </div>
        </div>
        <Link
          href="/map"
          className="flex max-w-[45%] items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold text-muted ring-1 ring-line"
        >
          <MapPin className="size-3.5 shrink-0 text-brand" />
          <span className="truncate">{ctx.origin?.label ?? "موقعیتت؟"}</span>
        </Link>
      </div>

      {/* Agent hero */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e2378] via-brand to-[#7a55f0] p-4 text-white shadow-[0_14px_30px_-14px_rgba(91,71,224,0.9)]">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
            <Sparkles className="size-5" />
          </span>
          <p className="text-[14px] leading-7">{GREETING}</p>
        </div>
        <div className="mt-3 text-ink">
          <AskBox />
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              onClick={() => ask(e)}
              className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white ring-1 ring-white/25 active:bg-white/25"
            >
              {e}
            </button>
          ))}
        </div>
      </section>

      {/* Active follow-ups */}
      {active.length > 0 && (
        <>
          <SectionTitle
            action={
              <Link href="/track" className="text-[13px] font-bold text-brand">
                همه
              </Link>
            }
          >
            پیگیری‌های فعال
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {active.map((m) => (
              <MissionRow key={m.id} m={m} />
            ))}
          </div>
        </>
      )}

      {/* How it works */}
      <SectionTitle>میزان چطور کمکت می‌کنه</SectionTitle>
      <ol className="grid grid-cols-2 gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl bg-surface p-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-brand-soft text-brand">
                <s.icon className="size-4.5" />
              </span>
              <span className="text-[11px] font-black text-brand">{formatNumber(i + 1)}</span>
            </div>
            <div className="mt-2 text-[13.5px] font-extrabold">{s.title}</div>
            <div className="mt-0.5 text-[11.5px] leading-5 text-muted">{s.text}</div>
          </li>
        ))}
      </ol>

      {/* In the shop */}
      {isEnabled("xray") && (
        <Link href="/tools" className="mt-4 flex items-center gap-3 rounded-3xl bg-ink p-4 text-white active:opacity-90">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-[#ffd166]">
            <Zap className="size-6" fill="currentColor" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-extrabold">الان تو مغازه‌ای؟</span>
            <span className="block text-[12px] leading-5 opacity-80">از قفسه عکس بگیر؛ کنار هر کالا می‌بینی قیمتش نسبت به بازار تهران خوبه یا گرون.</span>
          </span>
          <ChevronLeft className="size-5 opacity-70" />
        </Link>
      )}

      {/* Popular */}
      <SectionTitle>پرطرفدار در پاساژهای تهران</SectionTitle>
      <div className="flex flex-col gap-2">
        {!featured.data
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[132px]" />)
          : featured.data.results.map((r) => <ProductCard key={r.product.id} product={r.product} stats={r.stats} hiddenCount={r.hiddenCount} />)}
      </div>

      {isEnabled("seller") && (
        <Link href="/seller" className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3.5 active:bg-surface-2">
          <Store className="size-5 text-muted" />
          <span className="min-w-0 flex-1 text-[13px] leading-6 text-muted">
            فروشنده‌ای؟ <b className="text-ink">پنل فروشنده</b>: سؤال‌های میزان رو جواب بده و قیمتت رو به‌روز کن.
          </span>
          <ChevronLeft className="size-4 text-muted" />
        </Link>
      )}

      <p className="mt-8 text-center text-[11px] leading-5 text-muted">
        ساخته‌شده برای هکاتون ترب • داده‌ی ترب از
        {stats.data ? ` ${formatNumber(stats.data.stats.shops)} فروشگاه و ${formatNumber(stats.data.stats.products)} کالا` : " فروشگاه‌های تهران"}
        <br />
        قیمت‌ها «ثبت‌شده»‌اند تا وقتی میزان تلفنی تأییدشون نکرده.
      </p>
    </main>
  );
}
