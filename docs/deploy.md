# Deploy

The app ships as one Docker image (Next.js `standalone` output). State lives in one SQLite file at
`DATABASE_PATH` (default in Docker: `/app/data/chooneh.db`) → mount a persistent disk at `/app/data`.

> **HTTPS is required** for the camera (X-ray, photo capture, barcode) on phones. Liara's `*.liara.run`
> domains are HTTPS out of the box.

## Liara (recommended)

`liara.json` at the repo root already declares a Docker app on port 3000 with a disk mounted at `/app/data`.
Liara's CLI/console changes over time. If a step below differs, follow Liara's docs (docs.liara.ir) for
"Docker" apps and disks; the app's requirements stay the same.

1. Install and log in to the CLI (once):
   ```bash
   npm i -g @liara/cli
   liara login
   ```
2. Create the app in the Liara console (or `liara app create`): name `chooneh`, platform **Docker**, the smallest plan with ≥ 1 GB RAM.
   If you choose another name, change `"app"` in `liara.json`.
3. Create a disk named `data` (1 GB is plenty) for the app: Console → app → Disks. It's mounted at `/app/data` (see `liara.json`).
4. Set environment variables: Console → app → Settings → Environment variables. Minimum for the demo:
   ```
   MOCK_LLM=true
   PRICE_PROVIDER=mock
   ```
   For a real model, also set `MOCK_LLM=false` and `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `VISION_MODEL`.
   The optional backup is `LLM_FALLBACK_*` (see `.env.example`).
   **Iranian servers often can't reach foreign AI APIs directly**, so pick an OpenAI-compatible gateway the
   Liara server can reach, and check it from the deployed app (step 7).
5. Deploy from the repo root:
   ```bash
   liara deploy
   ```
   The image builds on Liara's builder (`npm ci` + `next build`; takes about 3–5 minutes).
6. Smoke test on the URL Liara gives you (e.g. `https://chooneh.liara.run`):
   ```bash
   curl https://chooneh.liara.run/api/health
   ```
   Expected: `{"ok":true,"llm":"mock","priceProvider":"mock",...}`. Then on your phone, **on mobile data**, open
   the URL: home → X-ray → «قفسه‌ی نمونه» → tap a badge → verdict.
7. If using a real LLM, check it from the server: open the X-ray, snap a real shelf, and confirm badges
   appear. If you get «سرویس هوش مصنوعی در دسترس نیست», the server can't reach the provider: switch provider or set `MOCK_LLM=true`.
8. Install as an app: Chrome on Android → ⋮ → "Install app"; iOS Safari → Share → "Add to Home Screen".

Feature flags are build-time (`NEXT_PUBLIC_FEATURES_OFF=...`). On Liara, set them as environment
variables **before** `liara deploy`. If the builder doesn't pass them through as Docker build args, edit
`enabled` in `src/config/features.ts` and redeploy instead.

## Any Docker host

```bash
docker build -t chooneh .
docker run -d --name chooneh -p 3000:3000 -v chooneh-data:/app/data --env-file .env --restart unless-stopped chooneh
curl http://localhost:3000/api/health
```

Put it behind an HTTPS reverse proxy (Caddy, nginx + certbot) for camera access on phones.

## Without Docker (quick fallback)

```bash
npm ci && npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
PORT=3000 DATABASE_PATH=./data/chooneh.db node .next/standalone/server.js
```

For a phone demo from a laptop on the same Wi-Fi you still need HTTPS for the camera. Use a tunnel
(e.g. `cloudflared tunnel --url http://localhost:3000`) or rely on the sample shelf / gallery upload,
which work over plain HTTP.

## Verify before the demo

- `npm run check`: lint, types, tests and build all green.
- `npm run smoke:llm`: the live-LLM path plus every failure mode against a fake provider (no key needed).
- `/api/health` on the deployed URL.
- The full demo path on a real phone, on mobile data.
