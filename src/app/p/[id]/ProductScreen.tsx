"use client";
// Step 2 — where to buy THIS product in Tehran, ranked for this shopper, with
// honest data (listed vs. confirmed), then hand off to the agent to call.
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck, ChevronDown, Info, List, Map as MapIcon, PhoneCall, Store, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CallSetupSheet } from "@/components/CallSetupSheet";
import { ChatPanel } from "@/components/ChatPanel";
import { ContextBar } from "@/components/ContextBar";
import { MapView, type MapPoint } from "@/components/MapView";
import { PriceRangeCard } from "@/components/PriceRangeCard";
import { ProductImage } from "@/components/ProductImage";
import { ProductCard } from "@/components/ProductRow";
import { SavingsSheet } from "@/components/SavingsSheet";
import { ShopCard } from "@/components/shop";
import { StorePriceInput } from "@/components/StorePriceInput";
import { VerdictCard } from "@/components/VerdictCard";
import { Button, Card, Chip, EmptyState, ErrorNote, SectionTitle, Segmented, Skeleton } from "@/components/ui";
import { isEnabled } from "@/config/features";
import type { ProductDetail } from "@/lib/catalog/types";
import type { ProductWithStats, ShopStats } from "@/lib/agent/types";
import { api } from "@/lib/client-api";
import { formatNumber, parsePrice } from "@/lib/format";
import { APP_NAME, ASSISTANT_NAME } from "@/lib/persona";
import { ageLabel } from "@/lib/shop/freshness";
import { HIDDEN_LABEL, type HiddenReason, type RankedShop } from "@/lib/shop/rank";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";
import { computeVerdict } from "@/lib/verdict";

interface ProductResponse {
  product: ProductDetail;
  shops: RankedShop[];
  hidden: Partial<Record<HiddenReason, number>>;
  maybe: RankedShop[];
  stats: ShopStats;
  similar: ProductWithStats[];
  snapshotAt: number;
}

type Sort = "best" | "near" | "cheap" | "fresh";

function saveHistory(body: Record<string, unknown>): Promise<{ item?: { saved: boolean } } | null> {
  if (!isEnabled("history")) return Promise.resolve(null);
  return api<{ item: { saved: boolean } }>("/api/history", { body }).catch(() => null);
}

const toneOf = (x: RankedShop): MapPoint["tone"] =>
  x.confirmation?.available ? "good" : x.status.state === "closed" ? "high" : x.status.state === "open" ? "brand" : "muted";

export function ProductScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const { ctx, query, patch, reset } = useShopper();
  const { data, previous, error, loading, reload } = useApi<ProductResponse>(withCtx(`/api/products/${encodeURIComponent(id)}`, query));
  const shown = data ?? (previous?.product.id === decodeURIComponent(id) ? previous : undefined);
  const [sort, setSort] = useState<Sort>("best");
  const [view, setView] = useState<"list" | "map">("list");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [calling, setCalling] = useState(false);
  const [storePrice, setStorePrice] = useState<number | null>(() => parsePrice(search.get("price") ?? ""));
  const [inStoreOpen, setInStoreOpen] = useState(!!search.get("price"));
  const [specsOpen, setSpecsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [buying, setBuying] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  const product = shown?.product;
  const summary = product?.price ?? null;
  const verdict = isEnabled("verdict") && storePrice && summary ? computeVerdict(storePrice, summary) : null;

  useEffect(() => {
    if (product) document.title = `${product.title.split("|")[0].trim()} | ${APP_NAME}`;
  }, [product]);

  useEffect(() => {
    if (!product) return;
    saveHistory({
      productId: product.id,
      productName: product.title,
      category: product.category,
      onlineMedian: product.price?.median ?? null,
      onlineMin: product.price?.min ?? null,
      ...(verdict ? { storePrice, verdict: verdict.level } : {}),
    }).then((res) => res?.item && setSaved(res.item.saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, storePrice]);

  const shops = useMemo(() => {
    const list = [...(shown?.shops ?? [])];
    if (sort === "near") list.sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity));
    if (sort === "cheap") list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "fresh") list.sort((a, b) => (b.confirmation?.at ?? b.offer?.changedAt ?? 0) - (a.confirmation?.at ?? a.offer?.changedAt ?? 0));
    return list;
  }, [shown, sort]);

  const all = useMemo(() => [...(shown?.shops ?? []), ...(shown?.maybe ?? [])], [shown]);
  const openNow = useMemo(() => all.filter((s) => s.status.state !== "closed"), [all]);
  // All closed (evening / Friday): the agent schedules the calls for opening time.
  const autoPick = useMemo(() => (openNow.length ? openNow : all).slice(0, 3), [openNow, all]);
  const callTargets = selected.length ? all.filter((s) => selected.includes(s.shop.id)) : autoPick;
  const points = useMemo<MapPoint[]>(
    () => shops.map((x) => ({ id: x.shop.id, lat: x.shop.lat, lon: x.shop.lon, label: x.shop.name, tone: toneOf(x), selected: selected.includes(x.shop.id) })),
    [shops, selected],
  );

  function toggle(shopId: string) {
    setSelected((s) => (s.includes(shopId) ? s.filter((x) => x !== shopId) : s.length >= 5 ? s : [...s, shopId]));
  }

  function toggleSave() {
    if (!product) return;
    const next = !saved;
    setSaved(next);
    saveHistory({ productId: product.id, productName: product.title, category: product.category, saved: next });
  }

  if (error && !shown) {
    return (
      <>
        <AppHeader title="کالا" back />
        <div className="p-4">
          <ErrorNote message={error} onRetry={reload} />
        </div>
      </>
    );
  }
  if (!shown || !product) {
    return (
      <>
        <AppHeader title="…" back />
        <div className="space-y-3 p-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-36" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </>
    );
  }

  const hiddenTotal = Object.values(shown.hidden).reduce((a, b) => a + (b ?? 0), 0);
  const visibleShops = showAll ? shops : shops.slice(0, 6);

  return (
    <>
      <AppHeader
        title={product.brand ?? product.category}
        back
        action={
          isEnabled("history") && (
            <button
              onClick={toggleSave}
              className={`grid size-10 place-items-center rounded-full ${saved ? "text-brand" : "text-muted"} active:bg-surface-2`}
              aria-label={saved ? "حذف از ذخیره‌ها" : "ذخیره"}
              aria-pressed={saved}
            >
              {saved ? <BookmarkCheck className="size-6" fill="currentColor" /> : <Bookmark className="size-6" />}
            </button>
          )
        }
      />

      <main className="space-y-3 px-4 pb-32">
        {/* Product */}
        <Card className="p-3">
          {product.images.length > 1 ? (
            <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1">
              {product.images.map((src, i) => (
                <ProductImage key={src} product={{ ...product, images: [src] }} size={150} className={`snap-center ${i ? "opacity-95" : ""}`} />
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <ProductImage product={product} size={150} />
            </div>
          )}
          <h2 className="mt-3 text-[16px] font-extrabold leading-7">{product.title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{product.category}</Chip>
            {product.brand && <Chip>{product.brand}</Chip>}
            {product.model && !/\d{4,}|base/i.test(product.model) && <Chip>{product.model}</Chip>}
          </div>
        </Card>

        {summary ? (
          <PriceRangeCard summary={summary} storePrice={verdict ? storePrice : null} level={verdict?.level} title="قیمت ثبت‌شده در تهران">
            <details className="mt-3 rounded-2xl bg-info-soft px-3 py-2 text-[12px] leading-6 text-info">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-bold">
                <Info className="size-4" /> این قیمت‌ها یعنی چی؟
              </summary>
              <ul className="mt-1 list-disc ps-5 text-ink/80">
                <li>«ثبت‌شده» قیمتیه که فروشگاه روی ترب گذاشته؛ کنار هرکدوم نوشتیم کی عوضش کرده.</li>
                <li>«تأییدشده» یعنی میزان همین امروز زنگ زده و فروشنده گفته موجوده و چند.</li>
                <li>موجودی فقط با تماس معلوم می‌شه؛ تا تأیید نشده «نامعلوم»ه.</li>
                <li>داده‌ی ترب مربوط به {ageLabel(shown.snapshotAt)} است.</li>
              </ul>
            </details>
          </PriceRangeCard>
        ) : (
          <Card className="text-[13px] text-muted">هیچ فروشگاهی برای این کالا قیمت ثبت نکرده؛ میزان می‌تونه زنگ بزنه و بپرسه.</Card>
        )}

        {/* Where to buy */}
        <section>
          <SectionTitle>
            کجا بخرم؟{" "}
            <span className="text-[12px] font-bold text-muted">
              {formatNumber(shown.stats.shops)} فروشگاه
              {shown.stats.openNow ? `، ${formatNumber(shown.stats.openNow)} باز` : ""}
            </span>
          </SectionTitle>
          <ContextBar />
          {!ctx.origin && (
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
              <Sparkles className="size-3.5 text-brand" /> بگو از کجا میای تا فاصله و زمان رسیدن رو هم حساب کنم.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Segmented<Sort>
              className="min-w-0 flex-1"
              value={sort}
              onChange={setSort}
              options={[
                { value: "best", label: "پیشنهاد میزان" },
                { value: "near", label: "نزدیک‌ترین" },
                { value: "cheap", label: "ارزون‌ترین" },
                { value: "fresh", label: "تازه‌ترین قیمت" },
              ]}
            />
            <button
              onClick={() => setView((v) => (v === "list" ? "map" : "list"))}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink"
              aria-label={view === "list" ? "نمایش نقشه" : "نمایش لیست"}
            >
              {view === "list" ? <MapIcon className="size-5" /> : <List className="size-5" />}
            </button>
          </div>

          <div className={`mt-3 flex flex-col gap-2 transition-opacity ${loading ? "opacity-50" : ""}`}>
            {view === "map" && (
              <MapView points={points} origin={ctx.origin} radiusKm={ctx.radiusKm} onSelect={toggle} className="h-80" />
            )}
            {view === "map" && <p className="text-[11.5px] text-muted">روی هر نقطه بزنی، برای تماس انتخاب می‌شه. سبز = تأییدشده، بنفش = باز، قرمز = بسته.</p>}
            {shops.length === 0 && (
              <EmptyState icon={<Store className="size-6" />} title={hiddenTotal ? "با این فیلترها فروشگاهی نموند" : "فروشگاه حضوری ثبت نشده"}>
                {hiddenTotal ? "فیلترها رو کمتر کن یا محدوده رو بزرگ‌تر بگیر." : "پایین‌تر فروشگاه‌هایی رو که این دسته رو می‌فروشن ببین؛ میزان می‌تونه ازشون بپرسه."}
              </EmptyState>
            )}
            {visibleShops.map((x, i) => (
              <ShopCard key={x.shop.id} x={x} rank={sort === "best" ? i : undefined} productId={product.id} selected={selected.includes(x.shop.id)} onToggle={() => toggle(x.shop.id)} />
            ))}
            {shops.length > 6 && (
              <button onClick={() => setShowAll((v) => !v)} className="rounded-2xl bg-surface py-3 text-[13px] font-bold text-brand">
                {showAll ? "کمتر" : `نمایش ${formatNumber(shops.length - 6)} فروشگاه دیگه`}
              </button>
            )}
            {hiddenTotal > 0 && (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 text-[12px] leading-5 text-muted">
                <span className="flex-1">
                  {formatNumber(hiddenTotal)} فروشگاه پنهان شد:{" "}
                  {Object.entries(shown.hidden)
                    .map(([k, n]) => `${HIDDEN_LABEL[k as HiddenReason]} (${formatNumber(n ?? 0)})`)
                    .join("، ")}
                </span>
                <button onClick={reset} className="shrink-0 font-bold text-brand">
                  بدون فیلتر
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Shops that may have it */}
        {shown.maybe.length > 0 && (
          <section>
            <SectionTitle>شاید داشته باشن</SectionTitle>
            <p className="-mt-1 mb-2 px-1 text-[12px] leading-5 text-muted">
              این فروشگاه‌ها «{product.category}» می‌فروشن ولی این مدل رو ثبت نکردن. دسته‌ی فعالیت یعنی احتمال، نه موجودی؛ میزان می‌تونه بپرسه.
            </p>
            <div className="flex flex-col gap-2">
              {shown.maybe.slice(0, 4).map((x) => (
                <ShopCard key={x.shop.id} x={x} productId={product.id} selected={selected.includes(x.shop.id)} onToggle={() => toggle(x.shop.id)} />
              ))}
            </div>
          </section>
        )}

        {/* Alternatives */}
        {isEnabled("alternatives") && shown.similar.length > 0 && (
          <section>
            <SectionTitle>جایگزین‌های هم‌رده</SectionTitle>
            <div className="flex flex-col gap-2">
              {shown.similar.slice(0, 4).map((s) => (
                <ProductCard key={s.product.id} product={s.product} stats={s.stats} hiddenCount={s.hiddenCount} />
              ))}
            </div>
          </section>
        )}

        {/* In the shop already */}
        {isEnabled("verdict") && summary && (
          <section className="rounded-[var(--radius-card)] bg-surface">
            <button
              className="flex w-full items-center justify-between p-4 text-[15px] font-extrabold"
              onClick={() => setInStoreOpen((v) => !v)}
              aria-expanded={inStoreOpen}
            >
              تو مغازه‌ای؟ قیمتی که گفتن رو بسنج
              <ChevronDown className={`size-5 transition-transform ${inStoreOpen ? "rotate-180" : ""}`} />
            </button>
            {inStoreOpen && (
              <div className="px-4 pb-4">
                <StorePriceInput
                  key={storePrice ?? "empty"}
                  initial={storePrice}
                  onSubmit={(p) => {
                    setStorePrice(p);
                    setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                  }}
                />
              </div>
            )}
          </section>
        )}
        <div ref={verdictRef} className="scroll-mt-16">
          {verdict && summary && (
            <VerdictCard key={storePrice} verdict={verdict} summary={summary} category={product.kind} onBought={isEnabled("savings") ? () => setBuying(true) : undefined} />
          )}
        </div>

        {isEnabled("chat") && (
          <section>
            <SectionTitle>بپرس از {ASSISTANT_NAME}</SectionTitle>
            <ChatPanel productId={product.id} storePrice={storePrice} />
          </section>
        )}

        {product.specs.length > 0 && (
          <section className="rounded-[var(--radius-card)] bg-surface">
            <button
              className="flex w-full items-center justify-between p-4 text-[15px] font-extrabold"
              onClick={() => setSpecsOpen((v) => !v)}
              aria-expanded={specsOpen}
            >
              مشخصات
              <ChevronDown className={`size-5 transition-transform ${specsOpen ? "rotate-180" : ""}`} />
            </button>
            {specsOpen && (
              <dl className="divide-y divide-line px-4 pb-3 text-[13px]">
                {product.specs.map(([k, v], i) => (
                  <div key={`${k}${i}`} className="flex gap-3 py-2">
                    <dt className="w-28 shrink-0 text-muted">{k}</dt>
                    <dd className="min-w-0 flex-1 break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}

        {ctx.budgetMax && shown.stats.shops === 0 && (
          <Button variant="secondary" className="w-full" onClick={() => patch({ budgetMax: null })}>
            بودجه رو بردار
          </Button>
        )}
      </main>

      {/* Agent CTA */}
      {isEnabled("agentCalls") && callTargets.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[480px] px-4">
          <button
            onClick={() => setCalling(true)}
            className="rise flex h-14 w-full items-center gap-3 rounded-2xl bg-brand px-4 text-white shadow-[0_10px_24px_-8px_rgba(91,71,224,0.8)] active:bg-brand-ink"
          >
            <span className="ring-pulse grid size-9 place-items-center rounded-full bg-white/20">
              <PhoneCall className="size-5" />
            </span>
            <span className="min-w-0 flex-1 text-start">
              <span className="block text-[15px] font-extrabold">
                میزان به {formatNumber(callTargets.length)} فروشگاه زنگ بزنه
              </span>
              <span className="block truncate text-[11.5px] opacity-85">
                {selected.length
                  ? "فروشگاه‌هایی که تیک زدی"
                  : openNow.length
                    ? "بهترین گزینه‌هایی که الان بازن"
                    : "الان بسته‌ان؛ وقتی باز شدن زنگ می‌زنم"}{" "}
               ، موجودی و قیمت امروز
              </span>
            </span>
          </button>
        </div>
      )}

      {calling && <CallSetupSheet product={product} shops={callTargets} auto={!selected.length} onClose={() => setCalling(false)} />}

      {buying && verdict && summary && (
        <SavingsSheet
          input={{
            productName: product.title,
            storePrice: verdict.storePrice,
            median: summary.median,
            suggestedPaid: verdict.level === "good" ? verdict.storePrice : verdict.targetPrice,
          }}
          onClose={() => setBuying(false)}
          onConfirm={(paid) => saveHistory({ productId: product.id, productName: product.title, category: product.category, paidPrice: paid })}
        />
      )}
    </>
  );
}
