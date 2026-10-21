import { answerProductQuestion, type ChatTurn } from "@/lib/ai/chat";
import { fail, handle, readJson } from "@/lib/http";
import { featureOff } from "@/lib/features-server";
import { getProductBundle } from "@/lib/product-service";

export const POST = handle(async (req: Request) => {
  const off = featureOff("chat");
  if (off) return off;
  const body = await readJson<{ productId?: string; messages?: ChatTurn[]; storePrice?: number | null }>(req);
  const turns: ChatTurn[] = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!body?.productId || turns.length === 0) return fail(400, "bad_request", "پیام خالیه.");

  const bundle = await getProductBundle(body.productId);
  if (!bundle) return fail(404, "not_found", "این کالا پیدا نشد.");
  const reply = await answerProductQuestion(
    { product: bundle.product, summary: bundle.summary, alternatives: bundle.alternatives, storePrice: body.storePrice },
    turns,
  );
  return Response.json({ reply });
});
