"use client";
// Mic button (voice module). Records with MediaRecorder, sends to /api/transcribe,
// returns Persian text. Hidden when recording isn't supported; text input is the fallback.
// Callers render it only when isEnabled("voice").
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { Spinner } from "./ui";

type State = "idle" | "recording" | "working";
const MAX_MS = 10_000;

const noop = () => () => {};
function useCanRecord() {
  return useSyncExternalStore(
    noop,
    () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
    () => false,
  );
}

export function VoiceButton({
  onText,
  context = "search",
  className = "",
}: {
  onText: (text: string) => void;
  context?: "search" | "list" | "chat";
  className?: string;
}) {
  const canRecord = useCanRecord();
  const [state, setState] = useState<State>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  if (!canRecord) return null;

  async function start() {
    setHint(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setHint("اجازه‌ی میکروفون داده نشده؛ تایپ کن.");
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("working");
      try {
        const form = new FormData();
        form.append("audio", new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "voice.webm");
        form.append("context", context);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error?.message ?? "متوجه نشدم؛ تایپ کن.");
        onText(data.text);
      } catch (err) {
        setHint((err as Error).message || "متوجه نشدم؛ تایپ کن.");
      } finally {
        setState("idle");
      }
    };
    recorder.current = rec;
    rec.start();
    setState("recording");
    navigator.vibrate?.(30);
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_MS);
  }

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={state === "recording" ? stop : start}
        disabled={state === "working"}
        className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors ${
          state === "recording" ? "animate-pulse bg-high text-white" : "bg-brand-soft text-brand"
        } ${className}`}
        aria-label={state === "recording" ? "پایان ضبط" : "گفتن با صدا"}
        title={hint ?? undefined}
      >
        {state === "working" ? <Spinner className="size-4" /> : state === "recording" ? <Square className="size-4" fill="currentColor" /> : <Mic className="size-5" />}
      </button>
      {hint && (
        <span className="absolute end-0 top-full z-10 mt-1 w-max max-w-52 rounded-lg bg-ink px-2 py-1 text-[11px] text-white">{hint}</span>
      )}
    </span>
  );
}
