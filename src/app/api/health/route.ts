import { connection } from "next/server";
import { isMockLLM } from "@/lib/llm";
import { getPriceProvider } from "@/lib/price";

export async function GET() {
  await connection();
  return Response.json({
    ok: true,
    llm: isMockLLM() ? "mock" : "live",
    priceProvider: getPriceProvider().name,
    time: new Date().toISOString(),
  });
}
