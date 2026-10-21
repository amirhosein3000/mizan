# CLAUDE.md — Mizan (میزان)

Smart assistant for **in-person shopping in Tehran's shops and malls**, built for the Torob hackathon challenge
«دستیار هوشمند خرید حضوری» on Torob's dataset (6,476 shops, 225,903 products, 331,506 offers).
Four steps: understand & compare products → find & compare shops near the shopper → the agent calls shops
(stock, today's price, installment, hold) and replaces dead ends → visit plan with exact address + follow-up.

Start every session by reading this file and `docs/progress.md`. Update `docs/progress.md` when you finish.

@AGENTS.md

## Rules that override everything

1. **Demo path first** (below). It must work at every commit with zero AI keys. Switch a module off with its flag rather than leave it broken.
2. **Data honesty.** A LISTED price, WHEN it changed, and CONFIRMED stock are different facts — never blur them in UI or copy. Unknown (hours, payment channel, stock) is shown as unknown. Shop names/phones in the dataset are synthetic; say so where relevant.
3. **Persian, RTL, phone-first.** Design at 380px. User-facing copy Persian; code, comments, docs English.
4. **Adapters only.** Feature code uses `getCatalog()` and `getLLM()`, never `SqliteCatalog` or a vendor.
5. **Run the gates before saying "done":** `npm run check` (lint + typecheck + tests + build).
6. **Next.js 16.4 is newer than your training data.** Read `node_modules/next/dist/docs/` before using an unfamiliar API. Cache Components are ON.
7. Never commit secrets or the dataset/catalog files. Never scrape. No Torob logo/brand assets; UI may say «ساخته‌شده برای هکاتون ترب».

## Demo path

Home → ask «هدفون انکر زیر ۵ میلیون قسطی» → search (intent → filters, facets, compare) → product →
set «از کجا میای؟» → ranked shops (distance, hours, freshness, reasons, map) → «میزان زنگ بزنه» → live calls
(+ seller panel answering on a 2nd device) → recommendation (confirmed price, hold, leave-by, navigation) →
«دارم میرم» → «پیگیری». Outside shop hours: calls are scheduled for opening time; «همین الان امتحان کن (اجرای نمایشی)» runs them now.
In-store: «تو مغازه» → ایکس‌ری → «قفسه‌ی نمونه» → green/yellow/red badges vs. Tehran prices.

## Stack

Next.js 16.4 (App Router, Turbopack, Cache Components) + React 19 + TS + Tailwind v4 · SQLite (better-sqlite3):
read-only **catalog** (`catalog/catalog.db`, FTS5) + writable **user DB** (`data/mizan.db`, Drizzle for history) ·
Leaflet + OSM tiles · lucide-react · Vazirmatn · Vitest · Docker → Liara.

## Commands

```bash
npm run catalog        # dataset CSVs (./dataset or DATASET_DIR) -> catalog/catalog.db (~3 min)
npm run catalog:pack   # -> catalog/catalog.db.xz for deployment
npm run dev            # http://localhost:3000
npm run check          # lint + typecheck + tests + build
npm run smoke:llm      # live-LLM path against scripts/fake-llm.mjs (no key needed)
```

## Folder layout

```
scripts/build-catalog.ts    CSV -> SQLite catalog (shops/products/offers/shop_categories/categories/product_fts)
src/app/
  page.tsx HomeScreen        ask box, examples, active missions, how-it-works, featured
  search/                    step 1: intent bubble, clarifying questions, facets, sort, compare tray
  compare/                   side-by-side + Mizan's pick
  p/[id]/                    step 2: where to buy (ranked shops, map, maybe-shops, alternatives, verdict, chat, specs)
  m/[id]/                    step 3+4: live calls, recommendation, visit plan, follow-ups
  track/  map/  s/[id]/      tracking list, shops map, shop detail
  seller/                    seller panel (answer agent questions, confirm prices)
  xray/ scan/ list/ tools/   in-store tools
  api/                       see "API"
src/components/              ui.tsx primitives, Sheet, ContextBar (location/time/radius/conditions), shop.tsx (ShopCard, PriceTruth…), MapView…
src/lib/
  catalog/                   Catalog interface (types.ts), SqliteCatalog, query.ts (FTS + synonyms + relevance), match.ts
  shop/                      pure: hours (Tehran tz), geo/ETA/map links, address parsing, freshness, context, rank (+ reasons)
  agent/                     intent.ts (Persian request parser), call-sim.ts, missions.ts (orchestration), confirmations, seller, shops-service
  ai/                        LLM-backed tasks with rule-based fallbacks: understand, chat, vision
  llm/ db/ format.ts text.ts verdict.ts persona.ts http.ts shopper-store.ts use-api.ts …
```

## Key behaviours (agent)

- `createMission`: ranks shops for the shopper, calls the top 3 that are open now (or whose seller is online in `/seller`);
  if all are closed, schedules the calls for each shop's opening time.
- `advance()` (runs lazily on every GET, no workers): records finished calls as confirmations, times out silent
  sellers (75 s), replaces failed calls with the nearest candidate (same passage first), updates status.
- Simulated shopkeeper (`call-sim.ts`) is deterministic per (shop, product, day) and grounded in data: closed → no answer,
  stale price → drifts up, category-only shop → lower stock odds.
- Confirmations (call / seller / shopper report) are shared across users for 3 days and override listed prices in ranking.

## Conventions

- RTL logical utilities; back = `ChevronRight`. Chat/transcripts: agent `self-start` (right), other party `self-end`.
- Numbers only via `lib/format.ts` (Persian digits). **Never use «·» or «•» next to digits** — they look like Persian zero «۰»; use «،» or «؛».
- Render-time clocks: `useNow()` (React Compiler forbids `Date.now()` in render). Client shopper context: `useShopper()`.
- Errors: `{ error: { code, message } }` with Persian message; wrap route handlers in `handle()`.
- Sheets/overlays through `<Sheet>` / `<Portal>`. Leaflet container must be `dir="ltr"`.
- Dataset quirks: some shops list a product twice (dedupe per shop); price outliers (summary keeps median/3..×3); product images come from Torob's CDN (fallback icon underneath).

## API

| Route | Purpose |
|---|---|
| `GET /api/search?q=&category=&brand=` + ctx | products + facets + priceBands + per-product shop stats |
| `GET /api/products/[id]` + ctx | product (specs), ranked shops, hidden counts, maybe-shops, similar |
| `GET /api/products/featured` / `GET /api/compare?ids=` | home cards / comparison |
| `POST /api/understand {text}` | Persian request → intent (+ visitAt) |
| `GET /api/shops/[id]` / `GET /api/shops/near` | shop detail / map |
| `GET /api/areas` | dataset neighbourhoods + landmarks + catalog stats |
| `GET,POST /api/missions` · `GET,PATCH /api/missions/[id]` | agent missions (actions: choose, status, recheck, more, later, runNow) |
| `POST /api/reports` | shopper-reported stock/price |
| `/api/seller/{inbox,answer,price,shops}` | seller panel |
| `/api/identify`, `/api/xray`, `/api/xray/shelf`, `/api/chat`, `/api/history`, `/api/list`, `/api/transcribe`, `/api/health` | in-store tools, chat, misc |

Context params (`lib/shop/context.ts`): `lat, lon, ol, os, r, at, inst, tp, open, war, fast, max`.

## Next.js 16 gotchas

- `usePathname()`/`useSearchParams()`/`params` need a `<Suspense>` ancestor. GET handlers must `await connection()` to be dynamic.
- Route files may only export handlers (no other constants). `handle()` calls `unstable_rethrow`.
- React Compiler lint: no sync setState in effects, no components created in render, no impure calls in render.
- `AGENTS.md` is rewritten by `next dev`; commit as-is. `devIndicators: false`.
- Windows dev: `npm ci --ignore-scripts` (better-sqlite3 ships prebuilds; node-gyp needs VS otherwise).

## Verdict thresholds (`lib/verdict.ts`)

vs. Tehran listed **median**: ≤ +2% good · ≤ +10% fair · > +10% high. Below 85% of min → "suspiciously cheap".
