"use client";
// HERO MOMENT — Price X-ray camera. Point at a shelf; each recognised product
// gets a live badge: green = good deal, yellow = fair, red = overpriced vs online.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Radio, RotateCcw, Sparkles, X, Zap } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { drawDemoShelf, type ShelfItem } from "@/lib/demo-shelf";
import { formatNumber, formatToman, formatTomanShort } from "@/lib/format";
import { fileToDataUrl, videoFrameToDataUrl } from "@/lib/image";
import type { PriceSummary, Product } from "@/lib/price/types";
import { CAMERA_MESSAGES, useCamera } from "@/lib/use-camera";
import type { Verdict, VerdictLevel } from "@/lib/verdict";
import { LEVEL_STYLE } from "@/components/VerdictCard";

interface XrayItem {
  key: string;
  bbox: [number, number, number, number] | null;
  label: string;
  storePrice: number | null;
  match: { product: Product; score: number; summary: PriceSummary | null; verdict: Verdict | null } | null;
}

type Phase = "camera" | "scanning" | "result";

const LIVE_INTERVAL_MS = 3500;
const DEMO_SETS = ["mobile", "grocery", "appliance"] as const;

export function XrayScreen() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [frame, setFrame] = useState<string | null>(null);
  const [aspect, setAspect] = useState(3 / 4);
  const [items, setItems] = useState<XrayItem[]>([]);
  const [selected, setSelected] = useState<XrayItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const busy = useRef(false);
  const camera = useCamera(videoRef, phase === "camera" || live);

  const scan = useCallback(async (image: string, hints?: string[], keepPhase = false) => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    if (!keepPhase) setPhase("scanning");
    try {
      const res = await api<{ items: XrayItem[] }>("/api/xray", { body: { image, hints } });
      setItems(res.items);
      if (!keepPhase) setPhase("result");
      if (res.items.some((i) => i.match)) navigator.vibrate?.([30, 40, 30]);
    } catch (err) {
      setError(errorMessage(err));
      if (!keepPhase) setPhase(frame ? "result" : "camera");
    } finally {
      busy.current = false;
    }
  }, [frame]);

  function snap() {
    const v = videoRef.current;
    if (!v || camera !== "on" || !v.videoWidth) return;
    const img = videoFrameToDataUrl(v);
    setAspect(v.videoWidth / v.videoHeight);
    setFrame(img);
    setItems([]);
    scan(img);
  }

  async function fromFile(file: File) {
    const img = await fileToDataUrl(file);
    const probe = new Image();
    probe.onload = () => setAspect(probe.width / probe.height);
    probe.src = img;
    setFrame(img);
    setItems([]);
    setLive(false);
    scan(img);
  }

  async function demoShelf() {
    setError(null);
    setLive(false);
    try {
      const { results } = await api<{ results: { product: Product; summary: PriceSummary | null }[] }>("/api/products/featured?limit=40");
      const cat = DEMO_SETS[demoIdx % DEMO_SETS.length];
      setDemoIdx((i) => i + 1);
      const shelf = results.filter((r): r is ShelfItem => r.product.category === cat && !!r.summary).slice(0, 4);
      if (shelf.length === 0) throw new Error("empty demo shelf");
      const { dataUrl, hints } = drawDemoShelf(shelf);
      setAspect(1200 / 900);
      setFrame(dataUrl);
      setItems([]);
      scan(dataUrl, hints);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Live mode: grab a frame every few seconds and refresh badges over the video.
  useEffect(() => {
    if (!live || camera !== "on") return;
    const tick = () => {
      const v = videoRef.current;
      if (!v?.videoWidth || busy.current) return;
      setAspect(v.videoWidth / v.videoHeight);
      scan(videoFrameToDataUrl(v, 800, 0.7), undefined, true);
    };
    tick();
    const t = setInterval(tick, LIVE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [live, camera, scan]);

  function reset() {
    setPhase("camera");
    setFrame(null);
    setItems([]);
    setSelected(null);
    setError(null);
  }

  const showVideo = phase === "camera" || live;
  const counts = items.reduce<Record<VerdictLevel, number>>(
    (acc, i) => {
      const l = i.match?.verdict?.level;
      if (l) acc[l]++;
      return acc;
    },
    { good: 0, fair: 0, high: 0 },
  );
  const overpaySum = items.reduce((acc, i) => {
    const v = i.match?.verdict;
    return v && v.level !== "good" && v.diffFromMedian > 0 ? acc + v.diffFromMedian : acc;
  }, 0);

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-[480px] flex-col bg-[#0d0b1a] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/" className="grid size-10 place-items-center rounded-full bg-white/10" aria-label="بستن">
          <X className="size-5" />
        </Link>
        <div className="flex items-center gap-1.5 text-[15px] font-extrabold">
          <Zap className="size-4 text-[#ffd166]" fill="currentColor" /> اشعه‌ی ایکس قیمت
        </div>
        <button
          onClick={() => {
            setLive((v) => !v);
            setPhase("camera");
            setFrame(null);
            setItems([]);
          }}
          className={`flex h-9 items-center gap-1 rounded-full px-3 text-[12px] font-bold ${live ? "bg-high text-white" : "bg-white/10"}`}
          aria-pressed={live}
        >
          <Radio className="size-4" /> {live ? "زنده" : "حالت زنده"}
        </button>
      </div>

      {/* Viewport */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3">
        <div
          className="relative overflow-hidden rounded-3xl bg-black"
          // Fit inside the free space whatever the photo's orientation.
          style={{ aspectRatio: aspect, width: `min(100%, calc((100dvh - 260px) * ${aspect}))` }}
        >
          {showVideo ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 size-full object-contain"
              onLoadedMetadata={(e) => setAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight || 3 / 4)}
            />
          ) : (
            frame && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={frame} alt="عکس قفسه" className="absolute inset-0 size-full object-contain" />
            )
          )}

          {phase === "scanning" && (
            <div className="pointer-events-none absolute inset-0 bg-[#5b47e0]/15">
              <div className="xray-sweep absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[#8a5cf6]/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-4 text-center text-sm font-bold">چونه داره قیمت‌ها رو می‌سنجه…</div>
            </div>
          )}

          {(phase === "result" || live) &&
            items.map((item, i) => <Badge key={item.key} item={item} index={i} onTap={() => setSelected(item)} />)}

          {showVideo && (camera === "denied" || camera === "unavailable") && (
            <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm leading-7 text-white/90">
              {CAMERA_MESSAGES[camera]}
            </div>
          )}
        </div>
      </div>

      {/* Summary / errors */}
      <div className="min-h-[56px] px-4 pt-3">
        {error ? (
          <p className="rounded-2xl bg-high/20 px-3 py-2 text-center text-[13px]">{error}</p>
        ) : phase === "result" && items.length > 0 ? (
          <div className="rise flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2 text-[13px]">
            <span className="flex gap-2 font-bold">
              {counts.good > 0 && <span className="text-[#4ade80]">{formatNumber(counts.good)} خوب</span>}
              {counts.fair > 0 && <span className="text-[#facc15]">{formatNumber(counts.fair)} منصفانه</span>}
              {counts.high > 0 && <span className="text-[#f87171]">{formatNumber(counts.high)} گرون</span>}
            </span>
            {overpaySum > 0 && <span className="tabular text-white/80">جای چونه: {formatTomanShort(overpaySum)} تومان</span>}
          </div>
        ) : phase === "result" ? (
          <p className="text-center text-[13px] text-white/70">کالایی تشخیص داده نشد. نزدیک‌تر شو و برچسب‌ها رو واضح بگیر.</p>
        ) : (
          <p className="text-center text-[13px] text-white/70">
            {live ? "دوربین رو آروم روی قفسه بچرخون…" : "دوربین رو بگیر سمت قفسه یا ویترین و دکمه رو بزن."}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-around px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
        <button onClick={() => fileRef.current?.click()} className="flex w-16 flex-col items-center gap-1 text-[11px] text-white/80">
          <span className="grid size-12 place-items-center rounded-full bg-white/10">
            <ImagePlus className="size-5" />
          </span>
          گالری
        </button>
        {phase === "result" ? (
          <button onClick={reset} className="grid size-[72px] place-items-center rounded-full bg-white text-[#0d0b1a]" aria-label="اسکن دوباره">
            <RotateCcw className="size-7" />
          </button>
        ) : (
          <button
            onClick={snap}
            disabled={phase === "scanning" || camera !== "on" || live}
            className="grid size-[72px] place-items-center rounded-full border-4 border-white/90 disabled:opacity-40"
            aria-label="اسکن"
          >
            <span className="size-14 rounded-full bg-gradient-to-br from-[#5b47e0] to-[#8a5cf6]" />
          </button>
        )}
        <button onClick={demoShelf} className="flex w-16 flex-col items-center gap-1 text-[11px] text-white/80">
          <span className="grid size-12 place-items-center rounded-full bg-white/10">
            <Sparkles className="size-5" />
          </span>
          قفسه‌ی نمونه
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) fromFile(f);
          e.target.value = "";
        }}
      />

      {selected && <BadgeSheet item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Badge({ item, index, onTap }: { item: XrayItem; index: number; onTap: () => void }) {
  if (!item.bbox) return null;
  const [x, y, w] = item.bbox;
  const level = item.match?.verdict?.level;
  const style = level ? LEVEL_STYLE[level] : null;
  const median = item.match?.summary?.median;
  return (
    <button
      onClick={onTap}
      className="pop-in absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${(x + w / 2) * 100}%`, top: `${y * 100}%`, animationDelay: `${index * 90}ms` }}
    >
      <span
        className={`flex flex-col items-center rounded-2xl px-2.5 py-1 shadow-[0_6px_18px_rgba(0,0,0,0.45)] ring-2 ring-white ${
          style ? `${style.bg} text-white` : item.match ? "bg-white text-[#0d0b1a]" : "bg-zinc-500 text-white"
        }`}
      >
        <span className="text-[12px] font-black leading-5">
          {style ? style.label : item.match ? "قیمت آنلاین" : "ناشناس"}
        </span>
        {median ? (
          <span className="tabular whitespace-nowrap text-[10px] font-semibold leading-4 opacity-95">آنلاین {formatTomanShort(median)}</span>
        ) : null}
      </span>
    </button>
  );
}

function BadgeSheet({ item, onClose }: { item: XrayItem; onClose: () => void }) {
  const m = item.match;
  const v = m?.verdict;
  const style = v ? LEVEL_STYLE[v.level] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="rise mx-auto w-full max-w-[480px] rounded-t-3xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ink"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {m ? (
          <>
            <div className="flex items-start gap-3">
              {style && <span className={`mt-1.5 size-3 shrink-0 rounded-full ${style.bg}`} />}
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-extrabold leading-7">{m.product.nameFa}</div>
                {v && <div className={`text-[14px] font-bold ${style?.fg}`}>{v.title}</div>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-surface-2 p-3">
                <div className="text-[11px] text-muted">قیمت مغازه</div>
                <div className="tabular text-[15px] font-extrabold">{item.storePrice ? formatToman(item.storePrice) : "—"}</div>
              </div>
              <div className="rounded-2xl bg-surface-2 p-3">
                <div className="text-[11px] text-muted">معمول آنلاین</div>
                <div className="tabular text-[15px] font-extrabold">{m.summary ? formatToman(m.summary.median) : "—"}</div>
              </div>
            </div>
            {v && <p className="mt-3 text-[13px] leading-6 text-muted">{v.reason}</p>}
            <Link
              href={`/p/${encodeURIComponent(m.product.id)}${item.storePrice ? `?price=${item.storePrice}` : ""}`}
              className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-brand font-bold text-white"
            >
              داوری کامل و جمله‌ی چونه
            </Link>
          </>
        ) : (
          <>
            <div className="text-[15px] font-extrabold">این یکی رو نشناختم</div>
            <p className="mt-2 text-[13px] leading-6 text-muted">چیزی که خوندم: «{item.label}». اسمش رو جستجو کن.</p>
            <Link href={`/scan?mode=text&q=${encodeURIComponent(item.label)}`} className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-brand font-bold text-white">
              جستجوی دستی
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
