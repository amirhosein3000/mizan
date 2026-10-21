"use client";
import { useState } from "react";
import { BadgeCheck, ChevronDown, Megaphone, ThumbsUp, TriangleAlert } from "lucide-react";
import { formatToman } from "@/lib/format";
import type { CategoryId, PriceSummary } from "@/lib/price/types";
import { CHECKLISTS, negotiationLine, type Verdict, type VerdictLevel } from "@/lib/verdict";
import { NegotiationSheet } from "./NegotiationSheet";
import { Portal } from "./Portal";
import { Button } from "./ui";

export const LEVEL_STYLE: Record<VerdictLevel, { bg: string; fg: string; soft: string; label: string }> = {
  good: { bg: "bg-good", fg: "text-good", soft: "bg-good-soft", label: "خوب" },
  fair: { bg: "bg-fair", fg: "text-fair", soft: "bg-fair-soft", label: "منصفانه" },
  high: { bg: "bg-high", fg: "text-high", soft: "bg-high-soft", label: "گرون" },
};

function LevelIcon({ level, warn }: { level: VerdictLevel; warn: boolean }) {
  if (warn) return <TriangleAlert className="size-7" />;
  if (level === "good") return <ThumbsUp className="size-7" />;
  if (level === "fair") return <BadgeCheck className="size-7" />;
  return <TriangleAlert className="size-7" />;
}

export function VerdictCard({
  verdict,
  summary,
  category,
  onBought,
  showNegotiation = true,
}: {
  verdict: Verdict;
  summary: PriceSummary;
  category: CategoryId;
  onBought?: () => void;
  showNegotiation?: boolean;
}) {
  const [checkOpen, setCheckOpen] = useState(verdict.suspiciouslyCheap);
  const [sheet, setSheet] = useState(false);
  // A suspiciously cheap price is a caution, not a celebration: show it in amber.
  const s = LEVEL_STYLE[verdict.suspiciouslyCheap ? "fair" : verdict.level];
  const line = negotiationLine(verdict, summary);
  const diff = verdict.diffFromMedian;

  return (
    <section className="rise overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[0_1px_2px_rgba(20,10,60,0.06)]">
      <div className={`${s.bg} flex items-center gap-3 px-4 py-4 text-white`}>
        <LevelIcon level={verdict.level} warn={verdict.suspiciouslyCheap || verdict.abovePrintedPrice} />
        <div className="min-w-0">
          <div className="text-[19px] font-black leading-7">{verdict.title}</div>
          <div className="text-[13px] opacity-90">داوری ترازو</div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-[14px] leading-7">{verdict.reason}</p>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className={`${s.soft} rounded-2xl p-3`}>
            <div className="text-[11px] text-muted">نسبت به قیمت معمول</div>
            <div className={`tabular text-[15px] font-extrabold ${s.fg}`}>
              {diff === 0 ? "هم‌قیمت" : `${formatToman(Math.abs(diff))} ${diff > 0 ? "گرون‌تر" : "ارزون‌تر"}`}
            </div>
          </div>
          <div className="rounded-2xl bg-surface-2 p-3">
            <div className="text-[11px] text-muted">قیمت پیشنهادی برای چونه</div>
            <div className="tabular text-[15px] font-extrabold text-brand">{formatToman(verdict.targetPrice)}</div>
          </div>
        </div>

        {showNegotiation && (
          <div className="rounded-2xl border border-dashed border-brand/40 bg-brand-soft/60 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-brand">
              <Megaphone className="size-4" /> اینو به فروشنده بگو
            </div>
            <p className="text-[14px] font-semibold leading-7">«{line}»</p>
            <Button variant="primary" className="mt-3 h-11 w-full" onClick={() => setSheet(true)}>
              نشون دادن به فروشنده
            </Button>
          </div>
        )}

        <div className="rounded-2xl bg-surface-2">
          <button
            className="flex w-full items-center justify-between px-3 py-3 text-[14px] font-bold"
            onClick={() => setCheckOpen((v) => !v)}
            aria-expanded={checkOpen}
          >
            قبل از پرداخت چک کن
            <ChevronDown className={`size-5 transition-transform ${checkOpen ? "rotate-180" : ""}`} />
          </button>
          {checkOpen && (
            <ul className="space-y-2 px-3 pb-3 text-[13px] leading-6 text-ink/90">
              {CHECKLISTS[category].map((c) => (
                <li key={c} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {onBought && (
          <Button variant="secondary" className="w-full" onClick={onBought}>
            خریدمش! 🎉
          </Button>
        )}
      </div>
      {sheet && (
        <Portal>
          <NegotiationSheet line={line} target={verdict.targetPrice} onClose={() => setSheet(false)} />
        </Portal>
      )}
    </section>
  );
}
