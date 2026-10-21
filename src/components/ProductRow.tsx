"use client";
import Link from "next/link";
import { Check, CreditCard, MapPin, Store } from "lucide-react";
import type { Product } from "@/lib/catalog/types";
import { formatNumber, formatTomanShort } from "@/lib/format";
import { formatDistance } from "@/lib/shop/geo";
import type { ShopStats } from "@/lib/agent/types";
import { ProductImage } from "./ProductImage";

/** Price range of listed prices: «۳٫۲ تا ۴٫۶ میلیون». */
export function priceRange(p: Pick<Product, "price">): string {
  if (!p.price) return "قیمت ثبت نشده";
  const { min, max } = p.price;
  return min === max ? formatTomanShort(min) : `${formatTomanShort(min)} تا ${formatTomanShort(max)}`;
}

/** Compact row: picker lists, history, alternatives. */
export function ProductRow({
  product,
  href,
  trailing,
  onClick,
  sub,
}: {
  product: Product;
  href?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  sub?: React.ReactNode;
}) {
  const body = (
    <>
      <ProductImage product={product} size={52} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[14px] font-semibold leading-6">{product.title}</span>
        <span className="tabular mt-0.5 block text-[12.5px] text-muted">{sub ?? priceRange(product)}</span>
      </span>
      {trailing}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-start active:bg-surface-2";
  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Search result card: what it is, what it costs in Tehran, and where you can get it. */
export function ProductCard({
  product,
  stats,
  hiddenCount,
  compared,
  onCompare,
}: {
  product: Product;
  stats: ShopStats;
  hiddenCount?: number;
  compared?: boolean;
  onCompare?: () => void;
}) {
  return (
    <div className={`rounded-[var(--radius-card)] bg-surface p-3 transition-opacity ${stats.shops ? "" : "opacity-70"}`}>
      <Link href={`/p/${encodeURIComponent(product.id)}`} className="flex gap-3">
        <ProductImage product={product} size={76} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[14px] font-bold leading-6">{product.title}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted">
            {product.category}
            {product.brand ? `، ${product.brand}` : ""}
          </div>
          {stats.cheapest ? (
            <>
              <div className="tabular mt-1 text-[14px] font-extrabold">
                <span className="text-[11.5px] font-bold text-muted">از </span>
                {formatTomanShort(stats.cheapest)}
                <span className="text-[11px] font-bold text-muted"> تومان</span>
              </div>
              {product.price && product.price.min !== product.price.max && (
                <div className="tabular text-[11px] text-muted">بازه‌ی تهران: {priceRange(product)}</div>
              )}
            </>
          ) : (
            <div className="tabular mt-1 text-[14px] font-extrabold">
              {priceRange(product)}
              {product.price && <span className="text-[11px] font-bold text-muted"> تومان</span>}
            </div>
          )}
        </div>
      </Link>
      <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1">
            <Store className="size-3.5" />
            {stats.shops ? `${formatNumber(stats.shops)} فروشگاه` : hiddenCount ? "با فیلترهات فروشگاهی نموند" : "فروشگاه حضوری ثبت نشده"}
          </span>
          {stats.openNow > 0 && <span className="font-bold text-good">{formatNumber(stats.openNow)} تا بازه</span>}
          {stats.nearestM !== null && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {formatDistance(stats.nearestM)}
            </span>
          )}
          {stats.installment > 0 && (
            <span className="inline-flex items-center gap-1">
              <CreditCard className="size-3.5" />
              قسطی
            </span>
          )}
          {stats.confirmed > 0 && <span className="font-bold text-good">✓ {formatNumber(stats.confirmed)} تأییدشده</span>}
        </div>
        {onCompare && (
          <button
            onClick={onCompare}
            aria-pressed={compared}
            className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[12px] font-bold ${
              compared ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"
            }`}
          >
            {compared && <Check className="size-3.5" />}
            مقایسه
          </button>
        )}
      </div>
    </div>
  );
}
