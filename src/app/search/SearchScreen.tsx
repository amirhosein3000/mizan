"use client";
// Step 1 — what exactly do you want? Results with where-to-buy stats, facets the
// agent turns into short questions, and a compare tray.
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Scale, SearchX, Sparkles, X } from "lucide-react";
import { AskBox } from "@/components/AskBox";
import { ContextBar, LocationSheet } from "@/components/ContextBar";
import { ProductCard } from "@/components/ProductRow";
import { EmptyState, ErrorNote, FilterChip, Segmented, Skeleton } from "@/components/ui";
import { isEnabled } from "@/config/features";
import type { Facet } from "@/lib/catalog/types";
import type { ProductWithStats } from "@/lib/agent/types";
import { formatNumber, formatTomanShort } from "@/lib/format";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";
import { readSavedIntent, useAsk } from "@/lib/use-ask";
import { EXAMPLES } from "@/lib/persona";

interface SearchResponse {
  query: string;
  total: number;
  facets: { categories: Facet[]; brands: Facet[] };
  priceBands: number[];
  results: ProductWithStats[];
}

type Sort = "best" | "cheap" | "near" | "shops";

export function SearchScreen() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  // A new query starts with fresh facets / sort / compare selections.
  return q ? <SearchInner key={q} /> : <AskStart />;
}

/** Empty search: the agent's prompt, examples and the shopper's conditions. */
function AskStart() {
  const router = useRouter();
  const { ask } = useAsk();
  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/95 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/")} className="grid size-10 shrink-0 place-items-center rounded-full active:bg-surface-2" aria-label="بازگشت">
            <ChevronRight className="size-6" />
          </button>
          <div className="min-w-0 flex-1">
            <AskBox autoFocus />
          </div>
        </div>
      </header>
      <main className="px-4 pb-10">
        <div className="mt-2 flex items-start gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 text-[13.5px] leading-7 text-brand-ink">
          <Sparkles className="mt-1.5 size-4 shrink-0 text-brand" />
          <span>هرطور راحتی بگو: اسم کالا، بودجه، محله، «قسطی»، «الان باز باشه» یا «فردا عصر». بقیه‌ش با من.</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => ask(e)} className="rounded-full bg-surface px-3 py-2 text-[13px] font-semibold ring-1 ring-line active:bg-surface-2">
              {e}
            </button>
          ))}
        </div>
        <div className="mb-1 mt-6 px-1 text-[13px] font-extrabold">شرایط خریدت</div>
        <ContextBar />
      </main>
    </>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const said = params.get("said");
  const { ctx, query, patch } = useShopper();
  const [category, setCategory] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("best");
  const [compare, setCompare] = useState<string[]>([]);
  const [locate, setLocate] = useState(params.get("locate") === "1");
  const intent = useMemo(() => readSavedIntent(said), [said]);
  // Opened from a link or history without the parsed request: understand it now, so
  // «زیر ۵ میلیون قسطی» in a shared URL still sets budget and installment.
  const { ask } = useAsk();
  const understood = useRef(false);
  useEffect(() => {
    if (said || understood.current) return;
    understood.current = true;
    void ask(q, { replace: true });
  }, [said, q, ask]);

  const url = q
    ? withCtx(
        `/api/search?q=${encodeURIComponent(q)}${category ? `&category=${encodeURIComponent(category)}` : ""}${brand ? `&brand=${encodeURIComponent(brand)}` : ""}`,
        query,
      )
    : null;
  const { data, previous, error, loading, reload } = useApi<SearchResponse>(url);
  const shown = data ?? previous;

  const results = useMemo(() => {
    const list = [...(shown?.results ?? [])];
    if (sort === "cheap") list.sort((a, b) => (a.stats.cheapest ?? a.product.price?.min ?? Infinity) - (b.stats.cheapest ?? b.product.price?.min ?? Infinity));
    if (sort === "near") list.sort((a, b) => (a.stats.nearestM ?? Infinity) - (b.stats.nearestM ?? Infinity));
    if (sort === "shops") list.sort((a, b) => b.stats.shops - a.stats.shops);
    // Products no shop can sell under the shopper's conditions go last (stable sort).
    return list.sort((a, b) => Number(!a.stats.shops) - Number(!b.stats.shops));
  }, [shown, sort]);

  const cats = shown?.facets.categories ?? [];
  const topShare = cats.length && shown ? cats[0].count / Math.max(1, cats.reduce((a, c) => a + c.count, 0)) : 1;
  const askCategory = !category && cats.length > 1 && topShare < 0.8;
  const bands = shown?.priceBands ?? [];
  const askBudget = !ctx.budgetMax && !askCategory && bands.length === 3 && (shown?.total ?? 0) > 12;

  function toggleCompare(id: string) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 3 ? [...c.slice(1), id] : [...c, id]));
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/95 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/")} className="grid size-10 shrink-0 place-items-center rounded-full active:bg-surface-2" aria-label="بازگشت">
            <ChevronRight className="size-6" />
          </button>
          <div className="min-w-0 flex-1">
            <AskBox key={said ?? q} initial={said ?? q} />
          </div>
        </div>
        <ContextBar className="mt-2" />
      </header>

      <main className="px-4 pb-36">
        {intent && (
          <div className="rise mt-1 flex items-start gap-2 rounded-2xl bg-brand-soft px-3 py-2.5 text-[13px] leading-6 text-brand-ink">
            <Sparkles className="mt-1 size-4 shrink-0 text-brand" />
            <span>
              فهمیدم دنبال <b>{intent.query || q}</b> هستی
              {intent.budgetMax ? <> با بودجه‌ی <b>تا {formatTomanShort(intent.budgetMax)}</b></> : null}
              {intent.place ? <> نزدیک <b>{intent.place.name}</b></> : null}
              {intent.installment ? <>، <b>قسطی</b></> : null}
              {intent.openNow ? <>، <b>الان باز</b></> : null}
              {intent.warranty ? <>، <b>با گارانتی</b></> : null}
              . فیلترها رو بالا گذاشتم؛ هر کدوم رو خواستی عوض کن.
            </span>
          </div>
        )}

        {/* Agent asks to narrow down */}
        {askCategory && (
          <div className="rise mt-3 rounded-2xl bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[13.5px] font-extrabold">
              <Sparkles className="size-4 text-brand" /> منظورت کدومه؟
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {cats.slice(0, 4).map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="rounded-xl bg-surface-2 px-3 py-2 text-[13px] font-bold active:bg-brand-soft"
                >
                  {c.value} <span className="text-muted">({formatNumber(c.count)})</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {askBudget && (
          <div className="rise mt-3 rounded-2xl bg-surface p-3">
            <div className="flex items-center gap-1.5 text-[13.5px] font-extrabold">
              <Sparkles className="size-4 text-brand" /> بودجه‌ت حدوداً چقدره؟
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[bands[0], bands[1], bands[2]].map((b) => (
                <button key={b} onClick={() => patch({ budgetMax: b })} className="rounded-xl bg-surface-2 px-3 py-2 text-[13px] font-bold active:bg-brand-soft">
                  تا {formatTomanShort(b)}
                </button>
              ))}
              <button onClick={() => patch({ budgetMax: null })} className="rounded-xl px-3 py-2 text-[13px] font-bold text-muted">
                فرقی نداره
              </button>
            </div>
          </div>
        )}

        {/* Facets */}
        {(category || cats.length > 1) && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <FilterChip on={!category} onClick={() => setCategory(null)}>
              همه‌ی دسته‌ها
            </FilterChip>
            {(category && !cats.some((c) => c.value === category) ? [{ value: category, count: 0 }, ...cats] : cats).map((c) => (
              <FilterChip key={c.value} on={category === c.value} onClick={() => setCategory(category === c.value ? null : c.value)}>
                {c.value}
                {c.count ? <span className="opacity-60">{formatNumber(c.count)}</span> : null}
              </FilterChip>
            ))}
          </div>
        )}
        {(shown?.facets.brands.length ?? 0) > 1 && (
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            {brand && (
              <FilterChip on onClick={() => setBrand(null)}>
                {brand} <X className="size-3.5" />
              </FilterChip>
            )}
            {shown!.facets.brands
              .filter((b) => b.value !== brand)
              .map((b) => (
                <FilterChip key={b.value} on={false} onClick={() => setBrand(b.value)}>
                  {b.value}
                </FilterChip>
              ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">{shown ? `${formatNumber(shown.total)} کالا` : " "}</span>
        </div>
        <Segmented<Sort>
          className="mt-2"
          value={sort}
          onChange={setSort}
          options={[
            { value: "best", label: "مرتبط‌ترین" },
            { value: "shops", label: "بیشترین فروشگاه" },
            { value: "cheap", label: "ارزون‌ترین" },
            { value: "near", label: "نزدیک‌ترین" },
          ]}
        />

        <div className={`mt-3 flex flex-col gap-2 transition-opacity ${loading && shown ? "opacity-50" : ""}`}>
          {error && <ErrorNote message={error} onRetry={reload} />}
          {!shown && !error && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px]" />)}
          {shown && results.length === 0 && (
            <EmptyState icon={<SearchX className="size-6" />} title="چیزی پیدا نکردم">
              کلمه‌ها رو ساده‌تر کن (مثلاً فقط برند و مدل)، یا فیلتر دسته و بودجه رو بردار.
            </EmptyState>
          )}
          {results.map((r) => (
            <ProductCard
              key={r.product.id}
              product={r.product}
              stats={r.stats}
              hiddenCount={r.hiddenCount}
              compared={compare.includes(r.product.id)}
              onCompare={isEnabled("compare") ? () => toggleCompare(r.product.id) : undefined}
            />
          ))}
        </div>
      </main>

      {compare.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[480px] px-4">
          <div className="rise flex items-center gap-2 rounded-2xl bg-ink p-2 ps-4 text-white shadow-xl">
            <Scale className="size-5" />
            <span className="flex-1 text-[13px] font-bold">{formatNumber(compare.length)} کالا برای مقایسه</span>
            <button onClick={() => setCompare([])} className="px-2 text-[12px] opacity-70">
              پاک کن
            </button>
            <Link
              href={`/compare?ids=${compare.join(",")}`}
              className={`rounded-xl bg-white px-4 py-2 text-[13px] font-extrabold text-ink ${compare.length < 2 ? "pointer-events-none opacity-50" : ""}`}
            >
              مقایسه کن
            </Link>
          </div>
        </div>
      )}
      {locate && <LocationSheet onClose={() => setLocate(false)} />}
    </>
  );
}
