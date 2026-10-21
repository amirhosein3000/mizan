# Mizan (میزان) — دستیار خرید حضوری تهران

> بگو چی می‌خوای بخری؛ میزان فروشگاه‌های نزدیکت رو از داده‌ی ترب پیدا می‌کنه، مقایسه می‌کنه، بهشون زنگ می‌زنه،
> قیمت و موجودی امروز رو تأیید می‌گیره و با آدرس دقیق (پاساژ، طبقه، واحد) و برنامه‌ی رفتن می‌فرستدت.
> ساخته‌شده برای هکاتون ترب.

**Mizan** is a smart assistant for in-person shopping in Tehran's shops and malls, built on Torob's challenge
dataset (6,476 shops, 225,903 products, 331,506 offers). Mobile-first, Persian/RTL, installable PWA.

## The four steps

1. **Understand & compare products** — say it in plain Persian («هدفون انکر زیر ۵ میلیون قسطی، نزدیک جمهوری»);
   the request becomes filters. Facets + clarifying questions («منظورت کدومه؟», «بودجه‌ت چقدره؟»), side-by-side compare.
2. **Find & compare shops near you** — ranked by price, distance/ETA, hours at your visit time, price freshness,
   installment / Torob Pay / warranty, with the *why* on every card. Exact address parts, map, “maybe” shops
   that only declare the category.
3. **The agent calls shops** — parallel calls with live transcripts; asks stock, today's price, installment,
   warranty, holding the item, plus your own question. Closed / no-answer / out-of-stock shops are replaced by the
   nearest alternative automatically; closed shops can be called when they open. A **seller panel** lets a real
   shop answer live. Every answer updates prices for everyone (listed → confirmed).
4. **Go & follow up** — recommendation with confirmed price, hold time, “leave by” time, traffic-zone tip,
   Neshan / Balad / Google navigation, checklist; re-check before leaving; tracking; report what you paid.

Also: in-store **Price X-ray** (shelf photo → green/yellow/red vs Tehran prices), price verdict + negotiation line,
photo identify, shopping list, voice input, Persian product chat grounded in the data.

**Data honesty:** a listed price, when it changed, and confirmed stock are always shown separately; unknown hours,
payment channel or stock are labelled as unknown. Shop names/phones in the dataset are synthetic, so the shop side
of calls is simulated *from the data* (hours, price age, category-only shops) unless a seller answers from the panel.

## Run locally

Requires Node 22+ and the challenge CSVs.

```bash
npm install
# put shops.csv, products.csv, offers.csv in ./dataset
npm run catalog        # builds catalog/catalog.db (SQLite + FTS5), ~3 min
npm run dev            # http://localhost:3000 — no AI keys needed
```

Optional LLM (any OpenAI-compatible endpoint): copy `.env.example` to `.env.local`, set `MOCK_LLM=false` and `LLM_*`.

## Quality gates

```bash
npm run check          # eslint + tsc + vitest + next build
```

## Deploy

Docker (Next.js standalone + packed catalog) on Liara: see [docs/deploy.md](docs/deploy.md).
Demo video script: [docs/demo-video.md](docs/demo-video.md).
