// LLM entry point. Feature code calls getLLM() and never talks to a vendor directly.
//
// Env (see .env.example):
//   MOCK_LLM=true            -> canned answers, zero network (also used when no key is set)
//   LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, VISION_MODEL, STT_MODEL
//   LLM_FALLBACK_BASE_URL, LLM_FALLBACK_API_KEY, LLM_FALLBACK_MODEL, LLM_FALLBACK_VISION_MODEL
import "server-only";
import { FallbackClient, OpenAICompatibleClient, type EndpointConfig } from "./openai-compatible";
import { LLMError, type LLMClient } from "./types";

class MockClient implements LLMClient {
  readonly mode = "mock" as const;
  async chat(): Promise<string> {
    return "این یک پاسخ نمایشی است (حالت MOCK).";
  }
  async transcribe(): Promise<string> {
    return "قیمت گلکسی آ ۵۶ چنده";
  }
}

let cached: LLMClient | null = null;

export function isMockLLM(): boolean {
  return process.env.MOCK_LLM === "true" || !process.env.LLM_API_KEY;
}

function endpoint(prefix: "LLM" | "LLM_FALLBACK"): EndpointConfig | null {
  const baseUrl = process.env[`${prefix}_BASE_URL`];
  const apiKey = process.env[`${prefix}_API_KEY`];
  const model = process.env[`${prefix}_MODEL`];
  if (!baseUrl || !apiKey || !model) return null;
  return {
    baseUrl,
    apiKey,
    model,
    visionModel: process.env[prefix === "LLM" ? "VISION_MODEL" : "LLM_FALLBACK_VISION_MODEL"] || model,
    sttModel: process.env[prefix === "LLM" ? "STT_MODEL" : "LLM_FALLBACK_STT_MODEL"] || "whisper-1",
    jsonMode: process.env.LLM_JSON_MODE !== "false",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 25_000),
  };
}

export function getLLM(): LLMClient {
  if (cached) return cached;
  if (isMockLLM()) return (cached = new MockClient());
  const primary = endpoint("LLM");
  if (!primary) throw new LLMError("not_configured", "LLM_BASE_URL / LLM_MODEL missing");
  const backup = endpoint("LLM_FALLBACK");
  const client = new OpenAICompatibleClient(primary);
  cached = backup ? new FallbackClient(client, new OpenAICompatibleClient(backup)) : client;
  return cached;
}

/** Pull the first JSON object out of a model reply (handles ```json fences and chatter). */
export function parseJsonReply<T>(reply: string): T {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start === -1 || end <= start) throw new LLMError("bad_response", "no JSON object in reply");
  try {
    return JSON.parse(reply.slice(start, end + 1)) as T;
  } catch {
    throw new LLMError("bad_response", "invalid JSON in reply");
  }
}

export { LLMError } from "./types";
export type { ChatMessage, LLMClient } from "./types";
