# Progress

Update this file at the end of every session/milestone: what's done, what's next, open issues.

## Status — 2026-10-21

### Prompt 0 (kickoff) — DONE
- Name: **Chooneh (چونه)**, from «چونه زدن» (haggling): two syllables, easy in Persian and English, ties into the negotiation-line hero touch.
  Other candidates: Nerkhyab (نرخ‌یاب, hard in English) and Ayneh (آینه, too generic).
- Private repo: https://github.com/amirhosein3000/chooneh
- Next.js 16.4 + Tailwind v4 PWA, RTL Persian, Vazirmatn, theme tokens, bottom nav with a centre X-ray button.
- Price adapter: `PriceProvider` + `MockPriceProvider` (292 generated products: 73 mobile, 41 laptop, 68 appliance, 110 grocery) + `TorobPriceProvider` stub.
- LLM adapter: OpenAI-compatible client, MOCK mode, backup provider fallback, Persian error messages.
- Demo flow works end to end in MOCK mode: photo/barcode/text → product → price range → store price → verdict → negotiation sheet → savings card → alternatives → chat → history.
- Hero: Price X-ray with live mode, gallery upload and a drawn "sample shelf" fallback (works with no camera).
- Vision pipeline with confidence + top-3 candidate picker; reads shelf price tags.
- SQLite history (Drizzle), per-device cookie.
- Quality gates: `npm run check` green (eslint, tsc, 29 vitest tests, next build).
- Docs: CLAUDE.md, README, spec-day playbook, pitch draft, Dockerfile, .env.example.

### Verified by hand (in-app browser, 380px)
Home, text search, product page, verdict (overpriced case), negotiation sheet, savings sheet, chat (mock),
X-ray sample shelf (phones + groceries, incl. "above printed price"), badge sheet, history. Photo identify was
checked through the API (high-confidence and picker paths).

### Not verified yet
- Real camera (live X-ray, photo capture, barcode scanning) on a phone: the in-app browser blocks the camera.
- Real LLM / vision provider (no key yet).
- Docker image build: Docker isn't installed on this machine. The standalone server was smoke-tested directly with Node.

### Prompt 1 (verify & harden) — DONE
- Gates green; demo path walked at 380px in the in-app browser (incl. photo identify via injected file: auto-jump and picker paths, barcode with Persian digits, suspicious-cheap and above-printed-price verdicts, tools, demo kit, 404).
- Live LLM path tested end to end against a fake OpenAI-compatible server (`npm run smoke:llm`): ok, backup-provider fallback, junk JSON, 401, 500, timeout, unreachable → all 200 or friendly Persian 503, never a crash.
- Fixed: shelf prices returned with Persian digits were dropped; overlays clipped by animated parents (Portal); dev badge covering the nav; empty grocery demo shelf; duplicate alternatives; camera-denied copy on the barcode tab; suspicious-cheap verdict now amber; picker scrolls into view.
- docs/deploy.md (Liara + Docker + no-Docker fallback), liara.json.

### Prompt 2 (extra modules) — IN PROGRESS
- Done (code, typecheck and lint pass): flags for all 7 modules in `src/config/features.ts`; `ensureTables()` for module-owned tables;
  module 1 shopping list (`/list`, `api/list`, `src/modules/shopping-list/`); module 6 voice input (`VoiceButton`, `api/transcribe`,
  `src/modules/voice/`), wired into search, chat and the list.
- BUG TO CHECK FIRST: in the running dev server, `/api/list` returned `feature_off` although `shoppingList` is enabled.
  Probably a stale dev compile of `features.ts`: restart `npm run dev` and retest. If it persists, debug `isEnabled` on the server.
  (A suspected horizontal overflow on /list was a screenshot artefact: scrollWidth == clientWidth.)
- Left: 2 receipt/price-tag reader, 3 compare, 4 price history chart (load the dataviz skill first), 5 nearby stores,
  7 seller view; then add a "Modules" section to CLAUDE.md (flag, files, how to remove) and run `npm run check`.

## Next
- Finish prompt 2 (above).
- Prompt 3: spec-day dry run.

## Open issues
- Live X-ray mode depends on the vision model's latency (~2–6 s per frame expected); the single-photo mode is the safe demo path.
- `BarcodeDetector` isn't on iOS Safari; the ZXing fallback is used there (not yet tested on a device).
