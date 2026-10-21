# CLAUDE.md — Mizan (میزان)

Smart assistant for **in-person shopping**, built for the Torob hackathon challenge
«دستیار هوشمند برای خرید حضوری». A shopper in a physical store identifies a product
(photo / barcode / text), sees the online price range, gets a verdict on the store's
price, a negotiation line, alternatives, and can chat about the product in Persian.

Start every session by reading this file and `docs/progress.md`. Update `docs/progress.md` when you finish.

@AGENTS.md

## Rules that override everything

1. **Demo path first.** The demo path (below) must work at every commit. Never leave it broken; switch a module off with its flag instead.
2. **Protect the hero moment: Price X-ray.** `/xray` — point the camera at a shelf, every product gets a green / yellow / red badge vs. online price. Any change that slows it, breaks the sample-shelf fallback, or removes the colour badges needs an explicit OK from the user.
3. **Persian, RTL, phone-first.** Design at 380px. All user-facing copy in Persian; code, comments, docs in English.
4. **Adapters only.** Feature code never imports a concrete LLM vendor or price provider — only `getLLM()` and `getPriceProvider()`.
5. **Run the gates before saying "done":** `npm run check` (lint + typecheck + tests + build).
6. **Next.js 16.4 is newer than your training data.** Read `node_modules/next/dist/docs/` before using an unfamiliar API. Cache Components are ON (see "Next.js gotchas").
7. Never commit secrets. Never scrape any website. Don't use Torob's logo/brand assets; UI may say «ساخته‌شده برای هکاتون ترب».

## Demo path (must always work in MOCK mode with zero keys)

Home → (photo | barcode | text) → product page → online price range → enter store price →
verdict card (+ «نشون دادن به فروشنده» negotiation sheet + checklist) → «خریدمش!» savings card →
alternatives → «بپرس از میزان» chat → saved in history.
Hero: Home → ایکس‌ری → «قفسه‌ی نمونه» (sample shelf, works without camera) → badges → tap → full verdict.

## Stack

- Next.js 16.4 (App Router, Turbopack, Cache Components) + React 19 + TypeScript + Tailwind v4
- SQLite via better-sqlite3 + Drizzle (tables bootstrapped with `CREATE TABLE IF NOT EXISTS`, no migrations)
- lucide-react icons, Vazirmatn font (local, from the `vazirmatn` npm package)
- Barcode: native `BarcodeDetector`, ZXing (`@zxing/browser`) fallback
- Vitest for unit tests; `tsx` for scripts
- Docker (Next standalone output) → Liara or any Docker host

## Commands

```bash
npm run dev          # http://localhost:3000 (MOCK mode by default)
npm run check        # lint + typecheck + tests + build — run before claiming done
npm run lint | typecheck | test | build
npm run seed         # regenerate src/data/mock/products.json (deterministic)
npm run icons        # regenerate public/icons/* from the SVG in scripts/generate-icons.ts
npm run smoke:llm    # build + exercise the LIVE LLM path and failure modes against scripts/fake-llm.mjs (no key needed)
docker build -t mizan . && docker run -p 3000:3000 -v mizan-data:/app/data mizan
```

## Folder layout

```
src/
  app/                      routes (pages are thin; screens are *Screen.tsx client components)
    page.tsx, HomeScreen.tsx        home: hero X-ray card, identify buttons, recent, featured
    scan/                           identify: photo | barcode | text tabs (?mode=photo|barcode|text&q=)
    p/[id]/                         product page: the core demo flow (ProductScreen.tsx)
    xray/                           HERO: Price X-ray camera (XrayScreen.tsx)
    history/  tools/  demo/         saved/history, module grid, printable demo barcodes
    api/                            route handlers (see "API")
    manifest.ts, layout.tsx, globals.css (theme tokens), not-found.tsx, error.tsx
  components/               shared UI (ui.tsx primitives, VerdictCard, PriceRangeCard, ChatPanel, …)
  config/features.ts        FEATURE FLAGS — one entry per module
  lib/
    price/                  PriceProvider interface (types.ts), mock-provider.ts, torob-provider.ts (stub), index.ts
    llm/                    OpenAI-compatible client, MOCK client, backup fallback, errors with Persian messages
    ai/                     task-level AI: vision.ts (photo -> items+prices+bbox), chat.ts (grounded Q&A)
    db/                     SQLite + Drizzle schema
    verdict.ts              pure verdict logic + negotiation line + per-category checklists
    match.ts, text.ts       fuzzy matching (Persian/English normalization)
    format.ts               ALL number/price formatting (Persian digits, Toman, parsePrice)
    persona.ts              assistant name, greetings, system prompt
    http.ts                 handle() wrapper, fail(), device-id cookie, image validation
  data/mock/products.json   GENERATED mock catalog (292 products) — do not hand-edit, run `npm run seed`
scripts/                    generate-seed.ts, generate-icons.ts, fake-llm.mjs (fake OpenAI-compatible server), llm-smoke.mjs
tests/                      vitest unit tests
docs/                       progress.md, spec-day.md, pitch.md, deploy.md (Liara + Docker)
liara.json, Dockerfile      deployment (standalone Next server, SQLite on a disk at /app/data)
```

## Conventions

- **RTL**: `<html dir="rtl" lang="fa">`. Use logical utilities (`ps-`, `pe-`, `ms-`, `text-start`, `insetInlineStart`). "Back" chevron is `ChevronRight`; "forward" is `ChevronLeft`. Send icon is mirrored (`-scale-x-100`).
  Chat: user bubbles `self-end` (left), assistant `self-start` (right).
- **Numbers & prices**: never print raw numbers. Use `formatToman()` ("۱٬۲۳۴٬۵۶۷ تومان"), `formatTomanShort()` ("۳۴٫۵ میلیون"), `formatNumber()`, `formatPercent()`. Parse user input with `parsePrice()` (accepts Persian digits, «میلیون», «هزار», ریال→تومان). All prices are integers in **Toman**.
- Latin model names (e.g. "Galaxy A56") keep Latin digits; everything computed/formatted uses Persian digits.
- **Persian copy voice**: friendly colloquial-polite («بزن ببینیم…», «گرونه!»), short. Assistant name: «میزان» (the balance: it weighs the store price against the market). «چونه زدن» in copy means haggling, not the app. Keep copy in components; persona lines in `lib/persona.ts`.
- **Errors**: API returns `{ error: { code, message } }` with a Persian `message`; client shows it via `errorMessage(err)` / `<ErrorNote>`. Wrap every route handler in `handle()` (catches LLM errors → 503 with friendly text; rethrows Next internals).
- **Overlays/sheets** go through `<Portal>` (animated parents create containing blocks for `position: fixed`).
- **Mock data must look mock**: `<ModeBadge>` shows «داده‌ی نمایشی» whenever `PRICE_PROVIDER=mock`.
- Theme tokens live in `globals.css` (`--brand`, `--good/--fair/--high` + `-soft`). Light theme only (deliberate).
- Client fetches go through `api()` in `lib/client-api.ts`. Server-only modules import `"server-only"`.

## Provider / adapter pattern

### Price data — `src/lib/price`
`PriceProvider` (types.ts): `searchProducts`, `getProduct`, `findByBarcode`, `getOffers`, `getAlternatives`, `listFeatured`.
`getPriceProvider()` picks by `PRICE_PROVIDER=mock|torob`. To plug real data: implement `TorobPriceProvider`
(currently throws), map their fields to `Product`/`Offer`, add caching, keep mock as fallback for missing fields.
`summarizeOffers()` computes min/median/max/count — use it, don't recompute.

### LLM — `src/lib/llm`
`getLLM()` returns an `LLMClient` (`chat(messages, {json, vision})`, `transcribe(blob)`). Env: `LLM_BASE_URL`,
`LLM_API_KEY`, `LLM_MODEL`, `VISION_MODEL`, `STT_MODEL`, optional `LLM_FALLBACK_*`. `MOCK_LLM=true` or a missing
key → mock client. Task-level code (`lib/ai/*`) checks `llm.mode === "mock"` and returns deterministic,
data-grounded canned results — keep that behaviour for every new AI feature so the demo runs with zero keys.
Use `parseJsonReply()` for JSON answers.

### Vision pipeline
photo → client downscales to 1024px JPEG (`lib/image.ts`) → `/api/identify` → `readProductsFromImage()` (vision
model returns brand/model/text/price/bbox JSON) → `searchProducts(query)` → `matchConfidence()`:
`high` → jump to product (prefill store price if a tag was read); otherwise show top 3 (`CandidatePicker`).
Mock vision is deterministic per image hash; `hints` ("id" or "id@price") let the sample shelf drive it.

## How to add a feature module

1. Add an entry to `FEATURES` in `src/config/features.ts` (id, Persian title/description, `enabled`, `href` if it has a page, `icon` key from `components/icons.tsx`).
2. Page: `src/app/<route>/page.tsx` (server, calls `requireFeature("<id>")`) + `<Name>Screen.tsx` (client). Wrap anything using `useSearchParams`/`usePathname`/`params` in `<Suspense>`.
3. API: `src/app/api/<name>/route.ts`, wrapped in `handle()`, starting with `const off = featureOff("<id>"); if (off) return off;`.
4. Data: new tables → add CREATE statements to `BOOTSTRAP_SQL` in `lib/db/index.ts` + Drizzle table in `lib/db/schema.ts`.
5. AI: put prompts + mock branch in `src/lib/ai/<name>.ts`; never call a vendor from a route directly.
6. It must work in MOCK mode, and removing it must not break other modules (pages with `href` auto-appear in `/tools`).
7. Add a unit test for any pure logic. Run `npm run check`.

Flags: edit `enabled` in code, or at build time `NEXT_PUBLIC_FEATURES_OFF=chat,savings` / `NEXT_PUBLIC_FEATURES_ON=…`.

## API

| Route | Method | Purpose |
|---|---|---|
| `/api/products/search?q=&limit=` | GET | fuzzy search (+ summaries, confidence) |
| `/api/products/barcode?code=` | GET | exact barcode lookup |
| `/api/products/[id]` | GET | product + offers + summary + alternatives |
| `/api/products/featured?limit=` | GET | popular products, mixed categories |
| `/api/identify` | POST `{image, hints?}` | photo → reading + candidates + confidence |
| `/api/xray` | POST `{image, hints?}` | shelf photo → items with bbox, store price, match, verdict |
| `/api/chat` | POST `{productId, messages, storePrice?}` | grounded product Q&A |
| `/api/history` | GET / POST (upsert) / DELETE `?id=` | per-device history (cookie `cid`) |
| `/api/health` | GET | `{llm: mock|live, priceProvider}` |

## Next.js 16 gotchas (learned the hard way)

- Cache Components ON: `usePathname()`/`useSearchParams()`/`params` in client components need a `<Suspense>` ancestor or the build fails on dynamic routes (see `BottomNav`).
- GET route handlers are prerendered unless they read the request/cookies or call `await connection()`.
- `handle()` must call `unstable_rethrow(err)` before handling errors (already does).
- `RouteContext<…>` global type only exists after typegen; route files type `ctx` explicitly.
- `next lint` is gone — `npm run lint` runs `eslint` directly. The React Compiler lint rules forbid synchronous `setState` in effects and creating components during render.
- `AGENTS.md` is rewritten by `next dev`; commit it as-is.
- `devIndicators: false` in next.config — the dev badge covers the bottom nav at phone width.
- Overlays inside an element with a CSS animation/transform get clipped: always use `<Portal>`.

## Testing without hardware or keys

- No camera (desktop, in-app browser): X-ray → «قفسه‌ی نمونه»; scan → gallery upload; barcode → manual number entry; `/demo` prints barcodes.
- No LLM key: MOCK mode is automatic. To test the live path: `npm run smoke:llm`, or run `node scripts/fake-llm.mjs 4011 ok`
  and start the app with `MOCK_LLM=false LLM_BASE_URL=http://127.0.0.1:4011/v1 LLM_API_KEY=x LLM_MODEL=fake`.

## Verdict thresholds (`lib/verdict.ts`)

vs. online **median**: ≤ +2% → good (green) · ≤ +10% → fair (yellow) · > +10% → high (red).
Below 85% of the online **min** → "suspiciously cheap" warning (fake/unregistered). Groceries above the
printed consumer price → always red. Target price = max(min, 0.98 × median), rounded to a sayable number.
