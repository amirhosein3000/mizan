"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ListChecks, Plus, Trash2, Wallet } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PriceField } from "@/components/PriceField";
import { Card, ErrorNote, Skeleton } from "@/components/ui";
import { VoiceButton } from "@/components/VoiceButton";
import { isEnabled } from "@/config/features";
import { api, errorMessage } from "@/lib/client-api";
import { formatToman, formatTomanShort } from "@/lib/format";
import { listTotals, onlineGap } from "./logic";
import type { ShoppingItem } from "./schema";

interface ListResponse {
  items: ShoppingItem[];
  budget: number | null;
}

export function ListScreen() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (p: Promise<ListResponse>) => {
    try {
      setData(await p);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    api<ListResponse>("/api/list")
      .then(setData)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  async function add(value = text) {
    if (!value.trim()) return;
    setBusy(true);
    await run(api<ListResponse>("/api/list", { body: { text: value } }));
    setText("");
    setBusy(false);
  }

  const patch = (body: Record<string, unknown>) => run(api<ListResponse>("/api/list", { method: "PATCH", body }));
  const remove = (q: string) => run(api<ListResponse>(`/api/list?${q}`, { method: "DELETE" }));

  const items = data?.items ?? [];
  const totals = listTotals(items);
  const budget = data?.budget ?? null;
  const pct = budget ? Math.min(1, totals.spent / budget) : 0;
  const over = budget ? totals.spent > budget : false;

  return (
    <>
      <AppHeader title="لیست خرید" back="/tools" />
      <main className="space-y-3 px-4 pb-6">
        {/* Budget */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[14px] font-extrabold">
              <Wallet className="size-5 text-brand" /> بودجه
            </div>
            <PriceField
              key={budget ?? "none"}
              value={budget}
              onCommit={(v) => patch({ budget: v })}
              placeholder="مثلاً ۲ میلیون"
              className="h-10 w-40"
              aria-label="بودجه به تومان"
            />
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full transition-all ${over ? "bg-high" : "bg-good"}`} style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="tabular mt-2 flex justify-between text-[12px] text-muted">
            <span>
              خرج‌شده: <b className={over ? "text-high" : "text-ink"}>{formatToman(totals.spent)}</b>
            </span>
            {budget ? (
              <span>{over ? `${formatTomanShort(totals.spent - budget)} بیشتر از بودجه` : `مونده: ${formatTomanShort(budget - totals.spent)}`}</span>
            ) : (
              <span>تخمین کل: {formatTomanShort(totals.estimatedTotal)}</span>
            )}
          </div>
          {totals.overpay > 0 && (
            <p className="mt-2 rounded-xl bg-fair-soft px-3 py-2 text-[12px] font-semibold text-fair">
              این خریدها آنلاین حدود {formatToman(totals.overpay)} ارزون‌تر درمیاد.
            </p>
          )}
        </Card>

        {/* Add */}
        <form
          className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface p-1.5 ps-4 focus-within:border-brand"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="مثلاً: شیر کاله، چای گلستان، ماکارونی"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            enterKeyHint="done"
          />
          {isEnabled("voice") && <VoiceButton onText={(t) => add(t)} />}
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="grid size-10 place-items-center rounded-xl bg-brand text-white disabled:opacity-40"
            aria-label="افزودن"
          >
            <Plus className="size-5" />
          </button>
        </form>
        <p className="px-1 text-[11px] text-muted">چند تا رو با «،» یا خط جدید جدا کن. توی مغازه تیک بزن و قیمت رو بنویس.</p>

        {error && <ErrorNote message={error} />}
        {!data && !error && <Skeleton className="h-40" />}

        {data && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[14px] text-muted">
            <ListChecks className="size-12 text-line" />
            لیستت خالیه. قبل از رفتن به فروشگاه بنویسش.
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const gap = onlineGap(item);
            return (
              <li key={item.id} className={`rounded-2xl bg-surface p-3 ${item.done ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => patch({ id: item.id, done: !item.done })}
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border-2 ${
                      item.done ? "border-good bg-good text-white" : "border-line"
                    }`}
                    aria-label={item.done ? "برداشتن تیک" : "تیک زدن"}
                    aria-pressed={item.done}
                  >
                    {item.done && <Check className="size-4" strokeWidth={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[15px] font-bold ${item.done ? "line-through" : ""}`}>{item.text}</div>
                    {item.productId ? (
                      <Link href={`/p/${encodeURIComponent(item.productId)}`} className="mt-0.5 block truncate text-[11px] text-muted">
                        {item.productName}، آنلاین حدود {formatTomanShort(item.onlineMedian ?? 0)}
                      </Link>
                    ) : (
                      <div className="mt-0.5 text-[11px] text-muted">قیمت آنلاینش رو پیدا نکردم</div>
                    )}
                  </div>
                  <button onClick={() => remove(`id=${item.id}`)} className="grid size-8 shrink-0 place-items-center text-muted" aria-label="حذف">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 ps-10">
                  <PriceField
                    value={item.price}
                    onCommit={(v) => patch({ id: item.id, price: v, done: v ? true : item.done })}
                    placeholder="قیمت مغازه"
                    className="h-9 w-36"
                    aria-label={`قیمت ${item.text}`}
                  />
                  {gap !== null &&
                    (gap > (item.onlineMedian ?? 0) * 0.02 ? (
                      <span className="text-[11px] font-bold text-high">آنلاین {formatTomanShort(gap)} ارزون‌تره</span>
                    ) : (
                      <span className="text-[11px] font-bold text-good">قیمت خوبه 👍</span>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>

        {totals.doneCount > 0 && (
          <button onClick={() => remove("done=1")} className="w-full py-2 text-[13px] font-bold text-muted">
            پاک کردن تیک‌خورده‌ها
          </button>
        )}
      </main>
    </>
  );
}
