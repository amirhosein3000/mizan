// Pure shopping-list math (shared by server, client and tests).

export interface ListItemLike {
  price: number | null;
  onlineMedian: number | null;
  onlineMin: number | null;
  done: boolean;
}

export interface ListTotals {
  /** Sum of entered in-store prices. */
  spent: number;
  /** What the same priced items typically cost online. */
  onlineForPriced: number;
  /** Rough cost of the whole list at typical online prices (unknown items excluded). */
  estimatedTotal: number;
  doneCount: number;
  /** How much more the shopper is paying in store vs online for priced items (>= 0). */
  overpay: number;
}

export function listTotals(items: ListItemLike[]): ListTotals {
  let spent = 0;
  let onlineForPriced = 0;
  let estimatedTotal = 0;
  let doneCount = 0;
  let overpay = 0;
  for (const i of items) {
    if (i.done) doneCount++;
    if (i.price) {
      spent += i.price;
      if (i.onlineMedian) {
        onlineForPriced += i.onlineMedian;
        overpay += Math.max(0, i.price - i.onlineMedian);
      }
    }
    estimatedTotal += i.price ?? i.onlineMedian ?? 0;
  }
  return { spent, onlineForPriced, estimatedTotal, doneCount, overpay };
}

/** Positive = the store asks more than the typical online price. */
export function onlineGap(item: ListItemLike): number | null {
  if (!item.price || !item.onlineMedian) return null;
  return item.price - item.onlineMedian;
}

/** Split a pasted/dictated list into items: newlines, commas, Persian «،» and «و» between items. */
export function splitListText(text: string): string[] {
  return text
    .split(/[\n,،;؛]+|\s+و\s+/)
    .map((s) => s.replace(/^[\s\-•*\d۰-۹.)]+/, "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 40);
}
