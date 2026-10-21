# Progress

Update this file at the end of every session/milestone: what's done, what's next, open issues.

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
- Gates: `npm run check` green (48 tests). Standalone production server smoke-tested (health, search, product, missions).
- Docs: README, CLAUDE.md, docs/deploy.md (Liara), docs/demo-video.md (5-min script).

### Verified by hand (in-app browser, 375px)
Home → example ask → search (intent bubble, facets) → product (location, ranked shops, transparency note) →
call sheet → live call → no-stock → scheduled follow-up → demo run (2 confirmed, recommendation) → seller panel
answering a live inquiry → shopper sees confirmed price + hold + leave-by. Map, shop page, X-ray sample shelf.

### Not verified
- Docker build (Docker isn't installed on this machine) and the Liara deploy itself (needs the user's `liara login`).
- Product photos and map tiles from inside Iran (Torob's image CDN is blocked from this dev machine; fallbacks work).
- Real LLM (no key yet); GPS on a real phone.

### LLM integration (BoxAPI) — DONE 2026-10-21
- `.env.local` (gitignored) points at https://ai.boxapi.ir/ai/v1, model `gpt-5.4-mini` (text + vision). Verified live: /api/chat, /api/identify, /api/xray (reads brand/model/price from a photo, matches, verdict).
- Client fix: GPT-5-family models reject `max_tokens` and non-default `temperature` -> now sends `max_completion_tokens` and retries without any parameter the provider rejects.
- BoxAPI has no /audio/transcriptions, so voice input won't work live. `gpt-6-*` models only accept default temperature (handled by retry) and are slower.
- On this machine a local proxy (127.0.0.1:10808) breaks curl to boxapi; Node fetch is fine.

## Next
- Deploy to Liara (docs/deploy.md): user logs in, then `liara deploy`.
- Record the demo video (docs/demo-video.md), ideally during shop hours.
- With an LLM key: set `MOCK_LLM=false` + `LLM_*`; check `/api/understand` and chat.

## Open issues
- Landmark coordinates in `lib/shop/places.ts` are approximate (dataset neighbourhood centroids are exact).
- Traffic-zone check is a bounding box (labelled «احتمالاً»).
