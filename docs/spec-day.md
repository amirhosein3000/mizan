# Spec-day playbook

When the official challenge spec drops, do this **before writing any code**. Target: plan approved within
45 minutes of reading the spec; demo path adapted and deployed by end of day 1.

## 0. Setup (5 min)

- Open Claude Code (Opus) in this repo. Paste the spec into `docs/spec.md` and commit it.
- Confirm the app runs: `npm run dev`, open `/` and `/xray` → «قفسه‌ی نمونه».
- Confirm the deployed URL still works on your phone.

## 1. The prompt (paste into Claude Code, spec below it)

```
Read CLAUDE.md, docs/progress.md and docs/spec-day.md first. The official spec is in docs/spec.md.
Do NOT write code until I approve the plan.

1. Summarize the spec in 5 bullets, including judging criteria (with weights if given) and required deliverables.
2. Build the requirement map table: requirement | status (built: <module> / needs changes / new work / out of scope) | files | notes.
   Use the module inventory in docs/spec-day.md §2. Flag every ambiguity and give the interpretation you recommend.
3. One-sentence product story for the judges, and a 90-second demo script (timestamped) that hits the
   highest-weight judging criteria. Keep the Price X-ray hero moment unless the spec rules it out; if it does,
   propose a new hero moment that fits the spec.
4. Lists: must-have (needed for the demo script), nice-to-have, cut list (modules to switch off via flags).
5. Break must-haves into tasks that can run in parallel without touching the same files.
   For each: files, acceptance check, rough time. Mark dependencies.
6. Name the single riskiest task and how we de-risk it first (spike / fallback / mock).
Write the result to docs/plan.md as well.
```

## 2. Module inventory (what already exists)

| Module | Flag id | Where | What it does |
|---|---|---|---|
| Identify by photo | `identify` | `app/scan` (photo tab), `api/identify`, `lib/ai/vision.ts` | Vision → fuzzy match → confidence → top-3 picker; reads price tag if visible |
| Identify by barcode | `identify` | `components/BarcodeScanner.tsx`, `api/products/barcode` | Native BarcodeDetector + ZXing fallback + manual entry |
| Identify by text | `identify` | `app/scan` (text tab), `api/products/search` | Persian/English fuzzy search |
| Online price range | (core) | `components/PriceRangeCard.tsx` | min / median / max, sellers, store-price marker |
| Price verdict | `verdict` | `lib/verdict.ts`, `components/VerdictCard.tsx` | good / fair / high, target price, suspicious-cheap, above printed price |
| Negotiation line | `verdict` | `lib/verdict.ts#negotiationLine`, `NegotiationSheet.tsx` | Big-type "show to seller", copy, read aloud |
| Pre-purchase checklist | `verdict` | `lib/verdict.ts#CHECKLISTS` | Per category (registry/همتا for phones, printed price for groceries…) |
| Alternatives | `alternatives` | provider `getAlternatives` | Cheaper comparable models, one per family |
| Product chat | `chat` | `lib/ai/chat.ts`, `api/chat`, `ChatPanel.tsx` | Grounded Persian Q&A, mock answers by intent |
| History / saved | `history` | `api/history`, `app/history` | Per-device (cookie), SQLite |
| Savings card | `savings` | `SavingsSheet.tsx` | «امروز X تومان صرفه‌جویی کردی» + shareable PNG |
| **Price X-ray (hero)** | `xray` | `app/xray`, `api/xray`, `lib/demo-shelf.ts` | Shelf photo/live camera → colour badges per product |
| Demo kit | — | `app/demo` | Printable EAN-13 barcodes of mock products |
| Price data adapter | `PRICE_PROVIDER` | `lib/price/*` | Mock (292 products) / Torob stub |
| LLM adapter | `MOCK_LLM` | `lib/llm/*` | Any OpenAI-compatible endpoint + backup |

Pre-built extra modules (prompt 2) are listed in CLAUDE.md → "Modules" once they exist.

## 3. Likely spec readings → what to do

| If the spec emphasizes… | Lead with | Adapt |
|---|---|---|
| Shopper saving money in store | X-ray + verdict + negotiation | Savings card in the demo |
| Trust / fake goods / warranty | Checklist + suspicious-cheap + chat | Make checklist a first-class card |
| Supermarket / groceries | X-ray on shelf, printed-price rule, shopping list | Default demo set = groceries |
| Sellers / stores | Seller-side view module | Pivot story: "store sees how its prices compare" |
| Torob data integration | `TorobPriceProvider` (prompt 5) | Data adapter first, UI second |
| Offline-to-online bridge | "buy online instead" CTA on red verdicts | Link to cheapest seller |
| Voice / accessibility | Voice input module | Read-aloud negotiation line |

## 4. Time budget (this challenge gets ~4h on day 1, ~2h on day 2)

- Day 1, hour 0: plan (≤45 min incl. approval).
- Day 1, hours 1–3: must-haves, in parallel where files don't overlap. Commit + push after each.
- Day 1, hour 4: deploy, phone test on mobile data, update progress.md.
- Day 2, ≤ midday: nice-to-haves only if the demo path is green. **Feature freeze at midday.**
- Day 2 after freeze: DEMO_MODE, polish, pitch, rehearsal (prompt 6).

## 5. Rules of thumb on the day

- Prefer switching modules on/off and re-skinning copy over new code.
- Every task ends with `npm run check` green and the demo path clicked through.
- If something risky isn't working in 30 minutes, mock it and move on.
- Keep `docs/progress.md` current so a fresh session can take over instantly.
