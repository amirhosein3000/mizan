"use client";
// Shops around you on a map: pick a starting point and radius, filter by
// activity category and purchase conditions (installment, open, Torob Pay).
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ContextBar } from "@/components/ContextBar";
import { MapView, type MapPoint } from "@/components/MapView";
import { AddressLine, OpenPill, PaymentBadges } from "@/components/shop";
import { ErrorNote, FilterChip, Skeleton } from "@/components/ui";
import type { Shop } from "@/lib/catalog/types";
import { formatNumber } from "@/lib/format";
import { formatDistance } from "@/lib/shop/geo";
import type { OpenStatus } from "@/lib/shop/hours";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";

interface NearResponse {
  center: { lat: number; lon: number };
  radius: number;
  shops: { shop: Shop; distanceM: number; status: OpenStatus }[];
}

const QUICK = ["گوشی موبایل", "هدفون، هدست و هندزفری", "لپ تاپ و الترابوک", "دوربین مدار بسته", "ساعت مچی عقربه‌ ای و دیجیتالی", "شارژر گوشی"];

export function MapScreen() {
  const { ctx, query } = useShopper();
  const [category, setCategory] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const url = withCtx(`/api/shops/near${category ? `?category=${encodeURIComponent(category)}` : ""}`, query);
  const { data, previous, error, loading, reload } = useApi<NearResponse>(url);
  const d = data ?? previous;

  const points = useMemo<MapPoint[]>(
    () =>
      (d?.shops ?? []).map(({ shop, status }) => ({
        id: shop.id,
        lat: shop.lat,
        lon: shop.lon,
        label: shop.name,
        tone: status.state === "open" ? "good" : status.state === "closed" ? "high" : "muted",
        selected: shop.id === picked,
      })),
    [d, picked],
  );
  const pick = d?.shops.find((s) => s.shop.id === picked);

  return (
    <>
      <AppHeader title="فروشگاه‌های اطراف" />
      <main className="px-4 pb-8">
        <ContextBar />
        <form
          className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-surface px-3"
          onSubmit={(e) => {
            e.preventDefault();
            setCategory(typed.trim() || null);
          }}
        >
          <Search className="size-4 text-muted" />
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="دسته‌ی فعالیت، مثلاً «گوشی موبایل»" className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
          {category && (
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setTyped("");
              }}
              aria-label="پاک کردن"
            >
              <X className="size-4 text-muted" />
            </button>
          )}
        </form>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {QUICK.map((c) => (
            <FilterChip key={c} on={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {c}
            </FilterChip>
          ))}
        </div>

        <div className={`relative mt-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <MapView points={points} origin={ctx.origin} radiusKm={ctx.radiusKm ?? 1.5} onSelect={setPicked} className="h-[52dvh]" />
          {d && (
            <span className="absolute right-3 top-3 z-[400] rounded-full bg-surface/95 px-3 py-1 text-[12px] font-bold shadow">
              {formatNumber(d.shops.length)} فروشگاه، {formatDistance(d.radius)}
            </span>
          )}
        </div>
        {!ctx.origin && <p className="mt-2 text-[12px] text-muted">مرکز نقشه: جمهوری و لاله‌زار (پرفروشگاه‌ترین محدوده‌ی داده). موقعیتت رو از بالا انتخاب کن.</p>}
        {error && <ErrorNote message={error} onRetry={reload} />}
        {!d && !error && <Skeleton className="mt-3 h-24" />}

        {pick && (
          <div className="rise mt-3 rounded-[var(--radius-card)] bg-surface p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-extrabold">{pick.shop.name}</div>
                <div className="mt-1">
                  <AddressLine shop={pick.shop} />
                </div>
              </div>
              <span className="shrink-0 text-[12px] text-muted">{formatDistance(pick.distanceM)}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <OpenPill status={pick.status} />
              <span className="text-[12px] text-muted">{pick.shop.offerCount ? `${formatNumber(pick.shop.offerCount)} کالای ثبت‌شده` : "فقط دسته‌ی فعالیت"}</span>
            </div>
            <div className="mt-2">
              <PaymentBadges shop={pick.shop} />
            </div>
            <Link href={`/s/${encodeURIComponent(pick.shop.id)}`} className="mt-3 flex h-11 items-center justify-center gap-1 rounded-2xl bg-brand text-[14px] font-bold text-white">
              جزئیات و کالاها <ChevronLeft className="size-4" />
            </Link>
          </div>
        )}

        {d && !pick && (
          <div className="mt-3 flex flex-col gap-2">
            {d.shops.slice(0, 12).map(({ shop, distanceM, status }) => (
              <button key={shop.id} onClick={() => setPicked(shop.id)} className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-start">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-bold">{shop.name}</div>
                  <div className="truncate text-[12px] text-muted">{[shop.mall, shop.floor ? `طبقه ${shop.floor}` : null, formatDistance(distanceM)].filter(Boolean).join("، ")}</div>
                </div>
                <OpenPill status={status} />
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
