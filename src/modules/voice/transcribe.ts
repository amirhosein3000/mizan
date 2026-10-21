import "server-only";
import { getLLM } from "@/lib/llm";

export type VoiceContext = "search" | "list" | "chat";

/** Canned transcriptions for MOCK mode, per input context (rotates). */
const MOCK_PHRASES: Record<VoiceContext, string[]> = {
  search: ["هدفون انکر زیر ۵ میلیون قسطی", "شارژر ۲۰ وات اپل نزدیک ونک", "گلکسی S25 FE فردا عصر", "اسپیکر جی بی ال الان باز باشه"],
  list: ["شارژر اپل، کابل تایپ سی، پاوربانک", "هدفون انکر و کاور ایرپاد", "گلس گوشی و قاب"],
  chat: ["نزدیک‌ترین فروشگاه کجاست؟", "قبل از خرید چی رو چک کنم؟", "چی بگم تخفیف بده؟"],
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
