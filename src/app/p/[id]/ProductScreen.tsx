"use client";
// The core demo flow after identification:
// price range -> store price -> verdict (+ negotiation line, checklist) -> bought/savings
// -> alternatives -> chat. Everything below the price range is a pluggable module.
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck, ChevronDown } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { PriceRangeCard } from "@/components/PriceRangeCard";
import { ProductIconTile, ProductRow } from "@/components/ProductRow";
import { SavingsSheet } from "@/components/SavingsSheet";
import { StorePriceInput } from "@/components/StorePriceInput";
import { VerdictCard } from "@/components/VerdictCard";
import { Card, Chip, ErrorNote, SectionTitle, Skeleton } from "@/components/ui";
import { CATEGORY_LABEL } from "@/components/icons";
import { isEnabled } from "@/config/features";
import { api, errorMessage } from "@/lib/client-api";
import { formatToman, parsePrice, timeAgo } from "@/lib/format";
import { APP_NAME, ASSISTANT_NAME } from "@/lib/persona";
import type { Offer, PriceSummary, Product, ProductWithSummary } from "@/lib/price/types";
import { computeVerdict } from "@/lib/verdict";

interface Bundle {
  product: Product;
  offers: Offer[];
  summary: PriceSummary | null;
  alternatives: ProductWithSummary[];
}

function saveHistory(body: Record<string, unknown>): Promise<{ item?: { saved: boolean } } | null> {
  if (!isEnabled("history")) return Promise.resolve(null);
  return api<{ item: { saved: boolean } }>("/api/history", { body }).catch(() => null);
}

export function ProductScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storePrice, setStorePrice] = useState<number | null>(() => parsePrice(search.get("price") ?? ""));
  const [saved, setSaved] = useState(false);
  const [buying, setBuying] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const verdictRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<Bundle>(`/api/products/${encodeURIComponent(id)}`)
      .then((b) => {
        setError(null);
        setBundle(b);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  useEffect(load, [load]);

  const { product, summary } = bundle ?? {};
  const verdict =
    isEnabled("verdict") && storePrice && summary
      ? computeVerdict(storePrice, summary, { printedPrice: product?.printedPrice })
      : null;

  useEffect(() => {
    if (product) document.title = `${product.nameFa} · ${APP_NAME}`;
  }, [product]);

  // Record the look (and the verdict once there is one) in history.
  useEffect(() => {
    if (!product) return;
    saveHistory({
      productId: product.id,
      productName: product.nameFa,
      category: product.category,
      onlineMedian: summary?.median ?? null,
      onlineMin: summary?.min ?? null,
      ...(verdict ? { storePrice, verdict: verdict.level } : {}),
    }).then((res) => res?.item && setSaved(res.item.saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, storePrice]);

  function submitPrice(p: number) {
    setStorePrice(p);
    // Let the verdict render, then bring it into view.
    setTimeout(() => verdictRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function toggleSave() {
    if (!product) return;
    const next = !saved;
    setSaved(next);
    saveHistory({ productId: product.id, productName: product.nameFa, category: product.category, saved: next });
  }

  if (error) {
    return (
      <>
        <AppHeader title="کالا" back />
        <div className="p-4">
          <ErrorNote message={error} onRetry={load} />
        </div>
      </>
    );
  }

  if (!bundle || !product) {
    return (
      <>
        <AppHeader title="…" back />
        <div className="space-y-3 p-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-44" />
          <Skeleton className="h-28" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title={product.brandFa}
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

      <main className="space-y-3 px-4 pb-6">
        <Card className="flex gap-3">
          <ProductIconTile product={product} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-extrabold leading-7">{product.nameFa}</h2>
            <p className="mt-0.5 truncate text-[12px] text-muted" dir="ltr">
              {product.nameEn}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{CATEGORY_LABEL[product.category]}</Chip>
              <Chip>{product.subcategory}</Chip>
              {product.printedPrice && <Chip className="bg-fair-soft text-fair">روی بسته: {formatToman(product.printedPrice)}</Chip>}
            </div>
          </div>
        </Card>

        {summary ? (
          <PriceRangeCard summary={summary} storePrice={storePrice} level={verdict?.level} />
        ) : (
          <Card className="text-sm text-muted">فعلاً فروشنده‌ی آنلاینی برای این کالا پیدا نکردیم.</Card>
        )}

        {isEnabled("verdict") && summary && (
          <Card>
            <h3 className="mb-3 text-[15px] font-extrabold">قیمت مغازه چنده؟</h3>
            <StorePriceInput key={storePrice ?? "empty"} initial={storePrice} onSubmit={submitPrice} />
          </Card>
        )}

        <div ref={verdictRef} className="scroll-mt-16">
          {verdict && summary && (
            <VerdictCard
              key={storePrice}
              verdict={verdict}
              summary={summary}
              category={product.category}
              onBought={isEnabled("savings") ? () => setBuying(true) : undefined}
            />
          )}
        </div>

        {isEnabled("alternatives") && bundle.alternatives.length > 0 && (
          <section>
            <SectionTitle>گزینه‌های هم‌رده</SectionTitle>
            <div className="flex flex-col gap-2">
              {bundle.alternatives.map((a) => {
                const cheaper = summary && a.summary ? summary.median - a.summary.median : 0;
                return (
                  <ProductRow
                    key={a.product.id}
                    product={a.product}
                    summary={a.summary}
                    href={`/p/${encodeURIComponent(a.product.id)}`}
                    trailing={
                      cheaper > 0 ? (
                        <span className="shrink-0 rounded-full bg-good-soft px-2 py-1 text-[11px] font-bold text-good">
                          {formatToman(cheaper)} ارزون‌تر
                        </span>
                      ) : null
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        {isEnabled("chat") && (
          <section>
            <SectionTitle>بپرس از {ASSISTANT_NAME}</SectionTitle>
            <ChatPanel productId={product.id} storePrice={storePrice} />
          </section>
        )}

        {bundle.offers.length > 0 && (
          <section className="rounded-[var(--radius-card)] bg-surface">
            <button
              className="flex w-full items-center justify-between p-4 text-[15px] font-extrabold"
              onClick={() => setOffersOpen((v) => !v)}
              aria-expanded={offersOpen}
            >
              فروشنده‌های آنلاین
              <ChevronDown className={`size-5 transition-transform ${offersOpen ? "rotate-180" : ""}`} />
            </button>
            {offersOpen && (
              <ul className="divide-y divide-line px-4 pb-2">
                {bundle.offers.map((o) => (
                  <li key={o.sellerId} className={`flex items-center justify-between gap-3 py-3 ${o.inStock ? "" : "opacity-50"}`}>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold">{o.sellerName}</div>
                      <div className="text-[11px] text-muted">
                        {o.city} · {o.inStock ? timeAgo(o.updatedAt) : "ناموجود"}
                        {o.guarantee ? ` · ${o.guarantee}` : ""}
                      </div>
                    </div>
                    <div className="tabular shrink-0 text-[14px] font-bold">{formatToman(o.price)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {buying && verdict && summary && (
        <SavingsSheet
          input={{
            productName: product.nameFa,
            storePrice: verdict.storePrice,
            median: summary.median,
            suggestedPaid: verdict.level === "good" ? verdict.storePrice : verdict.targetPrice,
          }}
          onClose={() => setBuying(false)}
          onConfirm={(paid) =>
            saveHistory({ productId: product.id, productName: product.nameFa, category: product.category, paidPrice: paid })
          }
        />
      )}
    </>
  );
}
