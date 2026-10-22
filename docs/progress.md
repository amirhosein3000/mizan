# Progress

Update this file at the end of every session/milestone: what's done, what's next, open issues.

## Deployed — 2026-10-22: https://mizan.liara.run

Liara team «لیارا», app `mizan` (medium-g2, basic bundle), disk `data`, LLM env vars set from `.env.local`.
Verified live: all pages 200, `/api/health` → `llm: live`, `/api/understand` (LLM) parses «هدفون انکر زیر ۵ میلیون
قسطی», a mission starts 3 calls (user DB on the disk). Route: `scripts/prebuilt-bundle.sh` in WSL → copy-only
image (see docs/deploy.md for why the server-side build didn't fit the 5-minute cap).

## Hero moments — 2026-10-22

- **پاساژنما** (`components/MallView.tsx`, `lib/shop/mall.ts`): on the product page, passages holding ≥3 of the
  listing shops are drawn as a building (floors top→bottom, entrance), shops as chips with price, open dot and
  «ارزون‌ترین»; tap to select, or «میزان به N فروشگاهِ همین پاساژ زنگ بزنه» (≤5, open first, then cheapest).
  Mall-name spelling variants (علاءالدین/علائدین/مجتمع تجاری … تهران، چهارسو) collapse to one building.
- **کارنامه‌ی میزان** (`components/MissionHeroes.tsx`): after the calls end — calls/answered, dead-end trips
  avoided, time freed (3 min per call + round trips to shops that didn't have it), money vs. Tehran median or the
  priciest answer. Copy says the times are estimates.
- **کارت فروشنده**: full-screen counter card — confirmed price (call or seller panel), call time, hold, 4-digit code.
- **بفرست برای کسی**: Web Share (copy fallback) of shop, exact address, price, Neshan link.
- **Plan B on a closed shop** (from the UX pass) is part of the demo script too.
- Verified: headless 390px shots of each; `npm run check` green (56 tests); standalone production server smoke
  (health, product, shop plan B, pages → 200).

## UX pass — 2026-10-22 (whole demo path reviewed at 390px with headless Chrome)

Fixed / improved:
- Home "popular" ranked by DISTINCT shops (one shop listed a sofa 105 times), everyday categories first.
- Search opened from a link (`?q=` without `said`) now runs the request parser, so budget/installment apply.
- Product cards lead with «از X» = cheapest shop matching the shopper's conditions (listed outliers below the
  trimmed minimum ignored), Tehran range underneath; products no shop can sell sink to the bottom, dimmed.
- Context bar: budget + active conditions first (what the agent set is visible without scrolling).
- Location sheet: landmarks first as chips (ونک، تجریش…), shop-dense areas below.
- Product: floating call CTA no longer collides with the centre «بپرس» button; header shows the category;
  duplicate chips (confirmed stock, price age) removed from shop cards; 404 = empty state with a way forward.
- Shop page: **plan B** — opened for a product while closed (now or at the visit time) → the nearest open shops
  that list it, with price (`openInstead` in `/api/shops/[id]?p=`).
- Mission: narration and hint follow the status (visiting / bought); no-best → «گزینه‌های تأییدشده»;
  address shown once, Persian digits; warranty text in Persian digits; not-found mission explains devices.
- Compare: «ارزون‌ترین با شرایط تو» row, «فعلاً بسته» instead of ۰, distance row hidden without a location.
- X-ray: badges centred on each product and clamped inside the photo; readable scanning label; demo-shelf hints
  matched by text (the model may reorder items or misread a tag) — verdicts now stable.
- Voice: browser speech recognition (fa-IR) first; server STT fallback; graceful 503 when the provider has no STT
  (BoxAPI). Mock phrases updated to Tehran shopping requests.

Review tooling (not committed): puppeteer-core in the session scratchpad, iPhone-size emulation, full-page shots.
The in-app browser pane crops when hidden, so use headless shots for visual review.

## Status — 2026-10-21 (challenge published, app rebuilt on the Torob dataset)

The challenge turned out to be «دستیار هوشمند خرید حضوری از فروشگاه‌های تهران» with a dataset of shops, products
and offers. The pre-challenge app (in-store verdict / X-ray on mock data) was rebuilt around the four steps from
the brief. X-ray, verdict, scan, list and voice stay as the «تو مغازه» tools, rewired to real Tehran prices.

### Done
- **Data**: `scripts/build-catalog.ts` turns the CSVs into `catalog/catalog.db` (SQLite, FTS5, 180 MB; 73 MB packed).
  Address parsing (passage / floor / unit), hours normalised to Tehran minutes, payments with in-person vs. unknown
  channel, price sanity (invalid → null; summaries ignore outliers outside median/3..×3), instagram JSON → URL.
- **Search**: Persian/Latin synonyms, head-noun + category intent + accessory penalty ranking, facets, price bands.
- **Step 1**: Persian request parser (budget, ranges, place, near me, installment, open now, warranty, visit time);
  optional LLM refinement. Clarifying questions, facets, sort, compare (+ Mizan's pick).
- **Step 2**: ranked shops with reasons, distance/ETA, hours at visit time, freshness, hidden-by-filter counts,
  category-only "maybe" shops, map (Leaflet + OSM), shop page (hours table, payment truthfulness, neighbours).
- **Step 3**: missions: parallel simulated calls with live transcripts; auto-replacement (nearest, same passage);
  schedule for opening time when closed + demo «اجرای نمایشی»; seller panel answers live (ring + vibrate);
  confirmations shared across shoppers for 3 days.
- **Step 4**: recommendation card (confirmed price, hold, leave-by, traffic-zone tip, Neshan/Balad/Google, checklist),
  «دارم میرم» / «دوباره بپرس» / «خریدم» + price report; tracking page.
- Gates: `npm run check` green (54 tests as of the UX pass). Standalone production server smoke-tested (health, search, product, missions).
- Docs: README, CLAUDE.md, docs/deploy.md (Liara), docs/demo-video.md (5-min script).

### Verified by hand (in-app browser, 375px)
Home → example ask → search (intent bubble, facets) → product (location, ranked shops, transparency note) →
call sheet → live call → no-stock → scheduled follow-up → demo run (2 confirmed, recommendation) → seller panel
answering a live inquiry → shopper sees confirmed price + hold + leave-by. Map, shop page, X-ray sample shelf.

### Not verified
- Docker build (Docker isn't installed on this machine) and the Liara deploy itself (needs the user's `liara login`).
- Product photos and map tiles from inside Iran (Torob's image CDN is blocked from this dev machine; fallbacks work).
- GPS on a real phone; Docker build.

### LLM integration (BoxAPI, gpt-5.4-mini) — DONE & verified live on the new app
- `.env.local` (gitignored): https://ai.boxapi.ir/ai/v1, `gpt-5.4-mini` for text + vision. Client sends `max_completion_tokens`
  and retries without parameters the provider rejects (from branch claude/api-token-integration-6d5e78, cherry-picked).
- Verified live: `/api/understand` (source "llm", ~3 s, 6 s budget then rules), `/api/chat` (grounded: shop, distance,
  confirmed price, address; light Markdown rendered), X-ray vision on the sample shelf (5 s), and the shopkeeper's answer to the
  shopper's own call question, generated once per mission from the product specs (no-key fallback: spec lookup).
- BoxAPI has no /audio/transcriptions: voice input stays mock. On this machine a local proxy breaks curl to boxapi; Node fetch is fine.

## Next
- Deploy to Liara (docs/deploy.md): the saved Liara login is expired → user runs `liara login`, creates app `mizan` + disk `data`,
  sets env vars (MOCK_LLM=false, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, VISION_MODEL, LLM_TIMEOUT_MS) in the console; then `liara deploy`.
- Record the demo video (docs/demo-video.md), ideally during shop hours.

## Open issues
- Landmark coordinates in `lib/shop/places.ts` are approximate (dataset neighbourhood centroids are exact).
- Traffic-zone check is a bounding box (labelled «احتمالاً»).
