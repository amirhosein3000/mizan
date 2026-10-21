# Chooneh (چونه)

> **چونه** دستیار هوشمند خرید حضوریه: توی مغازه از کالا عکس بگیر، بارکدش رو اسکن کن یا اسمش رو بنویس؛
> چونه قیمت آنلاینش رو نشونت میده، میگه قیمت مغازه خوبه، منصفانه‌ست یا گرون، یه جمله‌ی آماده برای چونه زدن
> بهت میده و گزینه‌های ارزون‌تر رو پیشنهاد می‌کنه. با «اشعه‌ی ایکس قیمت» دوربین رو بگیر سمت قفسه و کنار
> هر کالا یه برچسب سبز، زرد یا قرمز ببین. ساخته‌شده برای هکاتون ترب.

**Chooneh** is a smart assistant for in-person shopping, built for the Torob hackathon challenge
«دستیار هوشمند برای خرید حضوری». Mobile-first, Persian/RTL, installable PWA.

## What it does

- **Identify** a product by photo (vision model), barcode (in-browser scanner) or name (Persian/English fuzzy search)
- **Online price picture**: cheapest / typical / most expensive across sellers
- **Verdict** on the in-store price (good / fair / overpriced), target price, and a **negotiation line** to show the seller
- **Price X-ray** (hero): point the camera at a shelf; every recognised product gets a colour badge
- Pre-purchase **checklist**, cheaper **alternatives**, product **chat** in Persian, **history**, shareable **savings card**

## Run locally

Requires Node 22+.

```bash
npm install
npm run dev            # http://localhost:3000 — runs fully in MOCK mode, no keys needed
```

To use a real LLM, copy `.env.example` to `.env.local`, set `MOCK_LLM=false` and the `LLM_*` variables
(any OpenAI-compatible endpoint; the vision model must accept images).

Camera features need HTTPS on phones (localhost is fine on the same machine). Without a camera, use
**X-ray → «قفسه‌ی نمونه»** (sample shelf) or **Tools → کیت دمو** (printable barcodes).

## Quality gates

```bash
npm run check          # eslint + tsc + vitest + next build
```

## Deploy

Docker image (Next.js standalone). Mount a persistent volume at `/app/data` for the SQLite file.

```bash
docker build -t chooneh .
docker run -p 3000:3000 -v chooneh-data:/app/data --env-file .env chooneh
```

Liara steps: see [docs/deploy.md](docs/deploy.md).

## Project docs

- [CLAUDE.md](CLAUDE.md) — architecture, conventions, how to add a module (for developers and Claude Code)
- [docs/progress.md](docs/progress.md) — status, next steps, open issues
- [docs/spec-day.md](docs/spec-day.md) — playbook for when the official spec is published
- [docs/pitch.md](docs/pitch.md) — pitch outline

## Data notice

All prices, sellers, offers and barcodes in `src/data/mock/products.json` are **generated mock data** for the
demo. Brand names are used only to make the demo realistic. The `TorobPriceProvider` is a stub for whatever
data the sponsor provides; nothing is scraped.
