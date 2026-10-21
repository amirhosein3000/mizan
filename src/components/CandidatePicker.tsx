"use client";
import { formatPercent } from "@/lib/format";
import type { PriceSummary, Product } from "@/lib/catalog/types";
import { ProductRow } from "./ProductRow";

export interface Candidate {
  product: Product;
  score: number;
  summary: PriceSummary | null;
}

/** Shown when the match is not confident: "Which one is it?" */
export function CandidatePicker({ candidates, onPick }: { candidates: Candidate[]; onPick: (c: Candidate) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {candidates.map((c) => (
        <ProductRow
          key={c.product.id}
          product={c.product}
          onClick={() => onPick(c)}
          trailing={
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[11px] font-bold text-muted">
              {formatPercent(c.score)}
            </span>
          }
        />
      ))}
    </div>
  );
}
