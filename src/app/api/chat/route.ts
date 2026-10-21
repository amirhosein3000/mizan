import { answerProductQuestion, type ChatTurn } from "@/lib/ai/chat";
import { getCatalog } from "@/lib/catalog";
import { shopsForProduct, withShopStats } from "@/lib/agent/shops-service";
import { featureOff } from "@/lib/features-server";
import { contextFromRequest, fail, handle, readJson } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const off = featureOff("chat");
  if (off) return off;
  const body = await readJson<{ productId?: string; messages?: ChatTurn[]; storePrice?: number | null }>(req);
  const turns: ChatTurn[] = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!body?.productId || turns.length === 0) return fail(400, "bad_request", "پیام خالیه.");

  const catalog = getCatalog();
  const product = catalog.getProduct(body.productId);
  if (!product) return fail(404, "not_found", "این کالا پیدا نشد.");
  const shopper = contextFromRequest(req);
  const { ranked } = shopsForProduct(product.id, product.category, shopper);
  const reply = await answerProductQuestion(
    { product, shops: ranked.shops, similar: withShopStats(catalog.similar(product.id, 4), shopper), storePrice: body.storePrice },
    turns,
  );
  return Response.json({ reply });
});
