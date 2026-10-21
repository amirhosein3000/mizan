// The agent's "mission": find where to buy one product. It calls a few shops in
// parallel, replaces shops that are closed / don't answer / are out of stock with
// the nearest good alternative, records what it learns as confirmations, and
// recommends where to go. State advances lazily on read (no background workers),
// so it is robust on a single small server.
import "server-only";
import { getCatalog, type Product, type Shop } from "../catalog";
import { getSqlite } from "../db";
import { formatNumber, formatTomanShort } from "../format";
import { DEFAULT_CONTEXT, type ShopperContext } from "../shop/context";
import { distanceM } from "../shop/geo";
import { hhmm, openStatus } from "../shop/hours";
import { rankShops, whyLine, type RankedShop } from "../shop/rank";
import { ASK_LABEL, shortTitle, simulateCall, type Ask, type CallResult, type ScriptLine } from "./call-sim";
import { answerShopQuestion } from "../ai/shop-answer";
import { confirmationsFor, recordConfirmation } from "./confirmations";
import { shopsForProduct } from "./shops-service";

export const PARALLEL_CALLS = 3;
const GOAL_POSITIVE = 2;
const MAX_CALLS = 7;
export const SELLER_TIMEOUT_MS = 75_000;
export const SELLER_PRESENCE_MS = 30_000;

export type MissionStatus = "calling" | "ready" | "no_luck" | "visiting" | "bought" | "cancelled";
export type CallState = "scheduled" | "dialing" | "talking" | "waiting_seller" | "done";

interface MissionRow {
  id: string;
  device_id: string;
  product_id: string;
  product_title: string;
  context: string;
  asks: string;
  question: string | null;
  question_answer: string | null;
  reserve: string;
  status: MissionStatus;
  chosen_shop_id: string | null;
  created_at: number;
  updated_at: number;
}

interface CallRow {
  id: string;
  mission_id: string;
  shop_id: string;
  product_id: string;
  channel: "sim" | "seller";
  reason: string | null;
  replaces: string | null;
  started_at: number;
  ends_at: number | null;
  script: string | null;
  result: string | null;
  recorded: number;
}

interface Reserve {
  queue: string[];
  skipped: { shopId: string; label: string }[];
}

export interface CallView {
  id: string;
  shop: Shop;
  channel: "sim" | "seller";
  reason: string | null;
  replaces: string | null;
  startedAt: number;
  state: CallState;
  lines: ScriptLine[];
  result: CallResult | null;
}

export interface MissionView {
  id: string;
  product: Product | null;
  productTitle: string;
  context: ShopperContext;
  asks: Ask[];
  question: string | null;
  status: MissionStatus;
  chosenShopId: string | null;
  createdAt: number;
  updatedAt: number;
  calls: CallView[];
  /** Ranked view of every shop the agent called (distance, hours, price, reasons). */
  shops: RankedShop[];
  best: RankedShop | null;
  skipped: { shop: Shop; label: string }[];
  narration: string;
  queueLeft: number;
}

const db = () => getSqlite();

const DAY = 86_400_000;
const DEMO_TAG = "اجرای نمایشی";
const TEHRAN_OFFSET = 3.5 * 3600_000;

/** Next opening time of a closed shop (epoch ms, a few minutes after it opens), or null. */
function nextOpenTs(shop: Shop, now: number): number | null {
  const st = openStatus(shop.hours, now);
  if (st.state !== "closed" || !st.opensAt) return null;
  const midnight = Math.floor((now + TEHRAN_OFFSET) / DAY) * DAY - TEHRAN_OFFSET;
  return midnight + st.opensAt.dayOffset * DAY + (st.opensAt.minute + 5) * 60_000;
}

function isSellerOnline(shopId: string, now: number): boolean {
  const r = db().prepare(`SELECT last_seen FROM seller_presence WHERE shop_id = ?`).get(shopId) as { last_seen: number } | undefined;
  return !!r && now - r.last_seen < SELLER_PRESENCE_MS;
}

/**
 * Start (or schedule) a call. `now` is when it shows up in the timeline; `simAt` is the
 * moment the shopkeeper is simulated at (differs only for demo runs of scheduled calls).
 */
function startCall(m: MissionRow, shopId: string, now: number, reason: string | null, replaces: string | null = null, simAt = now): void {
  const catalog = getCatalog();
  const shop = catalog.getShop(shopId);
  const product = catalog.getProducts([m.product_id])[0];
  if (!shop || !product) return;
  const offer = catalog.offersFor(m.product_id).find((o) => o.shop.id === shopId)?.offer ?? null;
  const ctx = JSON.parse(m.context) as ShopperContext;
  const id = crypto.randomUUID();
  if (now <= Date.now() + 1000 && isSellerOnline(shopId, now)) {
    db()
      .prepare(`INSERT INTO calls (id, mission_id, shop_id, product_id, channel, reason, replaces, started_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, m.id, shopId, m.product_id, "seller", reason, replaces, now);
    return;
  }
  const script = simulateCall({
    shop,
    product: { id: product.id, title: product.title, price: product.price },
    offer,
    asks: JSON.parse(m.asks) as Ask[],
    question: m.question,
    questionAnswer: m.question_answer,
    at: simAt,
    visitAt: ctx.visitAt,
  });
  db()
    .prepare(
      `INSERT INTO calls (id, mission_id, shop_id, product_id, channel, reason, replaces, started_at, ends_at, script, result)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(id, m.id, shopId, m.product_id, "sim", reason, replaces, now, now + script.durationMs, JSON.stringify(script.lines), JSON.stringify(script.result));
}

export interface NewMission {
  productId: string;
  context: ShopperContext;
  asks: Ask[];
  question?: string | null;
  /** Shops the shopper picked; empty = let the agent pick. */
  shopIds?: string[];
}

export type CreateResult = { id: string } | { error: "not_found" | "nothing_to_call" };

export async function createMission(deviceId: string, input: NewMission, now = Date.now()): Promise<CreateResult> {
  const catalog = getCatalog();
  const product = catalog.getProduct(input.productId);
  if (!product) return { error: "not_found" };
  const { ranked, maybe } = shopsForProduct(product.id, product.category, input.context, now);
  const candidates = [...ranked.shops, ...maybe];
  const callable: RankedShop[] = [];
  const skipped: Reserve["skipped"] = [];
  for (const c of candidates) {
    const st = openStatus(c.shop.hours, now);
    // A seller who is online in the panel can answer even outside registered hours.
    if (st.state === "closed" && !isSellerOnline(c.shop.id, now)) skipped.push({ shopId: c.shop.id, label: st.label });
    else callable.push(c);
  }
  // Everything closed right now (evening, Friday…): schedule the calls for opening time.
  const scheduleFor = new Map<string, number>();
  if (!input.shopIds?.length && !callable.length) {
    for (const c of candidates) {
      const at = nextOpenTs(c.shop, now);
      if (at && scheduleFor.size < PARALLEL_CALLS) scheduleFor.set(c.shop.id, at);
    }
  }
  // Shops picked by hand are honoured even if they fail a list filter or sit outside the
  // shortlist: the shopper chose them on purpose.
  const picked = input.shopIds?.length
    ? [...new Set(input.shopIds)].filter((id) => !!catalog.getShop(id))
    : scheduleFor.size
      ? [...scheduleFor.keys()]
      : callable.slice(0, PARALLEL_CALLS).map((c) => c.shop.id);
  const reserve: Reserve = {
    queue: callable.map((c) => c.shop.id).filter((id) => !picked.includes(id)).slice(0, 14),
    skipped: input.shopIds?.length || scheduleFor.size ? [] : skipped.filter((s) => candidates.findIndex((c) => c.shop.id === s.shopId) < 6).slice(0, 4),
  };
  if (!picked.length) return { error: "nothing_to_call" };
  const question = input.question?.trim() || null;
  const questionAnswer = question ? await answerShopQuestion(product, question) : null;
  const id = crypto.randomUUID();
  const row: MissionRow = {
    id,
    device_id: deviceId,
    product_id: product.id,
    product_title: product.title,
    context: JSON.stringify(input.context),
    asks: JSON.stringify(input.asks),
    question,
    question_answer: questionAnswer,
    reserve: JSON.stringify(reserve),
    status: "calling",
    chosen_shop_id: null,
    created_at: now,
    updated_at: now,
  };
  db()
    .prepare(
      `INSERT INTO missions (id, device_id, product_id, product_title, context, asks, question, question_answer, reserve, status, chosen_shop_id, created_at, updated_at)
       VALUES (@id,@device_id,@product_id,@product_title,@context,@asks,@question,@question_answer,@reserve,@status,@chosen_shop_id,@created_at,@updated_at)`,
    )
    .run(row);
  for (const shopId of picked) {
    const c = candidates.find((x) => x.shop.id === shopId);
    const shop = c?.shop ?? catalog.getShop(shopId)!;
    const reason = input.shopIds?.length ? "انتخاب خودت" : c ? whyLine(c) || "گزینه‌ی خوب" : null;
    // A shop picked by hand that is closed now is also called when it opens.
    const closedNow = openStatus(shop.hours, now).state === "closed" && !isSellerOnline(shopId, now);
    const at = scheduleFor.get(shopId) ?? (closedNow ? nextOpenTs(shop, now) : null) ?? now;
    startCall(row, shopId, at, reason);
  }
  return { id };
}

function callDone(c: CallRow, now: number): boolean {
  return c.channel === "sim" ? now >= (c.ends_at ?? 0) : c.result !== null;
}

function failed(c: CallRow): boolean {
  const r = c.result ? (JSON.parse(c.result) as CallResult) : null;
  return !r || r.outcome !== "answered" || r.available === false;
}

/** Record finished calls, time out silent sellers, launch replacements, update status. */
function advance(m: MissionRow, now: number): void {
  const calls = db().prepare(`SELECT * FROM calls WHERE mission_id = ? ORDER BY started_at`).all(m.id) as CallRow[];
  for (const c of calls) {
    if (c.channel === "seller" && !c.result && now - c.started_at > SELLER_TIMEOUT_MS) {
      const r: CallResult = {
        outcome: "no_answer",
        available: null,
        price: null,
        priceChange: null,
        installment: null,
        warranty: null,
        holdUntil: null,
        closesAt: null,
        restockDays: null,
        summary: "فروشنده جواب نداد",
      };
      c.result = JSON.stringify(r);
      c.ends_at = now;
      db().prepare(`UPDATE calls SET result = ?, ends_at = ?, recorded = 1 WHERE id = ?`).run(c.result, now, c.id);
      c.recorded = 1;
    }
    if (!c.recorded && callDone(c, now) && c.result) {
      const r = JSON.parse(c.result) as CallResult;
      if (r.outcome === "answered") {
        recordConfirmation({
          shopId: c.shop_id,
          productId: c.product_id,
          available: r.available,
          price: r.price,
          holdUntil: r.holdUntil,
          source: c.channel === "seller" ? "seller" : "call",
          note: r.summary,
          at: c.ends_at ?? now,
          callId: c.id,
        });
      }
      db().prepare(`UPDATE calls SET recorded = 1 WHERE id = ?`).run(c.id);
      c.recorded = 1;
    }
  }

  // Replacements: one per failed call, while we still lack positive answers.
  const reserve = JSON.parse(m.reserve) as Reserve;
  const catalog = getCatalog();
  const positives = calls.filter((c) => callDone(c, now) && !failed(c)).length;
  let total = calls.length;
  let changed = false;
  for (const c of calls) {
    if (positives >= GOAL_POSITIVE || total >= MAX_CALLS || !reserve.queue.length) break;
    if (!callDone(c, now) || !failed(c)) continue;
    if (calls.some((x) => x.replaces === c.id)) continue;
    const failedShop = catalog.getShop(c.shop_id);
    // Prefer the closest shop among the next few good candidates: same passage when possible.
    const window = reserve.queue.slice(0, 6).map((id) => catalog.getShop(id)).filter((s): s is Shop => !!s);
    const pick = failedShop ? window.sort((a, b) => distanceM(failedShop, a) - distanceM(failedShop, b))[0] : window[0];
    if (!pick) continue;
    reserve.queue = reserve.queue.filter((id) => id !== pick.id);
    const r = c.result ? (JSON.parse(c.result) as CallResult) : null;
    const why = r?.outcome === "closed" ? "بسته بود" : r?.outcome === "answered" ? "موجود نداشت" : "جواب نداد";
    const near = failedShop && distanceM(failedShop, pick) < 120 ? "هم‌پاساژ و نزدیک" : "گزینه‌ی بعدی";
    // Closed now -> call when it opens; in a demo run, play that opening-time call right away.
    const demo = !!c.reason?.includes(DEMO_TAG);
    const opensAt = openStatus(pick.hours, now).state === "closed" ? nextOpenTs(pick, now) : null;
    const label = `جایگزین «${failedShop?.name ?? "فروشگاه"}» که ${why}، ${near}${demo ? `، ${DEMO_TAG}` : ""}`;
    startCall(m, pick.id, demo ? now : opensAt ?? now, label, c.id, opensAt ?? now);
    total++;
    changed = true;
  }
  if (changed) db().prepare(`UPDATE missions SET reserve = ? WHERE id = ?`).run(JSON.stringify(reserve), m.id);

  const fresh = db().prepare(`SELECT * FROM calls WHERE mission_id = ?`).all(m.id) as CallRow[];
  const pending = fresh.some((c) => !callDone(c, now));
  const anyPositive = fresh.some((c) => callDone(c, now) && !failed(c));
  if (m.status === "calling" || m.status === "ready" || m.status === "no_luck") {
    const status: MissionStatus = pending ? "calling" : anyPositive ? "ready" : "no_luck";
    if (status !== m.status) {
      db().prepare(`UPDATE missions SET status = ?, updated_at = ? WHERE id = ?`).run(status, now, m.id);
      m.status = status;
      m.updated_at = now;
    }
  }
}

function sellerLines(c: CallRow, m: MissionRow, productTitle: string): ScriptLine[] {
  const asks = JSON.parse(m.asks) as Ask[];
  const lines: ScriptLine[] = [
    { t: 0, who: "system", text: "پیام به پنل فروشنده فرستاده شد؛ منتظر جواب…" },
    { t: 400, who: "agent", text: `سلام، «${shortTitle(productTitle)}» موجود دارید؟` },
  ];
  const extra = asks.filter((a) => a !== "stock").map((a) => ASK_LABEL[a]);
  if (extra.length) lines.push({ t: 800, who: "agent", text: `لطفاً ${extra.join("، ")} رو هم بگید.` });
  if (m.question) lines.push({ t: 1200, who: "agent", text: m.question });
  if (c.result) {
    const r = JSON.parse(c.result) as CallResult;
    const t = (c.ends_at ?? c.started_at) - c.started_at;
    if (r.outcome === "answered") {
      lines.push({ t, who: "shop", text: r.available ? `بله موجوده${r.price ? `؛ ${formatTomanShort(r.price)} تومن` : ""}.` : "نه، فعلاً نداریم." });
      if (r.holdUntil) lines.push({ t: t + 1, who: "shop", text: "براتون نگه می‌دارم." });
    } else {
      lines.push({ t, who: "system", text: r.summary });
    }
  }
  return lines;
}

function narrate(v: Omit<MissionView, "narration">): string {
  const done = v.calls.filter((c) => c.state === "done");
  const pending = v.calls.length - done.length;
  const scheduled = v.calls.filter((c) => c.state === "scheduled");
  if (v.status === "calling" && scheduled.length === pending) {
    const first = Math.min(...scheduled.map((c) => c.startedAt));
    const min = Math.floor((first + TEHRAN_OFFSET) / 60_000) % 1440;
    const day = Math.floor((first + TEHRAN_OFFSET) / DAY) - Math.floor((Date.now() + TEHRAN_OFFSET) / DAY);
    return `این فروشگاه‌ها الان بسته‌ان. ${day <= 0 ? "امروز" : day === 1 ? "فردا" : "روزهای بعد"} ساعت ${hhmm(min)} که باز شدن خودم زنگ می‌زنم و نتیجه رو همین‌جا می‌ذارم.`;
  }
  if (v.status === "calling") {
    const replaced = v.calls.filter((c) => c.replaces).length;
    return `دارم به ${formatNumber(pending)} فروشگاه زنگ می‌زنم${replaced ? `؛ ${formatNumber(replaced)} تا جایگزین هم پیدا کردم` : ""}…`;
  }
  if (v.best && v.status === "bought") return "خرید مبارک! این پیگیری تموم شد؛ قیمتی که گزارش دادی به بقیه‌ی خریدارها هم کمک می‌کنه.";
  if (v.best && v.status === "visiting") {
    const b = v.best;
    const where = [b.shop.mall, b.shop.floor ? `طبقه ${b.shop.floor}` : null, b.shop.unit].filter(Boolean).join("، ");
    return `در راهی سمت «${b.shop.name}»${where ? `، ${where}` : ""}. رسیدی، قبل از پرداخت چک‌لیست رو ببین.`;
  }
  if (v.best) {
    const b = v.best;
    const conf = b.confirmation;
    const bits = [
      `پیشنهادم «${b.shop.name}»ه`,
      conf?.price ? `قیمت تأییدشده ${formatTomanShort(conf.price)} تومن` : null,
      b.travel ? b.travel.label : null,
      b.status.state === "open" && b.status.closesAt ? `تا ${hhmm(b.status.closesAt)} بازه` : null,
      conf?.holdUntil ? "برات نگه می‌داره" : null,
    ].filter(Boolean);
    return `${bits.join("؛ ")}.`;
  }
  if (v.status === "no_luck") {
    const restock = v.calls.map((c) => c.result?.restockDays).filter((d): d is number => !!d);
    return restock.length
      ? `هیچ‌کدوم الان موجود نداشتن؛ یکی گفت ${Math.min(...restock) <= 3 ? "چند روز دیگه" : "هفته‌ی بعد"} میاد. می‌تونم پیگیری کنم یا جایگزین پیدا کنم.`
      : "هیچ‌کدوم موجود نداشتن یا جواب ندادن. جایگزین‌های مشابه رو ببین یا بگو به فروشگاه‌های بیشتری زنگ بزنم.";
  }
  return "";
}

export function getMission(id: string, deviceId: string | null, now = Date.now()): MissionView | null {
  const m = db().prepare(`SELECT * FROM missions WHERE id = ?`).get(id) as MissionRow | undefined;
  if (!m || (deviceId && m.device_id !== deviceId)) return null;
  advance(m, now);
  const catalog = getCatalog();
  const product = catalog.getProducts([m.product_id])[0] ?? null;
  const ctx = JSON.parse(m.context) as ShopperContext;
  const rows = db().prepare(`SELECT * FROM calls WHERE mission_id = ? ORDER BY started_at`).all(m.id) as CallRow[];

  const calls: CallView[] = rows.flatMap((c): CallView[] => {
    const shop = catalog.getShop(c.shop_id);
    if (!shop) return [];
    const elapsed = now - c.started_at;
    if (c.channel === "seller") {
      return [
        {
          id: c.id,
          shop,
          channel: c.channel,
          reason: c.reason,
          replaces: c.replaces,
          startedAt: c.started_at,
          state: c.result ? "done" : "waiting_seller",
          lines: sellerLines(c, m, m.product_title),
          result: c.result ? (JSON.parse(c.result) as CallResult) : null,
        } satisfies CallView,
      ];
    }
    const all = JSON.parse(c.script ?? "[]") as ScriptLine[];
    const done = now >= (c.ends_at ?? 0);
    const firstVoice = all.find((l) => l.who !== "system")?.t ?? Infinity;
    if (elapsed < 0) {
      return [
        { id: c.id, shop, channel: c.channel, reason: c.reason, replaces: c.replaces, startedAt: c.started_at, state: "scheduled", lines: [], result: null },
      ];
    }
    return [
      {
        id: c.id,
        shop,
        channel: c.channel,
        reason: c.reason,
        replaces: c.replaces,
        startedAt: c.started_at,
        state: done ? "done" : elapsed < firstVoice ? "dialing" : "talking",
        lines: done ? all : all.filter((l) => l.t <= elapsed),
        result: done && c.result ? (JSON.parse(c.result) as CallResult) : null,
      } satisfies CallView,
    ];
  });

  // Rank exactly the shops that were called, with what we now know. Only origin and visit time
  // matter here: a shop that confirmed stock must never vanish because of a list filter.
  const calledShops = [...new Map(calls.map((c) => [c.shop.id, c.shop])).values()];
  const offers = new Map(catalog.offersFor(m.product_id).map((o) => [o.shop.id, o.offer]));
  const conf = confirmationsFor(m.product_id, now);
  const shops = rankShops(
    calledShops.map((shop) => ({ shop, offer: offers.get(shop.id) ?? null, confirmation: conf.get(shop.id) ?? null })),
    { ...DEFAULT_CONTEXT, origin: ctx.origin, visitAt: ctx.visitAt },
    now,
  ).shops;
  const positiveIds = new Set(calls.filter((c) => c.state === "done" && c.result?.available).map((c) => c.shop.id));
  const best =
    (m.chosen_shop_id ? shops.find((s) => s.shop.id === m.chosen_shop_id) : null) ??
    shops.filter((s) => positiveIds.has(s.shop.id)).sort((a, b) => b.score - a.score)[0] ??
    null;
  const reserve = JSON.parse(m.reserve) as Reserve;
  const skipped = reserve.skipped.flatMap((s) => {
    const shop = catalog.getShop(s.shopId);
    return shop ? [{ shop, label: s.label }] : [];
  });

  const view: Omit<MissionView, "narration"> = {
    id: m.id,
    product,
    productTitle: m.product_title,
    context: ctx,
    asks: JSON.parse(m.asks) as Ask[],
    question: m.question,
    status: m.status,
    chosenShopId: m.chosen_shop_id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    calls,
    shops,
    best: m.status === "calling" ? null : best,
    skipped,
    queueLeft: reserve.queue.length,
  };
  return { ...view, narration: narrate(view) };
}

export interface MissionSummary {
  id: string;
  productId: string;
  productTitle: string;
  image: string | null;
  status: MissionStatus;
  narration: string;
  bestShop: { id: string; name: string; price: number | null; holdUntil: number | null } | null;
  positives: number;
  calls: number;
  updatedAt: number;
}

export function listMissions(deviceId: string, now = Date.now()): MissionSummary[] {
  const rows = db()
    .prepare(`SELECT id FROM missions WHERE device_id = ? ORDER BY updated_at DESC LIMIT 30`)
    .all(deviceId) as { id: string }[];
  return rows.flatMap(({ id }) => {
    const v = getMission(id, deviceId, now);
    if (!v) return [];
    return [
      {
        id: v.id,
        productId: v.product?.id ?? "",
        productTitle: v.productTitle,
        image: v.product?.images[0] ?? null,
        status: v.status,
        narration: v.narration,
        bestShop: v.best
          ? { id: v.best.shop.id, name: v.best.shop.name, price: v.best.price, holdUntil: v.best.confirmation?.holdUntil ?? null }
          : null,
        positives: v.calls.filter((c) => c.result?.available).length,
        calls: v.calls.length,
        updatedAt: v.updatedAt,
      },
    ];
  });
}

export type MissionAction =
  | { action: "choose"; shopId: string }
  | { action: "status"; status: Extract<MissionStatus, "visiting" | "bought" | "cancelled" | "ready"> }
  | { action: "recheck" }
  | { action: "more" }
  /** Demo: run calls scheduled for opening time right now (scripts stay as simulated for opening time). */
  | { action: "runNow" }
  /** Follow-up: call the shops that were closed, when they open. */
  | { action: "later" };

export function updateMission(id: string, deviceId: string, a: MissionAction, now = Date.now()): boolean {
  const m = db().prepare(`SELECT * FROM missions WHERE id = ? AND device_id = ?`).get(id, deviceId) as MissionRow | undefined;
  if (!m) return false;
  if (a.action === "choose") {
    db().prepare(`UPDATE missions SET chosen_shop_id = ?, updated_at = ? WHERE id = ?`).run(a.shopId, now, id);
  } else if (a.action === "status") {
    db().prepare(`UPDATE missions SET status = ?, updated_at = ? WHERE id = ?`).run(a.status, now, id);
  } else if (a.action === "recheck") {
    // Call the chosen (or best) shop again right before leaving.
    const target = m.chosen_shop_id ?? getMission(id, deviceId, now)?.best?.shop.id;
    if (!target) return false;
    db().prepare(`UPDATE missions SET status = 'calling', updated_at = ? WHERE id = ?`).run(now, id);
    startCall({ ...m, status: "calling" }, target, now, "استعلام دوباره قبل از رفتن");
  } else if (a.action === "later") {
    const reserve = JSON.parse(m.reserve) as Reserve;
    const catalog = getCatalog();
    const next = reserve.skipped.splice(0, PARALLEL_CALLS);
    if (!next.length) return false;
    db().prepare(`UPDATE missions SET reserve = ?, status = 'calling', updated_at = ? WHERE id = ?`).run(JSON.stringify(reserve), now, id);
    for (const { shopId } of next) {
      const shop = catalog.getShop(shopId);
      const at = shop ? nextOpenTs(shop, now) ?? now : now;
      startCall({ ...m, status: "calling" }, shopId, at, "پیگیری: وقتی باز شد زنگ می‌زنم");
    }
  } else if (a.action === "runNow") {
    const rows = db().prepare(`SELECT id, started_at, ends_at FROM calls WHERE mission_id = ? AND started_at > ?`).all(id, now) as {
      id: string;
      started_at: number;
      ends_at: number | null;
    }[];
    if (!rows.length) return false;
    const upd = db().prepare(`UPDATE calls SET started_at = ?, ends_at = ?, reason = COALESCE(reason, '') || '، ${DEMO_TAG}' WHERE id = ?`);
    rows.forEach((r, i) => upd.run(now + i * 400, now + i * 400 + ((r.ends_at ?? r.started_at) - r.started_at), r.id));
    db().prepare(`UPDATE missions SET updated_at = ? WHERE id = ?`).run(now, id);
  } else if (a.action === "more") {
    const reserve = JSON.parse(m.reserve) as Reserve;
    const next = reserve.queue.splice(0, 2);
    if (!next.length) return false;
    db().prepare(`UPDATE missions SET reserve = ?, status = 'calling', updated_at = ? WHERE id = ?`).run(JSON.stringify(reserve), now, id);
    for (const shopId of next) startCall({ ...m, status: "calling" }, shopId, now, "به درخواست خودت: فروشگاه‌های بیشتر");
  }
  return true;
}
