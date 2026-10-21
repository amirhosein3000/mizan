// Route-handler helpers: consistent JSON shape and friendly Persian errors.
import "server-only";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { LLMError } from "@/lib/llm";

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export function fail(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, { status });
}

/** Wrap a handler so no exception ever reaches the user as a raw 500. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      // Let Next.js internals (prerender bailouts, notFound, redirects) through.
      unstable_rethrow(err);
      if (err instanceof LLMError) {
        console.warn("[api] LLM error:", err.message);
        return fail(503, `llm_${err.code}`, err.userMessage);
      }
      console.error("[api] unexpected error:", err);
      return fail(500, "internal", "یه مشکلی پیش اومد. دوباره امتحان کن.");
    }
  };
}

/** Anonymous per-device id (cookie), so history works without accounts. */
export async function getDeviceId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get("cid")?.value;
  if (!id) {
    id = crypto.randomUUID();
    jar.set("cid", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return id;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

/** Max accepted image payload (data URL chars). Client downscales to ~1024px first. */
export const MAX_IMAGE_CHARS = 6_000_000;

export function isImageDataUrl(s: unknown): s is string {
  return typeof s === "string" && /^data:image\/(png|jpe?g|webp|gif|heic|heif);base64,/.test(s) && s.length < MAX_IMAGE_CHARS;
}
