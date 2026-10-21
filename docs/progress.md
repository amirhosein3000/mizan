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

## Next
- Prompt 1: strict review and hardening, docs/deploy.md (Liara), LLM failure behaviour.
- Prompt 2: extra modules behind flags.
- Prompt 3: spec-day dry run.

## Open issues
- Live X-ray mode depends on the vision model's latency (~2–6 s per frame expected); the single-photo mode is the safe demo path.
- `BarcodeDetector` isn't on iOS Safari; the ZXing fallback is used there (not yet tested on a device).
