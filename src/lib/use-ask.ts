"use client";
// "Tell Mizan what you want": understand the request, turn what it implies into
// the shopper context (budget, place, installment, visit time…), then search.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Intent } from "./agent/intent";
import { api } from "./client-api";
import type { ShopperContext } from "./shop/context";
import { useShopper } from "./shopper-store";

const KEY = "mizan.intent";

export interface SavedIntent {
  said: string;
  intent: Intent;
}

export function readSavedIntent(said: string | null): Intent | null {
  if (!said) return null;
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as SavedIntent | null;
    return v && v.said === said ? v.intent : null;
  } catch {
    return null;
  }
}

export function useAsk() {
  const router = useRouter();
  const { ctx, patch } = useShopper();
  const [busy, setBusy] = useState(false);

  async function ask(text: string) {
    const said = text.trim();
    if (!said || busy) return;
    setBusy(true);
    try {
      const { intent, visitAt } = await api<{ intent: Intent; visitAt: number | null }>("/api/understand", { body: { text: said } });
      // Budget belongs to this request; the other conditions are preferences that stick.
      const p: Partial<ShopperContext> = { budgetMax: intent.budgetMax };
      if (intent.installment) p.installment = true;
      if (intent.torobPayInPerson) p.torobPayInPerson = true;
      if (intent.openNow) p.openOnly = true;
      if (intent.warranty) p.warranty = true;
      if (intent.fastDelivery) p.fastDelivery = true;
      if (intent.place) p.origin = { lat: intent.place.lat, lon: intent.place.lon, label: intent.place.name, source: "landmark" };
      if (intent.when) p.visitAt = visitAt;
      patch(p);
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ said, intent } satisfies SavedIntent));
      } catch {
        /* ignore */
      }
      const q = intent.query || said;
      const locate = intent.nearMe && !ctx.origin ? "&locate=1" : "";
      router.push(`/search?q=${encodeURIComponent(q)}&said=${encodeURIComponent(said)}${locate}`);
    } catch {
      router.push(`/search?q=${encodeURIComponent(said)}`);
    } finally {
      setBusy(false);
    }
  }

  return { ask, busy };
}
