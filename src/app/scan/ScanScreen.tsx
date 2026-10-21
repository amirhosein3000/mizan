"use client";
// Identify a product from a photo (vision model) -> /p/[id]. Typing goes through the AskBox.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { AskBox } from "@/components/AskBox";
import { CandidatePicker, type Candidate } from "@/components/CandidatePicker";
import { Button, ErrorNote } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatToman } from "@/lib/format";
import { fileToDataUrl } from "@/lib/image";
import type { MatchConfidence } from "@/lib/match";

function productHref(id: string, price?: number | null) {
  return `/p/${encodeURIComponent(id)}${price ? `?price=${price}` : ""}`;
}

export function ScanScreen() {
  const [typing, setTyping] = useState(false);
  return (
    <>
      <AppHeader title="شناسایی با عکس" back="/" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {typing && <AskBox autoFocus placeholder="اسم یا مدلش رو بنویس…" />}
        <PhotoTab onTypeInstead={() => setTyping(true)} />
      </div>
    </>
  );
}

interface IdentifyResponse {
  reading: { brand: string; model: string; text: string; price: number | null; query: string } | null;
  candidates: Candidate[];
  confidence: MatchConfidence;
}

function PhotoTab({ onTypeInstead }: { onTypeInstead: () => void }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const image = await fileToDataUrl(file);
      setPreview(image);
      const res = await api<IdentifyResponse>("/api/identify", { body: { image } });
      if (res.confidence === "high" && res.candidates[0]) {
        router.push(productHref(res.candidates[0].product.id, res.reading?.price));
        return;
      }
      setResult(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const input = (ref: React.RefObject<HTMLInputElement | null>, capture: boolean) => (
    <input
      ref={ref}
      type="file"
      accept="image/*"
      {...(capture ? { capture: "environment" as const } : {})}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border-2 border-dashed border-brand/40 bg-brand-soft/50 text-brand active:bg-brand-soft"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="عکس کالا" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <Camera className="size-12" strokeWidth={1.6} />
            <span className="text-[15px] font-bold">از کالا یا جعبه‌اش عکس بگیر</span>
            <span className="text-[12px] text-muted">اگه برچسب قیمت هم تو عکس باشه، قیمت رو هم می‌خونم</span>
          </>
        )}
        {busy && (
          <div className="absolute inset-0 bg-brand/25">
            <div className="xray-sweep absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-transparent via-white/60 to-transparent" />
            <span className="absolute inset-x-0 bottom-4 text-center text-sm font-bold text-white drop-shadow">میزان داره نگاه می‌کنه…</span>
          </div>
        )}
      </button>
      <Button variant="secondary" onClick={() => galleryRef.current?.click()} disabled={busy}>
        <ImagePlus className="size-5" /> انتخاب از گالری
      </Button>
      {input(cameraRef, true)}
      {input(galleryRef, false)}

      {error && (
        <>
          <ErrorNote message={error} />
          <Button variant="ghost" onClick={onTypeInstead}>
            اسمش رو تایپ می‌کنم
          </Button>
        </>
      )}

      {result && (
        <div ref={resultRef} className="rise flex scroll-mt-16 flex-col gap-3">
          {result.candidates.length > 0 ? (
            <>
              <div>
                <h3 className="text-[15px] font-extrabold">منظورت کدومه؟</h3>
                {result.reading && (
                  <p className="mt-1 text-[12px] text-muted">
                    چیزی که خوندم: <span dir="ltr">{result.reading.query}</span>
                    {result.reading.price ? `، قیمت روی برچسب: ${formatToman(result.reading.price)}` : ""}
                  </p>
                )}
              </div>
              <CandidatePicker
                candidates={result.candidates}
                onPick={(c) => router.push(productHref(c.product.id, result.reading?.price))}
              />
            </>
          ) : (
            <p className="rounded-2xl bg-surface p-4 text-[14px] leading-7">
              این عکس رو نشناختم. یه عکس نزدیک‌تر از اسم یا مدل روی جعبه بگیر، یا اسمش رو تایپ کن.
            </p>
          )}
          <Button variant="ghost" onClick={onTypeInstead}>
            هیچ‌کدوم — اسمش رو تایپ می‌کنم
          </Button>
        </div>
      )}
    </div>
  );
}
