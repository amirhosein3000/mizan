export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ChatOptions {
  /** Ask the model for a JSON object (response_format=json_object when supported). */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Use VISION_MODEL instead of LLM_MODEL. */
  vision?: boolean;
}

export interface LLMClient {
  /** "mock" = canned answers, no network. */
  readonly mode: "mock" | "live";
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  transcribe(audio: Blob, opts?: { language?: string }): Promise<string>;
}

export type LLMErrorCode = "timeout" | "auth" | "rate_limit" | "unavailable" | "bad_response" | "not_configured";

const USER_MESSAGES: Record<LLMErrorCode, string> = {
  timeout: "دستیار الان کند جواب میده. چند ثانیه دیگه دوباره امتحان کن.",
  auth: "اتصال به سرویس هوش مصنوعی برقرار نشد (کلید نامعتبر). بقیه‌ی امکانات کار می‌کنن.",
  rate_limit: "الان درخواست‌ها زیاده. یه لحظه صبر کن و دوباره بزن.",
  unavailable: "سرویس هوش مصنوعی در دسترس نیست. بقیه‌ی امکانات کار می‌کنن.",
  bad_response: "جواب دستیار ناقص بود. دوباره امتحان کن.",
  not_configured: "سرویس هوش مصنوعی تنظیم نشده.",
};

export class LLMError extends Error {
  readonly userMessage: string;
  constructor(
    readonly code: LLMErrorCode,
    detail?: string,
  ) {
    super(`LLM ${code}${detail ? `: ${detail}` : ""}`);
    this.userMessage = USER_MESSAGES[code];
  }
}
