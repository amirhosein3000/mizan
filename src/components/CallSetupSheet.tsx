"use client";
// "Let Mizan call": choose what to ask, confirm which shops, start the mission.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, PhoneCall } from "lucide-react";
import type { Product } from "@/lib/catalog/types";
import { ASK_LABEL, type Ask } from "@/lib/agent/call-sim";
import { api, errorMessage } from "@/lib/client-api";
import { formatNumber } from "@/lib/format";
import type { RankedShop } from "@/lib/shop/rank";
import { useShopper } from "@/lib/shopper-store";
import { Sheet } from "./Sheet";
import { Button, ErrorNote } from "./ui";

const OPTIONAL: Ask[] = ["price", "hold", "installment", "warranty"];

export function CallSetupSheet({
  product,
  shops,
  auto,
  onClose,
}: {
  product: Product;
  /** Shops that will be called (picked by the shopper, or the agent's top picks). */
  shops: RankedShop[];
  /** True when the agent picked the shops. */
  auto: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { ctx } = useShopper();
  const [asks, setAsks] = useState<Ask[]>(() => {
    const a: Ask[] = ["price", "hold"];
    if (ctx.installment) a.push("installment");
    if (ctx.warranty) a.push("warranty");
    return a;
  });
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { id } = await api<{ id: string }>("/api/missions", {
        body: {
          productId: product.id,
          context: ctx,
          asks: ["stock", ...asks],
          question: question.trim() || undefined,
          shopIds: auto ? [] : shops.map((s) => s.shop.id),
        },
      });
      router.push(`/m/${id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="میزان برات زنگ بزنه"
      onClose={onClose}
      footer={
        <Button className="w-full" onClick={start} disabled={busy || !shops.length}>
          <PhoneCall className="size-5" />
          {busy ? "در حال شروع…" : `زنگ بزن به ${formatNumber(shops.length)} فروشگاه`}
        </Button>
      }
    >
      <p className="text-[13px] leading-6 text-muted">
        هم‌زمان زنگ می‌زنم، موجودی و قیمت امروز رو می‌پرسم و نتیجه رو برات خلاصه می‌کنم. اگه یکی بسته بود یا نداشت، خودم جایگزین نزدیکش رو می‌گیرم.
      </p>

      <div className="mt-4 text-[13px] font-extrabold">چی بپرسم؟</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand px-3 text-[13px] font-bold text-white">
          <Check className="size-4" /> {ASK_LABEL.stock}
        </span>
        {OPTIONAL.map((a) => {
          const on = asks.includes(a);
          return (
            <button
              key={a}
              onClick={() => setAsks((x) => (on ? x.filter((y) => y !== a) : [...x, a]))}
              aria-pressed={on}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold ${
                on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"
              }`}
            >
              {on && <Check className="size-4" />}
              {ASK_LABEL[a]}
            </button>
          );
        })}
      </div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        maxLength={200}
        placeholder="سؤال دیگه؟ مثلاً «رنگ مشکی داره؟»"
        className="mt-3 h-11 w-full rounded-2xl border border-line bg-surface px-3 text-[14px] outline-none focus:border-brand"
      />

      <div className="mt-4 text-[13px] font-extrabold">{auto ? "فروشگاه‌هایی که انتخاب کردم" : "فروشگاه‌هایی که انتخاب کردی"}</div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {shops.map((s, i) => (
          <li key={s.shop.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
            <span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[11px] font-black text-brand">
              {formatNumber(i + 1)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-bold">{s.shop.name}</span>
              <span className="block truncate text-[11.5px] text-muted">{s.reasons.slice(0, 2).map((r) => r.text).join(" • ")}</span>
            </span>
          </li>
        ))}
      </ul>
      {auto && <p className="mt-2 text-[12px] text-muted">برای انتخاب خودت، کنار فروشگاه‌ها تیک بزن.</p>}
      <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-[11.5px] leading-5 text-muted">
        شماره‌های دیتاست نمایشی‌اند؛ برای همین طرف فروشنده‌ی این تماس‌ها شبیه‌سازی می‌شه (بر اساس ساعت کاری و تازگی قیمت)، مگر اینکه فروشنده از «پنل فروشنده» آنلاین باشه و خودش جواب بده.
      </p>
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </Sheet>
  );
}
