import "server-only";
import { getLLM } from "@/lib/llm";

export type VoiceContext = "search" | "list" | "chat";

/** Canned transcriptions for MOCK mode, per input context (rotates). */
const MOCK_PHRASES: Record<VoiceContext, string[]> = {
  search: ["گلکسی A56 256 گیگ", "چای گلستان", "ردمی نوت ۱۴ پرو", "سرخ‌کن فیلیپس"],
  list: ["شیر کاله، چای گلستان، ماکارونی زر", "روغن لادن و تن ماهی شیلان", "تخم مرغ، برنج طارم"],
  chat: ["ارزش خرید داره؟", "قبل از خرید چی رو چک کنم؟", "چی بگم تخفیف بده؟"],
};
let rotation = 0;

export async function transcribeAudio(audio: Blob, context: VoiceContext): Promise<string> {
  const llm = getLLM();
  if (llm.mode === "mock") {
    const list = MOCK_PHRASES[context] ?? MOCK_PHRASES.search;
    await new Promise((r) => setTimeout(r, 500));
    return list[rotation++ % list.length];
  }
  return (await llm.transcribe(audio, { language: "fa" })).trim();
}
