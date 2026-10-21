"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUp, Camera } from "lucide-react";
import { isEnabled } from "@/config/features";
import { useAsk } from "@/lib/use-ask";
import { Spinner } from "./ui";
import { VoiceButton } from "./VoiceButton";

/** The one input: say what you want in plain Persian (typed or spoken), or show a photo. */
export function AskBox({ initial = "", autoFocus = false, placeholder }: { initial?: string; autoFocus?: boolean; placeholder?: string }) {
  const [text, setText] = useState(initial);
  const { ask, busy } = useAsk();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        ask(text);
      }}
      className="flex items-center gap-1.5 rounded-2xl border-2 border-line bg-surface p-1.5 ps-3 focus-within:border-brand"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder ?? "مثلاً: هدفون انکر زیر ۵ میلیون، قسطی"}
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/80"
        enterKeyHint="search"
        autoFocus={autoFocus}
        aria-label="چی می‌خوای بخری؟"
      />
      {isEnabled("voice") && (
        <VoiceButton
          onText={(t) => {
            setText(t);
            ask(t);
          }}
        />
      )}
      {isEnabled("identify") && !text && (
        <Link href="/scan?mode=photo" className="grid size-10 place-items-center rounded-xl text-muted active:bg-surface-2" aria-label="جستجو با عکس">
          <Camera className="size-5" />
        </Link>
      )}
      <button
        type="submit"
        disabled={!text.trim() || busy}
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-40"
        aria-label="بگرد"
      >
        {busy ? <Spinner className="size-4" /> : <ArrowUp className="size-5" />}
      </button>
    </form>
  );
}
