"use client";
import { useEffect, useState } from "react";
import { Check, Copy, Volume2, X } from "lucide-react";
import { formatToman } from "@/lib/format";

/** Full-screen, big-type "show this to the seller" view, with copy and read-aloud. */
export function NegotiationSheet({ line, target, onClose }: { line: string; target: number; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const check = () => setCanSpeak(speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith("fa")));
    check();
    speechSynthesis.addEventListener("voiceschanged", check);
    return () => speechSynthesis.removeEventListener("voiceschanged", check);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is on screen anyway */
    }
  }

  function speak() {
    const u = new SpeechSynthesisUtterance(line);
    u.lang = "fa-IR";
    const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("fa"));
    if (voice) u.voice = voice;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-ink text-white" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <span className="text-sm opacity-80">با لبخند بگو 🙂</span>
        <button onClick={onClose} className="grid size-11 place-items-center rounded-full bg-white/10" aria-label="بستن">
          <X className="size-6" />
        </button>
      </div>
      <div className="flex flex-1 flex-col justify-center px-6">
        <p className="text-[28px] font-black leading-[1.7]">{line}</p>
        <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-2xl bg-white/10 px-4 py-2">
          <span className="text-sm opacity-80">قیمت هدف:</span>
          <span className="tabular text-xl font-extrabold">{formatToman(target)}</span>
        </div>
      </div>
      <div className="flex gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button onClick={copy} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white font-bold text-brand-ink">
          {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          {copied ? "کپی شد" : "کپی متن"}
        </button>
        {canSpeak && (
          <button onClick={speak} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/15 font-bold">
            <Volume2 className="size-5" /> بلند بخون
          </button>
        )}
      </div>
    </div>
  );
}
