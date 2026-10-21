"use client";
import { useMemo, useState } from "react";
import { Share2, X } from "lucide-react";
import { formatNumber, formatToman, parsePrice, toFaDigits } from "@/lib/format";
import { APP_NAME } from "@/lib/persona";
import { Portal } from "./Portal";
import { Button } from "./ui";

export interface SavingsInput {
  productName: string;
  storePrice: number;
  median: number;
  suggestedPaid: number;
}

/** Savings vs. what the shopper would otherwise have paid (the higher of ask and typical online). */
export function computeSavings(storePrice: number, median: number, paid: number) {
  const vsAsk = Math.max(0, storePrice - paid);
  const vsMarket = Math.max(0, median - paid);
  return { vsAsk, vsMarket, best: Math.max(vsAsk, vsMarket) };
}

/** Draw a shareable 1080x1350 card. Pure canvas — no external libs. */
async function drawCard(productName: string, saved: number, paid: number): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#5b47e0");
  g.addColorStop(1, "#8a5cf6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Confetti dots
  const colors = ["#ffd166", "#06d6a0", "#ff6b6b", "#ffffff"];
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc((i * 337) % W, (i * 211) % (H * 0.45), 6 + (i % 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 64px ${font}`;
  ctx.fillText("امروز", W / 2, 470);
  ctx.font = `900 132px ${font}`;
  ctx.fillText(`${formatNumber(saved)}`, W / 2, 640);
  ctx.font = `800 64px ${font}`;
  ctx.fillText("تومان صرفه‌جویی کردم!", W / 2, 750);

  ctx.font = `500 40px ${font}`;
  ctx.globalAlpha = 0.9;
  const name = productName.length > 48 ? productName.slice(0, 46) + "…" : productName;
  ctx.fillText(name, W / 2, 880);
  ctx.fillText(`خریدم ${formatToman(paid)}`, W / 2, 940);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 300, 1110, 600, 120, 60);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 48px ${font}`;
  ctx.fillText(`با ${APP_NAME} چونه زدم 😉`, W / 2, 1188);

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

export function SavingsSheet({
  input,
  onClose,
  onConfirm,
}: {
  input: SavingsInput;
  onClose: () => void;
  onConfirm: (paid: number) => void;
}) {
  const [raw, setRaw] = useState(formatNumber(input.suggestedPaid));
  const [confirmed, setConfirmed] = useState(false);
  const [sharing, setSharing] = useState(false);
  const paid = parsePrice(raw) ?? 0;
  const s = useMemo(() => computeSavings(input.storePrice, input.median, paid), [input, paid]);

  async function share() {
    setSharing(true);
    try {
      const blob = await drawCard(input.productName, s.best, paid);
      if (!blob) return;
      const file = new File([blob], "mizan-savings.png", { type: "image/png" });
      const text = `امروز ${formatToman(s.best)} صرفه‌جویی کردم! با ${APP_NAME} 😉`;
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="rise mx-auto w-full max-w-[480px] rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold">{confirmed ? "مبارکه! 🎉" : "چند خریدی؟"}</h3>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-surface-2" aria-label="بستن">
            <X className="size-5" />
          </button>
        </div>

        {!confirmed ? (
          <>
            <label className="flex items-center gap-2 rounded-2xl border-2 border-line px-4 focus-within:border-brand">
              <input
                value={raw}
                onChange={(e) => {
                  const n = parsePrice(e.target.value);
                  setRaw(n ? formatNumber(n) : toFaDigits(e.target.value.replace(/[^\d۰-۹]/g, "")));
                }}
                inputMode="numeric"
                className="tabular h-14 flex-1 bg-transparent text-[18px] font-bold outline-none"
                aria-label="قیمت نهایی خرید"
              />
              <span className="text-sm text-muted">تومان</span>
            </label>
            <Button
              className="mt-4 w-full"
              disabled={!paid}
              onClick={() => {
                onConfirm(paid);
                setConfirmed(true);
              }}
            >
              ثبت خرید
            </Button>
          </>
        ) : (
          <div className="text-center">
            <div className="rounded-3xl bg-gradient-to-br from-brand to-[#8a5cf6] p-6 text-white">
              <div className="text-sm opacity-90">امروز</div>
              <div className="tabular pop-in my-1 text-[34px] font-black">{formatToman(s.best)}</div>
              <div className="text-[15px] font-bold">صرفه‌جویی کردی!</div>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-muted">
              {s.vsAsk > 0 && <>با چونه زدن {formatToman(s.vsAsk)} از قیمت اول فروشنده کم شد. </>}
              {s.vsMarket > 0 && <>{formatToman(s.vsMarket)} زیر قیمت معمول آنلاین خریدی.</>}
              {s.best === 0 && "این بار صرفه‌جویی نشد، ولی دست‌کم با چشم باز خریدی."}
            </p>
            {s.best > 0 && (
              <Button className="mt-4 w-full" onClick={share} disabled={sharing}>
                <Share2 className="size-5" /> اشتراک کارت صرفه‌جویی
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
