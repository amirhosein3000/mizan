"use client";
import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { toEnDigits } from "@/lib/format";
import { useCamera } from "@/lib/use-camera";
import { Button } from "./ui";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = {
  new (opts: { formats: string[] }): Detector;
  getSupportedFormats?: () => Promise<string[]>;
};

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];

/**
 * Live barcode scanning: native BarcodeDetector when available (Android Chrome),
 * ZXing fallback elsewhere (iOS Safari, desktop). Manual entry always available.
 */
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const status = useCamera(videoRef);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (status !== "on") return;
    let stop = () => {};
    let cancelled = false;
    const found = (code: string) => {
      if (done.current) return;
      done.current = true;
      navigator.vibrate?.(60);
      onDetected(code);
    };

    (async () => {
      const Native = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      const supported = Native ? await Native.getSupportedFormats?.().catch(() => []) : [];
      if (Native && supported?.includes("ean_13")) {
        const detector = new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
        const timer = setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2) return;
          const codes = await detector.detect(v).catch(() => []);
          if (codes[0]?.rawValue) found(codes[0].rawValue);
        }, 250);
        stop = () => clearInterval(timer);
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result) found(result.getText());
        });
        stop = () => controls.stop();
      }
    })().catch(() => setShowManual(true));

    return () => {
      cancelled = true;
      stop();
    };
  }, [status, onDetected]);

  const failed = status === "denied" || status === "unavailable";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} playsInline muted className="size-full object-cover" />
        {!failed && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-28 w-64 rounded-2xl border-[3px] border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <span className="xray-sweep absolute inset-x-2 top-0 h-0.5 bg-high shadow-[0_0_12px_2px_rgba(224,57,62,0.8)]" />
            </div>
          </div>
        )}
        {status === "starting" && <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/80">در حال روشن کردن دوربین…</p>}
        {failed && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm leading-7 text-white">
            {status === "denied" ? "اجازه‌ی دوربین داده نشده." : "دوربین در دسترس نیست."} عدد زیر بارکد رو پایین تایپ کن.
          </p>
        )}
      </div>
      <p className="text-center text-[13px] text-muted">بارکد رو داخل کادر بگیر؛ خودکار خونده میشه.</p>

      {showManual || failed ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = toEnDigits(manual).replace(/\D/g, "");
            if (code.length >= 8) onDetected(code);
          }}
        >
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            placeholder="عدد زیر بارکد"
            className="tabular h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-[16px] outline-none focus:border-brand"
          />
          <Button type="submit">برو</Button>
        </form>
      ) : (
        <Button variant="ghost" onClick={() => setShowManual(true)}>
          <Keyboard className="size-5" /> تایپ عدد بارکد
        </Button>
      )}
    </div>
  );
}
