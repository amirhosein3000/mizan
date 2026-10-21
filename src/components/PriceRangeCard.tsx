import { formatNumber, formatToman, formatTomanShort } from "@/lib/format";
import type { PriceSummary } from "@/lib/price/types";
import type { VerdictLevel } from "@/lib/verdict";
import { Card } from "./ui";

const MARKER_COLOR: Record<VerdictLevel, string> = {
  good: "bg-good",
  fair: "bg-fair",
  high: "bg-high",
};

/**
 * Online price range, Torob-style: min / typical / max across sellers.
 * RTL: cheapest sits on the right (inline-start), priciest on the left.
 */
export function PriceRangeCard({
  summary,
  storePrice,
  level,
}: {
  summary: PriceSummary;
  storePrice?: number | null;
  level?: VerdictLevel;
}) {
  const lo = Math.min(summary.min, storePrice ?? Infinity);
  const hi = Math.max(summary.max, storePrice ?? 0);
  const span = Math.max(1, hi - lo);
  const pos = (v: number) => `${((v - lo) / span) * 100}%`;

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-extrabold">قیمت آنلاین</h3>
        <span className="text-xs text-muted">از {formatNumber(summary.count)} فروشنده</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2 text-center">
        <div className="flex-1">
          <div className="text-[11px] text-muted">ارزون‌ترین</div>
          <div className="tabular text-[15px] font-extrabold text-good">{formatTomanShort(summary.min)}</div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted">قیمت معمول</div>
          <div className="tabular text-[19px] font-black">{formatTomanShort(summary.median)}</div>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted">گرون‌ترین</div>
          <div className="tabular text-[15px] font-extrabold text-high">{formatTomanShort(summary.max)}</div>
        </div>
      </div>

      <div className="relative mt-4 h-9">
        <div className="absolute inset-x-0 top-3.5 h-2 rounded-full bg-linear-to-l from-good via-fair to-high opacity-25" />
        <div
          className="absolute top-3.5 h-2 rounded-full bg-linear-to-l from-good via-fair to-high"
          style={{ insetInlineStart: pos(summary.min), width: `calc(${pos(summary.max)} - ${pos(summary.min)})` }}
        />
        <span
          className="absolute top-2 h-5 w-[3px] translate-x-1/2 rounded bg-ink/70"
          style={{ insetInlineStart: pos(summary.median) }}
          title="قیمت معمول"
        />
        {storePrice ? (
          <span
            className="pop-in absolute top-0 flex translate-x-1/2 flex-col items-center"
            style={{ insetInlineStart: pos(storePrice) }}
          >
            <span className={`size-6 rounded-full border-[3px] border-white shadow-md ${level ? MARKER_COLOR[level] : "bg-brand"}`} />
          </span>
        ) : null}
      </div>
      {storePrice ? (
        <p className="tabular mt-1 text-center text-xs text-muted">
          نقطه‌ی رنگی = قیمت مغازه ({formatToman(storePrice)})
        </p>
      ) : null}
      {summary.cheapestSeller && (
        <p className="mt-2 text-xs text-muted">
          ارزون‌ترین پیشنهاد: <b className="text-ink">{summary.cheapestSeller}</b>
        </p>
      )}
    </Card>
  );
}
