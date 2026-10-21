import Link from "next/link";
import { formatToman } from "@/lib/format";
import type { PriceSummary, Product } from "@/lib/price/types";
import { CATEGORY_ICONS, CATEGORY_TINT, SUBCATEGORY_ICONS } from "./icons";
import { Package } from "lucide-react";

export function ProductIconTile({ product, size = "md" }: { product: Pick<Product, "category" | "subcategory">; size?: "sm" | "md" | "lg" }) {
  const Icon = SUBCATEGORY_ICONS[product.subcategory] ?? CATEGORY_ICONS[product.category] ?? Package;
  const box = size === "lg" ? "size-16 rounded-2xl" : size === "sm" ? "size-10 rounded-xl" : "size-12 rounded-2xl";
  const icon = size === "lg" ? "size-8" : size === "sm" ? "size-5" : "size-6";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${CATEGORY_TINT[product.category] ?? "bg-surface-2 text-muted"}`}>
      <Icon className={icon} strokeWidth={1.8} />
    </span>
  );
}

export function ProductRow({
  product,
  summary,
  href,
  trailing,
  onClick,
}: {
  product: Product;
  summary?: PriceSummary | null;
  href?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <ProductIconTile product={product} />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[14px] font-semibold leading-6">{product.nameFa}</span>
        {summary ? (
          <span className="tabular mt-0.5 block text-[13px] text-muted">
            از <b className="font-bold text-ink">{formatToman(summary.min)}</b>
          </span>
        ) : (
          <span className="mt-0.5 block text-[13px] text-muted">قیمت آنلاین موجود نیست</span>
        )}
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
