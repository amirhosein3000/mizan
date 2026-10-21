import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { isMockLLM } from "@/lib/llm";

export async function GET() {
  await connection();
  let catalog: ReturnType<ReturnType<typeof getCatalog>["stats"]> | null = null;
  try {
    catalog = getCatalog().stats();
  } catch (err) {
    console.error("[health] catalog unavailable:", err);
  }
  return Response.json(
    { ok: !!catalog, llm: isMockLLM() ? "mock" : "live", catalog, time: new Date().toISOString() },
    { status: catalog ? 200 : 503 },
  );
}
