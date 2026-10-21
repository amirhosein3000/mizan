"use client";
// Identify a product: photo (vision) | barcode | text. Lands on /p/[id].
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Barcode, Camera, ImagePlus, Search, Type } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CandidatePicker, type Candidate } from "@/components/CandidatePicker";
import { ProductRow } from "@/components/ProductRow";
import { Button, ErrorNote, Skeleton } from "@/components/ui";
import { api, errorMessage } from "@/lib/client-api";
import { formatToman } from "@/lib/format";
import { fileToDataUrl } from "@/lib/image";
import type { MatchConfidence } from "@/lib/match";
import type { Product } from "@/lib/price/types";

type Mode = "photo" | "barcode" | "text";

const TABS: { id: Mode; label: string; icon: typeof Camera }[] = [
  { id: "photo", label: "عکس", icon: Camera },
  { id: "barcode", label: "بارکد", icon: Barcode },
  { id: "text", label: "اسم", icon: Type },
];

function productHref(id: string, price?: number | null) {
  return `/p/${encodeURIComponent(id)}${price ? `?price=${price}` : ""}`;
}

export function ScanScreen() {
  const search = useSearchParams();
  const router = useRouter();
  const initialMode = (search.get("mode") as Mode) || "photo";
  const [mode, setMode] = useState<Mode>(TABS.some((t) => t.id === initialMode) ? initialMode : "photo");

  function switchMode(m: Mode) {
    setMode(m);
    router.replace(`/scan?mode=${m}`, { scroll: false });
  }

  return (
    <>
      <AppHeader title="شناسایی کالا" back="/" />
      <div className="px-4">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = mode === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => switchMode(t.id)}
                className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-bold transition-colors ${
                  active ? "bg-surface text-brand shadow-sm" : "text-muted"
                }`}
              >
                <Icon className="size-[18px]" /> {t.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 pb-6">
          {mode === "photo" && <PhotoTab onTypeInstead={() => switchMode("text")} />}
          {mode === "barcode" && <BarcodeTab onTypeInstead={() => switchMode("text")} />}
          {mode === "text" && <TextTab initialQuery={search.get("q") ?? ""} />}
        </div>
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
            <span className="absolute inset-x-0 bottom-4 text-center text-sm font-bold text-white drop-shadow">چونه داره نگاه می‌کنه…</span>
          </div>
        )}
      </button>
      <Button variant="secondary" onClick={() => galleryRef.current?.click()} disabled={busy}>
        <ImagePlus className="size-5" /> انتخاب از گالری
      </Button>
      {input(cameraRef, true)}
      {input(galleryRef, false)}

      {error && <ErrorNote message={error} />}

      {result && (
        <div className="rise flex flex-col gap-3">
          {result.candidates.length > 0 ? (
            <>
              <div>
                <h3 className="text-[15px] font-extrabold">منظورت کدومه؟</h3>
                {result.reading && (
                  <p className="mt-1 text-[12px] text-muted">
                    چیزی که خوندم: <span dir="ltr">{result.reading.query}</span>
                    {result.reading.price ? ` · قیمت روی برچسب: ${formatToman(result.reading.price)}` : ""}
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

function BarcodeTab({ onTypeInstead }: { onTypeInstead: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);

  async function onDetected(code: string) {
    setError(null);
    try {
      const { product } = await api<{ product: Product }>(`/api/products/barcode?code=${encodeURIComponent(code)}`);
      router.push(productHref(product.id));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <BarcodeScanner key={scanKey} onDetected={onDetected} />
      {error && (
        <div className="flex flex-col gap-2">
          <ErrorNote message={error} onRetry={() => setScanKey((k) => k + 1)} />
          <Button variant="secondary" onClick={onTypeInstead}>
            جستجو با اسم
          </Button>
        </div>
      )}
    </div>
  );
}

interface SearchResult {
  product: Product;
  score: number;
  summary: Candidate["summary"];
}

function TextTab({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const [found, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ results: SearchResult[] }>(`/api/products/search?q=${encodeURIComponent(query)}&limit=12`, {
          signal: ctrl.signal,
        });
        setResults(res.results);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Short queries show nothing (stale results from a longer query are hidden).
  const results = q.trim().length >= 2 ? found : null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface px-4 focus-within:border-brand">
        <Search className="size-5 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="مثلاً گلکسی A56 یا Redmi Note 14"
          className="h-13 min-w-0 flex-1 bg-transparent py-3 text-[16px] outline-none"
          enterKeyHint="search"
          type="search"
        />
      </label>
      {error && <ErrorNote message={error} />}
      {loading && !results && (
        <div className="space-y-2">
          <Skeleton className="h-[72px]" />
          <Skeleton className="h-[72px]" />
        </div>
      )}
      {results && results.length === 0 && (
        <p className="p-4 text-center text-[14px] text-muted">چیزی پیدا نشد. اسم برند یا مدل رو امتحان کن.</p>
      )}
      <div className="flex flex-col gap-2">
        {results?.map((r) => (
          <ProductRow key={r.product.id} product={r.product} summary={r.summary} href={productHref(r.product.id)} />
        ))}
      </div>
    </div>
  );
}
