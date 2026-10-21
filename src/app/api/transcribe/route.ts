// Voice input module (flag: voice): audio -> Persian text via the provider's STT endpoint.
import { fail, handle } from "@/lib/http";
import { featureOff } from "@/lib/features-server";
import { transcribeAudio, type VoiceContext } from "@/modules/voice/transcribe";

const MAX_BYTES = 5 * 1024 * 1024;

export const POST = handle(async (req: Request) => {
  const off = featureOff("voice");
  if (off) return off;
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return fail(400, "no_audio", "صدایی ضبط نشد. دوباره امتحان کن.");
  if (audio.size > MAX_BYTES) return fail(413, "too_long", "صدا خیلی طولانیه. کوتاه‌تر بگو.");
  const context = (String(form?.get("context") ?? "search") as VoiceContext) || "search";
  const text = await transcribeAudio(audio, context);
  if (!text) return fail(422, "empty", "چیزی نشنیدم. یه بار دیگه واضح‌تر بگو.");
  return Response.json({ text });
});
