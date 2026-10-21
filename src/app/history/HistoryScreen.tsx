"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookmarkCheck, History, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorNote, LinkButton, Skeleton } from "@/components/ui";
import { LEVEL_STYLE } from "@/components/VerdictCard";
import { api, errorMessage } from "@/lib/client-api";
import { formatToman, timeAgo } from "@/lib/format";
import type { VerdictLevel } from "@/lib/verdict";

interface Item {
  id: number;
  productId: string;
  productName: string;
  storePrice: number | null;
  paidPrice: number | null;
  onlineMedian: number | null;
  verdict: VerdictLevel | null;
  saved: boolean;
  updatedAt: number;
}

export function HistoryScreen() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [totalSaved, setTotalSaved] = useState(0);
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: Item[]; totalSaved: number }>("/api/history")
      .then((r) => {
        setError(null);
        setItems(r.items);
        setTotalSaved(r.totalSaved);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);
  useEffect(load, [load]);

  async function remove(id: number) {
    setItems((list) => list?.filter((i) => i.id !== id) ?? null);
    await api(`/api/history?id=${id}`, { method: "DELETE" }).catch(load);
  }

  const shown = items?.filter((i) => tab === "all" || i.saved) ?? null;

  return (
    <>
      <AppHeader title="ذخیره‌ها و تاریخچه" />
      <main className="px-4 pb-6">
        {totalSaved > 0 && (
          <div className="mb-3 rounded-3xl bg-gradient-to-br from-brand to-[#8a5cf6] p-5 text-white">
            <div className="text-[13px] opacity-90">جمع صرفه‌جویی‌هات</div>
            <div className="tabular mt-1 text-[26px] font-black">{formatToman(totalSaved)}</div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
          {(
            [
              ["all", "همه", History],
              ["saved", "ذخیره‌شده", BookmarkCheck],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[14px] font-bold ${
                tab === id ? "bg-surface text-brand shadow-sm" : "text-muted"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {error && <ErrorNote message={error} onRetry={load} />}
          {!shown && !error && [0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px]" />)}
          {shown?.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <History className="size-12 text-line" />
              <p className="text-[14px] text-muted">
                {tab === "saved" ? "هنوز چیزی ذخیره نکردی. روی نشانک بالای صفحه‌ی کالا بزن." : "هنوز کالایی ندیدی."}
              </p>
              <LinkButton href="/scan" className="mt-2">
                شناسایی اولین کالا
              </LinkButton>
            </div>
          )}
          {shown?.map((h) => (
            <div key={h.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
              <span className={`size-3 shrink-0 rounded-full ${h.verdict ? LEVEL_STYLE[h.verdict].bg : "bg-line"}`} />
              <Link
                href={`/p/${encodeURIComponent(h.productId)}${h.storePrice ? `?price=${h.storePrice}` : ""}`}
                className="min-w-0 flex-1"
              >
                <div className="line-clamp-2 text-[14px] font-semibold leading-6">{h.productName}</div>
                <div className="tabular mt-0.5 text-[12px] text-muted">
                  {h.paidPrice
                    ? `خریدی ${formatToman(h.paidPrice)}`
                    : h.storePrice
                      ? `مغازه ${formatToman(h.storePrice)}`
                      : h.onlineMedian
                        ? `معمول تهران ${formatToman(h.onlineMedian)}`
                        : ""}
                  {"، "}
                  {timeAgo(h.updatedAt)}
                </div>
              </Link>
              {h.saved && <BookmarkCheck className="size-4 shrink-0 text-brand" />}
              <button onClick={() => remove(h.id)} className="grid size-9 shrink-0 place-items-center rounded-full text-muted active:bg-surface-2" aria-label="حذف">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
