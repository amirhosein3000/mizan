"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api, errorMessage } from "@/lib/client-api";
import { ASSISTANT_NAME } from "@/lib/persona";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { isEnabled } from "@/config/features";
import { VoiceButton } from "./VoiceButton";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = ["نزدیک‌ترین فروشگاه کجاست؟", "قسطی کجا می‌فروشن؟", "قبل از خرید چی رو چک کنم؟", "جایگزین ارزون‌تر داره؟"];

export function ChatPanel({ productId, storePrice }: { productId: string; storePrice?: number | null }) {
  const { query } = useShopper();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  async function send(message: string) {
    const q = message.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const { reply } = await api<{ reply: string }>(withCtx("/api/chat", query), { body: { productId, storePrice, messages: next } });
      setTurns([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {turns.length === 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="shrink-0 rounded-full border border-brand/30 bg-brand-soft px-3 py-2 text-[13px] font-semibold text-brand active:bg-brand/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.map((t, i) => (
        <div
          key={i}
          className={`rise max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[14px] leading-7 ${
            t.role === "user" ? "self-end rounded-tl-md bg-brand text-white" : "self-start rounded-tr-md bg-surface-2"
          }`}
        >
          {t.role === "assistant" && <div className="mb-0.5 text-[11px] font-bold text-brand">{ASSISTANT_NAME}</div>}
          {t.content}
        </div>
      ))}
      {busy && (
        <div className="self-start rounded-2xl rounded-tr-md bg-surface-2 px-4 py-3">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 animate-bounce rounded-full bg-brand/60" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </span>
        </div>
      )}
      {error && <p className="text-[13px] text-high">{error}</p>}
      <div ref={endRef} />

      <form
        className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface p-1.5 ps-4 focus-within:border-brand"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`از ${ASSISTANT_NAME} بپرس…`}
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          enterKeyHint="send"
        />
        {isEnabled("voice") && <VoiceButton context="chat" onText={(t) => send(t)} />}
        <button
          type="submit"
          disabled={!text.trim() || busy}
          className="grid size-10 place-items-center rounded-xl bg-brand text-white disabled:opacity-40"
          aria-label="ارسال"
        >
          {/* Send icon points left in RTL (the direction text flows). */}
          <Send className="size-5 -scale-x-100" />
        </button>
      </form>
    </div>
  );
}
