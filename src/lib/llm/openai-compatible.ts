// Talks to any OpenAI-compatible endpoint (/chat/completions, /audio/transcriptions).
// No vendor SDK on purpose: switching provider = changing env vars.
import { LLMError, type ChatMessage, type ChatOptions, type LLMClient } from "./types";

export interface EndpointConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
  sttModel: string;
  jsonMode: boolean;
  timeoutMs: number;
}

function mapStatus(status: number, body: string): LLMError {
  if (status === 401 || status === 403) return new LLMError("auth", body.slice(0, 200));
  if (status === 429) return new LLMError("rate_limit", body.slice(0, 200));
  if (status >= 500) return new LLMError("unavailable", `${status} ${body.slice(0, 200)}`);
  return new LLMError("bad_response", `${status} ${body.slice(0, 300)}`);
}

function mapThrown(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  const name = (err as { name?: string })?.name;
  if (name === "TimeoutError" || name === "AbortError") return new LLMError("timeout");
  return new LLMError("unavailable", String((err as Error)?.message ?? err));
}

export class OpenAICompatibleClient implements LLMClient {
  readonly mode = "live" as const;
  constructor(private readonly cfg: EndpointConfig) {}

  private url(path: string) {
    return `${this.cfg.baseUrl.replace(/\/+$/, "")}${path}`;
  }

  async chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
    const body: Record<string, unknown> = {
      model: opts.vision ? this.cfg.visionModel : this.cfg.model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 800,
    };
    if (opts.json && this.cfg.jsonMode) body.response_format = { type: "json_object" };

    try {
      let res = await this.post(body);
      // Some providers reject response_format — retry once without it.
      if (res.status === 400 && body.response_format) {
        delete body.response_format;
        res = await this.post(body);
      }
      const text = await res.text();
      if (!res.ok) throw mapStatus(res.status, text);
      const data = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new LLMError("bad_response", "empty content");
      return content;
    } catch (err) {
      throw mapThrown(err);
    }
  }

  private post(body: unknown) {
    return fetch(this.url("/chat/completions"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.cfg.timeoutMs),
    });
  }

  async transcribe(audio: Blob, opts: { language?: string } = {}): Promise<string> {
    const form = new FormData();
    form.append("file", audio, "audio.webm");
    form.append("model", this.cfg.sttModel);
    form.append("language", opts.language ?? "fa");
    try {
      const res = await fetch(this.url("/audio/transcriptions"), {
        method: "POST",
        headers: { Authorization: `Bearer ${this.cfg.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
      });
      const text = await res.text();
      if (!res.ok) throw mapStatus(res.status, text);
      const data = JSON.parse(text) as { text?: string };
      return data.text ?? "";
    } catch (err) {
      throw mapThrown(err);
    }
  }
}

/** Primary endpoint with an optional backup: retries on the backup for transient/auth failures. */
export class FallbackClient implements LLMClient {
  readonly mode = "live" as const;
  constructor(
    private readonly primary: LLMClient,
    private readonly backup: LLMClient,
  ) {}

  private async run<T>(fn: (c: LLMClient) => Promise<T>): Promise<T> {
    try {
      return await fn(this.primary);
    } catch (err) {
      if (err instanceof LLMError && err.code !== "bad_response") {
        console.warn("[llm] primary failed, using backup:", err.message);
        return fn(this.backup);
      }
      throw err;
    }
  }

  chat(messages: ChatMessage[], opts?: ChatOptions) {
    return this.run((c) => c.chat(messages, opts));
  }
  transcribe(audio: Blob, opts?: { language?: string }) {
    return this.run((c) => c.transcribe(audio, opts));
  }
}
