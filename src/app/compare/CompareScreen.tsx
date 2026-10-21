"use client";
// Side by side: price, where to buy near you, and specs (differences highlighted),
// with Mizan's pick and why.
import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ContextBar } from "@/components/ContextBar";
import { ProductImage } from "@/components/ProductImage";
import { priceRange } from "@/components/ProductRow";
import { ErrorNote, Skeleton } from "@/components/ui";
import type { ProductDetail } from "@/lib/catalog/types";
import type { ShopStats } from "@/lib/agent/types";
import { formatNumber, formatTomanShort } from "@/lib/format";
import { formatDistance } from "@/lib/shop/geo";
import { normalizeText } from "@/lib/text";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";

interface Item {
  product: ProductDetail;
  stats: ShopStats;
}

/** Best value: cheap where you can actually buy it nearby. */
function pickBest(items: Item[]): { index: number; why: string } | null {
  const buyable = items.map((it, i) => ({ it, i })).filter(({ it }) => it.stats.shops > 0 && (it.stats.cheapest ?? it.product.price?.min));
  if (buyable.length < 2) return null;
  const price = (x: Item) => x.stats.cheapest ?? x.product.price!.min;
  const min = Math.min(...buyable.map(({ it }) => price(it)));
  const scored = buyable
    .map(({ it, i }) => ({ i, it, s: (min / price(it)) * 0.6 + Math.min(1, it.stats.shops / 8) * 0.25 + (it.stats.openNow ? 0.15 : 0) }))
    .sort((a, b) => b.s - a.s);
  const best = scored[0];
  const bits = [
    price(best.it) === min ? "ارزون‌ترینه" : `فقط ${formatTomanShort(price(best.it) - min)} گرون‌تر از ارزون‌ترین`,
    `${formatNumber(best.it.stats.shops)} فروشگاه دارنش`,
    best.it.stats.openNow ? `${formatNumber(best.it.stats.openNow)} تاشون الان بازن` : null,
  ].filter(Boolean);
  return { index: best.i, why: bits.join("، ") };
}

export function CompareScreen() {
  const ids = useSearchParams().get("ids") ?? "";
  const { query } = useShopper();
  const { data, previous, error, reload } = useApi<{ items: Item[] }>(withCtx(`/api/compare?ids=${encodeURIComponent(ids)}`, query));
  const items = (data ?? previous)?.items;

  const specRows = useMemo(() => {
    if (!items) return [];
    const keys = new Map<string, number>();
    for (const it of items) for (const [k] of it.product.specs) keys.set(k, (keys.get(k) ?? 0) + 1);
    return [...keys.entries()]
      .filter(([, n]) => n >= Math.min(2, items.length))
      .slice(0, 18)
      .map(([k]) => {
        const values = items.map((it) => it.product.specs.find(([kk]) => kk === k)?.[1] ?? "—");
        const differ = new Set(values.map((v) => normalizeText(v))).size > 1;
        return { k, values, differ };
      });
  }, [items]);
  const best = items ? pickBest(items) : null;
  const cols = items?.length ?? 2;

  return (
    <>
      <AppHeader title="مقایسه" back />
      <main className="px-4 pb-10">
        <ContextBar />
        {error && <ErrorNote message={error} onRetry={reload} />}
        {!items && !error && <Skeleton className="mt-3 h-80" />}
        {items && (
          <>
            {best && (
              <div className="rise mt-3 flex items-start gap-2 rounded-2xl bg-good-soft px-3 py-2.5 text-[13px] leading-6 text-good">
                <Sparkles className="mt-1 size-4 shrink-0" />
                <span>
                  پیشنهاد میزان: <b>{items[best.index].product.title.split("|")[0].trim()}</b> — {best.why}.
                </span>
              </div>
            )}
            <div className="mt-3 overflow-x-auto rounded-[var(--radius-card)] bg-surface">
              <table className="w-full min-w-[340px] table-fixed text-[12.5px]">
                <thead>
                  <tr>
                    {items.map((it, i) => (
                      <th key={it.product.id} className={`p-2.5 align-top ${best?.index === i ? "bg-good-soft/60" : ""}`} style={{ width: `${100 / cols}%` }}>
                        <Link href={`/p/${encodeURIComponent(it.product.id)}`} className="flex flex-col items-center gap-1.5 text-center">
                          <ProductImage product={it.product} size={64} />
                          <span className="line-clamp-3 text-[12.5px] font-bold leading-5">{it.product.title}</span>
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <Row label="قیمت ثبت‌شده" values={items.map((it) => priceRange(it.product))} strong />
                  <Row label="فروشگاه‌ها (با فیلترهات)" values={items.map((it) => `${formatNumber(it.stats.shops)} فروشگاه`)} />
                  <Row label="الان باز" values={items.map((it) => formatNumber(it.stats.openNow))} />
                  <Row label="نزدیک‌ترین" values={items.map((it) => (it.stats.nearestM !== null ? formatDistance(it.stats.nearestM) : "—"))} />
                  <Row label="قسطی" values={items.map((it) => (it.stats.installment ? `${formatNumber(it.stats.installment)} فروشگاه` : "—"))} />
                  {specRows.map((r) => (
                    <Row key={r.k} label={r.k} values={r.values} highlight={r.differ} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11.5px] text-muted">ردیف‌های رنگی یعنی این مدل‌ها اون مشخصه رو متفاوت دارن.</p>
          </>
        )}
      </main>
    </>
  );
}

function Row({ label, values, strong, highlight }: { label: string; values: string[]; strong?: boolean; highlight?: boolean }) {
  return (
    <>
      <tr className="bg-surface-2/60">
        <td colSpan={values.length} className="px-2.5 pb-0.5 pt-2 text-[11px] font-bold text-muted">
          {label}
        </td>
      </tr>
      <tr className={highlight ? "bg-fair-soft/50" : ""}>
        {values.map((v, i) => (
          <td key={i} className={`break-words px-2.5 pb-2 pt-0.5 text-center align-top ${strong ? "font-extrabold" : ""}`}>
            {v}
          </td>
        ))}
      </tr>
    </>
  );
}
