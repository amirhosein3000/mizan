"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Barcode, Camera, ChevronLeft, Search, Type, Zap } from "lucide-react";
import { ModeBadge } from "@/components/ModeBadge";
import { ProductRow } from "@/components/ProductRow";
import { SectionTitle, Skeleton } from "@/components/ui";
import { LEVEL_STYLE } from "@/components/VerdictCard";
import { isEnabled } from "@/config/features";
import { api } from "@/lib/client-api";
import { formatToman, timeAgo } from "@/lib/format";
import { APP_NAME, GREETINGS, TAGLINE } from "@/lib/persona";
import type { PriceSummary, Product } from "@/lib/price/types";
import type { VerdictLevel } from "@/lib/verdict";

interface HistoryItem {
  id: number;
  productId: string;
  productName: string;
  storePrice: number | null;
  verdict: VerdictLevel | null;
  updatedAt: number;
}

export function HomeScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [featured, setFeatured] = useState<{ product: Product; summary: PriceSummary | null }[] | null>(null);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    api<{ results: { product: Product; summary: PriceSummary | null }[] }>("/api/products/featured")
      .then((r) => setFeatured(r.results))
      .catch(() => setFeatured([]));
    if (isEnabled("history")) {
      api<{ items: HistoryItem[]; totalSaved: number }>("/api/history")
        .then((r) => {
          setRecent(r.items.slice(0, 3));
          setTotalSaved(r.totalSaved);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <main className="px-4 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      {/* Brand row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-brand to-[#8a5cf6] text-[20px] font-black text-white">
            م
          </span>
          <div>
            <div className="text-[19px] font-black leading-6">{APP_NAME}</div>
            <div className="text-[11px] text-muted">{TAGLINE}</div>
          </div>
        </div>
        <ModeBadge />
      </div>

      {/* Persona greeting */}
      <p className="mt-4 rounded-2xl rounded-tr-md bg-surface px-4 py-3 text-[14px] leading-7 shadow-[0_1px_2px_rgba(20,10,60,0.06)]">
        {GREETINGS[0]}
      </p>

      {/* Hero: Price X-ray */}
      {isEnabled("xray") && (
        <Link
          href="/xray"
          className="relative mt-4 block overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e2378] via-brand to-[#8a5cf6] p-5 text-white shadow-[0_14px_30px_-12px_rgba(91,71,224,0.8)] active:scale-[0.99]"
        >
          <div className="relative z-10 max-w-[70%]">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#ffd166]">
              <Zap className="size-4" fill="currentColor" /> جدید
            </div>
            <div className="mt-1 text-[22px] font-black leading-9">اشعه‌ی ایکس قیمت</div>
            <p className="mt-1 text-[13px] leading-6 opacity-90">دوربین رو بگیر سمت قفسه؛ کنار هر کالا می‌بینی خوبه، منصفانه‌ست یا گرون.</p>
            <span className="mt-3 inline-flex h-10 items-center gap-1 rounded-xl bg-white px-4 text-[14px] font-bold text-brand-ink">
              اسکن قفسه <ChevronLeft className="size-4" />
            </span>
          </div>
          {/* Decorative badges */}
          <div className="absolute left-3 top-6 flex flex-col items-start gap-2" aria-hidden>
            {(["good", "high", "fair"] as const).map((l, i) => (
              <span
                key={l}
                className={`pop-in rounded-xl px-2.5 py-1 text-[11px] font-black ring-2 ring-white ${LEVEL_STYLE[l].bg}`}
                style={{ animationDelay: `${200 + i * 150}ms`, marginLeft: `${(i % 2) * 22}px` }}
              >
                {LEVEL_STYLE[l].label}
              </span>
            ))}
          </div>
        </Link>
      )}

      {/* Identify */}
      {isEnabled("identify") && (
        <>
          <SectionTitle>کالا رو بهم نشون بده</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {[
              { href: "/scan?mode=photo", label: "عکس", icon: Camera },
              { href: "/scan?mode=barcode", label: "بارکد", icon: Barcode },
              { href: "/scan?mode=text", label: "اسم", icon: Type },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-surface py-4 text-[13px] font-bold active:bg-surface-2">
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <Icon className="size-6" />
                </span>
                {label}
              </Link>
            ))}
          </div>
          <form
            className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-brand"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim()) router.push(`/scan?mode=text&q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Search className="size-5 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی سریع: آیفون ۱۶، چای گلستان…"
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              enterKeyHint="search"
              type="search"
            />
          </form>
        </>
      )}

      {/* Savings */}
      {totalSaved > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-good-soft px-4 py-3">
          <span className="text-[13px] font-bold text-good">تا حالا با {APP_NAME} صرفه‌جویی کردی</span>
          <span className="tabular text-[16px] font-black text-good">{formatToman(totalSaved)}</span>
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <>
          <SectionTitle
            action={
              <Link href="/history" className="text-[13px] font-bold text-brand">
                همه
              </Link>
            }
          >
            اخیراً دیدی
          </SectionTitle>
          <div className="flex flex-col gap-2">
            {recent.map((h) => (
              <Link
                key={h.id}
                href={`/p/${encodeURIComponent(h.productId)}${h.storePrice ? `?price=${h.storePrice}` : ""}`}
                className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 active:bg-surface-2"
              >
                <span className={`size-2.5 shrink-0 rounded-full ${h.verdict ? LEVEL_STYLE[h.verdict].bg : "bg-line"}`} />
                <span className="line-clamp-1 min-w-0 flex-1 text-[14px] font-semibold">{h.productName}</span>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(h.updatedAt)}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Featured */}
      <SectionTitle>برای امتحان</SectionTitle>
      <div className="flex flex-col gap-2">
        {featured === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px]" />)
          : featured
              .slice(0, 6)
              .map((f) => <ProductRow key={f.product.id} product={f.product} summary={f.summary} href={`/p/${encodeURIComponent(f.product.id)}`} />)}
      </div>

      <p className="mt-8 text-center text-[11px] leading-5 text-muted">
        ساخته‌شده برای هکاتون ترب · قیمت‌ها در حالت نمایشی ساختگی‌اند
      </p>
    </main>
  );
}
