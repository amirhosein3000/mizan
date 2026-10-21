"use client";
// Browser-side fetch helper: JSON in/out, Persian error messages, never throws raw.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

const OFFLINE_MESSAGE = "به اینترنت وصل نیستی یا سرور جواب نمیده. دوباره امتحان کن.";

export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new ApiError(OFFLINE_MESSAGE, 0, "network");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as { error?: { message?: string; code?: string } } | null)?.error;
    throw new ApiError(e?.message ?? "یه مشکلی پیش اومد. دوباره امتحان کن.", res.status, e?.code ?? "unknown");
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "یه مشکلی پیش اومد. دوباره امتحان کن.";
}
