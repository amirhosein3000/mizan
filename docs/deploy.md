# Deploy

**Live:** https://mizan.liara.run (Liara, team «لیارا», app `mizan`, plan medium-g2 + basic bundle,
disk `data` → `/app/data`, network `mizan-net`). Deployed 2026-10-22 with the prebuilt bundle (route A below).

## Route A (what works on Liara): prebuilt bundle, copy-only image

The basic feature bundle caps the image build at **5 minutes**, and Liara's builder is slow at writing layers
(npm install + next build + copies didn't fit). So build on Linux locally (WSL is fine) and ship a copy-only image:

```bash
# in WSL / Linux, from a copy of the repo with catalog/catalog.db present
bash scripts/prebuilt-bundle.sh          # npm ci + next build + deploy-bundle/{Dockerfile,app.tar}
liara deploy --path deploy-bundle -a mizan --platform docker -p 3000 -d data:/app/data
```

Gotchas found on the way:
- `liara deploy` always skips folders named `node_modules` and `.next` **at any depth**, whatever the ignore
  files say. Hence one `app.tar`, which Docker's `ADD` unpacks.
- The image runs as root because the mounted disk at `/app/data` is root-owned.
- Must be built on Linux: Next's standalone output embeds absolute build paths, and the Linux
  better-sqlite3 prebuild must be present.
- From a machine behind a foreign VPN, `*.liara.run` may fail TLS or return 503 from the proxy; test with
  `curl --noproxy '*' --resolve mizan.liara.run:443:<ip>` (IP via `nslookup mizan.liara.run 1.1.1.1`).
- Apps on a team need `--team-id`; the feature-bundle names are `free|basic|standard|pro`.

## Route B: build on the server (any Docker host; on Liara needs a bigger build-time bundle)

One Docker image (Next.js `standalone` output) that contains:

- the app, and
- the **read-only catalog** built from Torob's dataset (`/app/catalog/catalog.db`, ~180 MB).

User data (history, missions, calls, confirmations, seller presence) is a small SQLite file at
`DATABASE_PATH` (`/app/data/mizan.db`) → mount a persistent disk at **`/app/data`**. The catalog is deliberately
outside `/app/data`, because a mounted disk hides whatever the image had at that path.

> HTTPS is required for GPS and the camera on phones. Liara's `*.liara.run` domains are HTTPS out of the box.

## 0. Build and pack the catalog (once per dataset)

The CSVs are never deployed; only the packed catalog is.

```bash
# put shops.csv, products.csv, offers.csv in ./dataset (or set DATASET_DIR)
npm run catalog        # -> catalog/catalog.db   (~3 min)
```

`catalog/catalog.db` is git-ignored (too big for git) but **is** uploaded by `liara deploy`
(see `.liaraignore`; ~90 MB gzipped) and copied into the image by the Dockerfile.

## 1. Liara

`liara.json` declares a Docker app on port 3000 with a disk named `data` mounted at `/app/data`.

1. Install the CLI and log in (you do this yourself, once):
   ```bash
   npm i -g @liara/cli
   liara login
   ```
2. In the Liara console create the app: name `mizan` (or change `"app"` in `liara.json`), platform **Docker**,
   a plan with **≥ 1 GB RAM**.
3. Create a disk named `data` for the app (Console → app → Disks, 1 GB is plenty).
4. Environment variables (Console → app → Settings). Nothing is required; optional:
   ```
   MOCK_LLM=false
   LLM_BASE_URL=...   LLM_API_KEY=...   LLM_MODEL=...   VISION_MODEL=...
   ```
   Without them the assistant runs fully rule-based (intent parsing, call simulation, chat answers).
   Iranian servers often can't reach foreign AI APIs; use an OpenAI-compatible gateway reachable from Liara.
5. Deploy from the repo root (with `catalog/catalog.db` present):
   ```bash
   liara deploy
   ```
   The upload is ~90 MB; the image build (npm ci + next build) takes several minutes on Liara, which is
   more than the basic bundle allows. Use route A there.
6. Smoke test:
   ```bash
   curl https://<app>.liara.run/api/health
   ```
   Expected: `{"ok":true,"llm":"mock","catalog":{"shops":6476,"products":225903,"offers":331506,...}}`.
   Then on a phone (mobile data): home → «هدفون انکر زیر ۵ میلیون قسطی» → a product → «میزان زنگ بزنه».

## 2. Any Docker host

```bash
docker build -t mizan .
docker run -d --name mizan -p 3000:3000 -v mizan-data:/app/data --env-file .env --restart unless-stopped mizan
curl http://localhost:3000/api/health
```

## 3. Without Docker

```bash
npm ci && npm run catalog && npm run build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
PORT=3000 DATABASE_PATH=./data/mizan.db CATALOG_PATH=./catalog/catalog.db node .next/standalone/server.js
```

## Notes

- **Map tiles** come from tile.openstreetmap.org (keyless); product photos from Torob's image CDN. Both load
  from Iranian networks; if not, the UI falls back to category icons and the shop list still works.
- **Feature flags** are build-time (`NEXT_PUBLIC_FEATURES_OFF=chat,xray`). On Liara, set them before
  `liara deploy` or edit `enabled` in `src/config/features.ts`.
- Health check: `/api/health` returns 503 if the catalog can't be opened.
