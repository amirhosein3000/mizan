// Free-text shopping request -> structured intent. The rule-based parser
// (lib/agent/intent.ts) always runs; with a live LLM we let the model fix what
// rules miss (typos, slang, unusual phrasing) and keep rules as the fallback.
import "server-only";
import { parseIntent, type Intent } from "@/lib/agent/intent";
import { getLLM, parseJsonReply } from "@/lib/llm";
import { findLandmark } from "@/lib/shop/places";

const PROMPT = `You turn a Persian shopping request from a shopper in Tehran into JSON.
Return ONLY: {"query": string, "budgetMax": number|null, "budgetMin": number|null, "place": string|null, "nearMe": boolean,
"installment": boolean, "openNow": boolean, "warranty": boolean, "when": "now"|"today_evening"|"tomorrow_morning"|"tomorrow_evening"|null}
- "query": only the product words to search a Persian catalog (brand, model, product type). No filler, no place, no budget.
- Prices in Toman as integers ("۵ میلیون" = 5000000). Shoppers often drop «میلیون»: "زیر ۵۰" for a phone means 50000000.
- "place": a Tehran neighbourhood / square / street if mentioned, else null.
- "installment": true for قسطی/اقساط/ترب‌پی/اسنپ‌پی/دیجی‌پی/تارا.`;

export async function understand(text: string): Promise<Intent & { source: "rules" | "llm" }> {
  const rules = parseIntent(text);
  const llm = getLLM();
  if (llm.mode === "mock") return { ...rules, source: "rules" };
  try {
    const reply = await llm.chat(
      [
        { role: "system", content: PROMPT },
        { role: "user", content: text },
      ],
      { json: true, temperature: 0, maxTokens: 300 },
    );
    const j = parseJsonReply<Partial<Record<keyof Intent, unknown>> & { place?: string | null }>(reply);
    const num = (v: unknown) => (typeof v === "number" && v > 0 ? Math.round(v) : null);
    const when = ["now", "today_evening", "tomorrow_morning", "tomorrow_evening"].includes(String(j.when)) ? (j.when as Intent["when"]) : null;
    return {
      query: typeof j.query === "string" && j.query.trim() ? j.query.trim() : rules.query,
      budgetMax: num(j.budgetMax) ?? rules.budgetMax,
      budgetMin: num(j.budgetMin) ?? rules.budgetMin,
      place: (typeof j.place === "string" && findLandmark(j.place)) || rules.place,
      nearMe: j.nearMe === true || rules.nearMe,
      installment: j.installment === true || rules.installment,
      torobPayInPerson: rules.torobPayInPerson,
      openNow: j.openNow === true || rules.openNow,
      warranty: j.warranty === true || rules.warranty,
      fastDelivery: rules.fastDelivery,
      when: when ?? rules.when,
      source: "llm",
    };
  } catch {
    // Any LLM trouble: the rules result is good enough.
    return { ...rules, source: "rules" };
  }
}
