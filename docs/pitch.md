# Pitch outline (draft v0 — rewrite after the spec; final Persian version is prompt 6)

## 1. Problem
In Iran, prices change weekly and the same phone can differ by millions of Toman between two shops on the
same street. Online, shoppers have Torob to compare. **Inside a store, they are alone**: no quick way to know
whether the price in front of them is fair, whether the item is genuine/registered, or how to negotiate.

## 2. User
- Primary: a shopper standing in a mobile shop, appliance store, supermarket or bazaar, phone in hand, 30 seconds of attention.
- Secondary: the store owner who wants to know how their prices compare to the online market.

## 3. Product — Tarazoo (ترازو)
A friendly Persian shopping buddy in your pocket (installable PWA):
1. **Identify** the product: photo, barcode or name.
2. **See the online price picture**: cheapest / typical / most expensive across sellers.
3. **Verdict on the store price**: green / yellow / red, by how much, and why.
4. **Act**: a one-tap negotiation line to show the seller, a pre-purchase checklist (registry, warranty,
   printed consumer price), cheaper alternatives, and a chat for anything else.
5. **Remember**: history, saved items, and a shareable «امروز X تومان صرفه‌جویی کردی» card.

## 4. Demo flow (90 s)
1. (0–25s) Hero — **Price X-ray**: point the phone at a shelf → each product lights up green/yellow/red.
   "Two good deals, one overpriced by 4 million."
2. (25–50s) Tap the red one → full verdict → «نشون دادن به فروشنده» — the negotiation line in big type.
3. (50–70s) "I bought it" → savings card «امروز ۴٫۹ میلیون تومان صرفه‌جویی کردی» → share.
4. (70–90s) Quick: barcode scan of a grocery item → "above printed price" warning; ask the chat "what should I check?".

## 5. Why it matters for Torob
- **Offline-to-online bridge**: Torob's price data becomes useful in the 80%+ of purchases that still happen in physical stores.
- **Trust**: every in-store check is a moment where Torob's prices are the reference.
- **New data**: crowd-sourced in-store prices (with consent) — a dataset no online-only player has.
- **Engagement**: shareable savings cards are organic marketing.

## 6. Business / next steps
- Real Torob data via API (adapter already in place); live shelf recognition on-device.
- Store-side dashboard: "your prices vs. the market" for sellers (B2B).
- Price alerts, shopping lists with budgets, receipt reader.

## 7. Team
- <names, roles>

Built for the Torob hackathon. Demo prices are mock data.
