// Server-only entry point for price data. Feature code calls getPriceProvider()
// and never imports a concrete provider directly.
import "server-only";
import { MockPriceProvider } from "./mock-provider";
import { TorobPriceProvider } from "./torob-provider";
import type { PriceProvider } from "./types";

let instance: PriceProvider | null = null;

export function getPriceProvider(): PriceProvider {
  if (instance) return instance;
  const which = (process.env.PRICE_PROVIDER ?? "mock").toLowerCase();
  instance = which === "torob" ? new TorobPriceProvider() : new MockPriceProvider();
  return instance;
}

export * from "./types";
export { summarizeOffers } from "./summary";
