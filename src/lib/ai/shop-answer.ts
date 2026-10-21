// The shopkeeper's answer to the shopper's own question in a (simulated) call,
// grounded in the product's specs: «رنگ مشکی داره؟» -> «بله، مشکی هم داریم.».
// Generated once per mission. Live: the LLM answers in character from the specs.
// Mock / failure: a spec lookup, else null (the call uses a neutral line).
import "server-only";
import type { ProductDetail } from "@/lib/catalog";
import { getLLM, withTimeout } from "@/lib/llm";
import { normalizeText } from "@/lib/text";

const BUDGET_MS = 6_000;

const PROMPT = `You play a shopkeeper in a Tehran shop answering a phone question about one product.
Answer in ONE short, natural, colloquial Persian sentence (max 20 words), as the shopkeeper.
Ground the answer ONLY in the product data below. If the data doesn't answer it, say you'd have to check
or that they can see it in the shop — never invent facts. No prices (price is discussed separately).`;

/** Spec lookup: a question word that appears in a spec value or key. */
export function specAnswer(question: string, specs: [string, string][]): string | null {
  const words = normalizeText(question)
    .split(" ")
    .filter((w) => w.length > 1 && !["دارید", "داره", "داری", "هست", "هستش", "چیه", "چنده", "این", "اون", "آیا", "ایا", "رو", "را", "هم"].includes(w));
  for (const [key, value] of specs) {
    const v = normalizeText(value);
    const hit = words.find((w) => v.split(" ").includes(w));
    if (hit) return `بله، ${hit} هم داریم؛ ${key}: ${value}.`;
  }
  for (const [key, value] of specs) {
    if (words.some((w) => normalizeText(key).split(" ").includes(w))) return `${key}ش ${value}ه.`;
  }
  return null;
}

export async function answerShopQuestion(product: ProductDetail, question: string): Promise<string | null> {
  const q = question.trim();
  if (!q) return null;
  const fallback = specAnswer(q, product.specs);
  const llm = getLLM();
  if (llm.mode === "mock") return fallback;
  try {
    const data = [
      `Product: ${product.title}`,
      `Category: ${product.category}${product.brand ? `, brand: ${product.brand}` : ""}`,
      `Specs: ${product.specs.slice(0, 25).map(([k, v]) => `${k}: ${v}`).join("؛ ")}`,
    ].join("\n");
    const reply = await withTimeout(
      llm.chat(
        [
          { role: "system", content: `${PROMPT}\n\nDATA:\n${data}` },
          { role: "user", content: q },
        ],
        { temperature: 0.5, maxTokens: 120 },
      ),
      BUDGET_MS,
    );
    const line = reply.replace(/[*#`"«»]/g, "").split("\n")[0].trim();
    return line ? line.slice(0, 160) : fallback;
  } catch {
    return fallback;
  }
}
