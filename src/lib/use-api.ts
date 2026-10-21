"use client";
// Tiny data hook: GET a JSON API, keep the last good data while refetching,
// expose Persian error text. `url = null` means "don't fetch yet".
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage } from "./client-api";

interface State<T> {
  url: string | null;
  data?: T;
  error?: string;
}

export function useApi<T>(url: string | null) {
  const [state, setState] = useState<State<T>>({ url: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    api<T>(url, { signal: ctrl.signal }).then(
      (data) => setState({ url, data }),
      (err) => {
        if ((err as Error)?.name !== "AbortError") setState((s) => ({ url, data: s.data, error: errorMessage(err) }));
      },
    );
    return () => ctrl.abort();
  }, [url, nonce]);

  const fresh = state.url === url;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return {
    /** Data for the current url (undefined while the first response is loading). */
    data: fresh ? state.data : undefined,
    /** Last data received for any url — show it dimmed while new filters load. */
    previous: state.data,
    error: fresh ? state.error : undefined,
    loading: !!url && (!fresh || (!state.data && !state.error)),
    reload,
  };
}

/** Poll an API every `ms` for as long as `keepPolling(data)` says so; `refresh()` restarts it. */
export function usePoll<T>(url: string | null, ms: number, keepPolling: (d: T) => boolean) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [nonce, setNonce] = useState(0);
  const keep = useRef(keepPolling);
  useEffect(() => {
    keep.current = keepPolling;
  }, [keepPolling]);
  useEffect(() => {
    if (!url) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () =>
      api<T>(url).then(
        (d) => {
          if (stop) return;
          setData(d);
          setError(undefined);
          if (keep.current(d)) timer = setTimeout(tick, ms);
        },
        (err) => {
          if (stop) return;
          setError(errorMessage(err));
          timer = setTimeout(tick, ms * 3);
        },
      );
    tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [url, ms, nonce]);
  return { data, error, refresh: useCallback(() => setNonce((n) => n + 1), []), setData };
}
