"use client";
// Steps 3 & 4 — the agent calls shops (live), replaces dead ends, then recommends
// where to go with the exact address, a visit plan and follow-up actions.
import Link from "next/link";
import { use, useState } from "react";
import {
  Ban,
  Check,
  ChevronDown,
  CircleSlash,
  Clock,
  Navigation,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MISSION_STATUS } from "@/components/MissionRow";
import { ProductRow } from "@/components/ProductRow";
import { AddressLine, CallSelfButton, hhmmFromTs, MapButtons, OpenPill, StockLine, TrafficHint, TravelLine } from "@/components/shop";
import { Button, Card, ErrorNote, Pill, SectionTitle, Skeleton, type Tone } from "@/components/ui";
import type { CallView, MissionAction, MissionView } from "@/lib/agent/missions";
import { api, errorMessage } from "@/lib/client-api";
import { formatNumber, formatToman, formatTomanShort, parsePrice } from "@/lib/format";
import type { RankedShop } from "@/lib/shop/rank";
import { usePoll } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { CHECKLISTS } from "@/lib/verdict";

/** Keep polling while a call is in progress (calls scheduled for opening time don't need polling). */
const isLive = (d: { mission: MissionView }) => {
  const calls = d.mission.calls;
  if (calls.some((c) => c.state !== "done" && c.state !== "scheduled")) return true;
  return d.mission.status === "calling" && !calls.some((c) => c.state === "scheduled");
};

export function MissionScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, setData, refresh } = usePoll<{ mission: MissionView; now: number }>(`/api/missions/${id}`, 1100, isLive);
  const m = data?.mission;
  const live = !!m && isLive({ mission: m });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(a: MissionAction): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await api<{ mission: MissionView }>(`/api/missions/${id}`, { method: "PATCH", body: a });
      setData({ mission: res.mission, now: res.mission.updatedAt });
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !m) {
    return (
      <>
        <AppHeader title="تماس‌های میزان" back />
        <div className="p-4">
          <ErrorNote message={error} />
        </div>
      </>
    );
  }
  if (!m) {
    return (
      <>
        <AppHeader title="تماس‌های میزان" back />
        <div className="space-y-3 p-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </>
    );
  }

  const st = MISSION_STATUS[m.status];
  const positives = m.calls.filter((c) => c.result?.available);
  const others = m.shops.filter((s) => s.confirmation?.available && s.shop.id !== m.best?.shop.id);
  const answered = m.calls.filter((c) => c.result?.outcome === "answered").length;
  const scheduled = m.calls.some((c) => c.state === "scheduled");

  return (
    <>
      <AppHeader title="تماس‌های میزان" back action={<Pill tone={st.tone}>{st.label}</Pill>} />
      <main className="space-y-3 px-4 pb-10">
        {m.product && <ProductRow product={m.product} href={`/p/${encodeURIComponent(m.product.id)}`} />}

        {/* Agent narration */}
        <div className="flex items-start gap-2.5">
          <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white ${live ? "ring-pulse" : ""}`}>
            <Sparkles className="size-5" />
          </span>
          <div className="rise min-w-0 flex-1 rounded-2xl rounded-tr-md bg-surface px-3.5 py-2.5 text-[14px] leading-7 shadow-[0_1px_2px_rgba(20,10,60,0.06)]">
            {m.narration}
            {live && (
              <span className="dots ms-1 inline-flex gap-0.5 align-middle text-brand">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </span>
            )}
            <div className="mt-1 text-[11.5px] text-muted">
              {formatNumber(m.calls.length)} تماس، {formatNumber(answered)} جواب داد، {formatNumber(positives.length)} موجود
            </div>
            {scheduled && (
              <button
                onClick={() => act({ action: "runNow" })}
                disabled={busy}
                className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-soft text-[13px] font-bold text-brand"
              >
                <PhoneCall className="size-4" /> همین الان امتحان کن (اجرای نمایشی)
              </button>
            )}
          </div>
        </div>

        {/* Recommendation */}
        {m.best && <BestCard m={m} best={m.best} busy={busy} act={act} />}

        {m.status === "no_luck" && (
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-[15px] font-extrabold">
              <CircleSlash className="size-5 text-high" /> این بار پیدا نشد
            </div>
            <div className="flex flex-col gap-2">
              {m.queueLeft > 0 && (
                <Button onClick={() => act({ action: "more" })} disabled={busy}>
                  <PhoneCall className="size-5" /> به ۲ فروشگاه دیگه هم زنگ بزن
                </Button>
              )}
              {m.skipped.length > 0 && (
                <Button variant={m.queueLeft > 0 ? "secondary" : "primary"} onClick={() => act({ action: "later" })} disabled={busy}>
                  <Clock className="size-5" /> وقتی باز شدن به {formatNumber(Math.min(3, m.skipped.length))} فروشگاه بسته زنگ بزن
                </Button>
              )}
              {m.product && (
                <Link
                  href={`/p/${encodeURIComponent(m.product.id)}`}
                  className="flex h-12 items-center justify-center rounded-2xl border border-line bg-surface text-[15px] font-bold"
                >
                  جایگزین‌های هم‌رده رو ببین
                </Link>
              )}
            </div>
          </Card>
        )}
        {actionError && <ErrorNote message={actionError} />}

        {/* Calls */}
        <SectionTitle>تماس‌ها</SectionTitle>
        <div className="flex flex-col gap-2">
          {m.calls.map((c) => (
            <CallCard key={c.id} c={c} shops={m.shops} replacedName={c.replaces ? m.calls.find((x) => x.id === c.replaces)?.shop.name : undefined} />
          ))}
        </div>

        {m.skipped.length > 0 && (
          <div className="rounded-2xl bg-surface-2 px-3 py-2.5 text-[12px] leading-6 text-muted">
            <b className="text-ink">زنگ نزدم چون الان بسته‌ان:</b>{" "}
            {m.skipped.map((s) => `${s.shop.name} (${s.label.replace("بسته؛ ", "")})`).join("، ")}
          </div>
        )}

        {others.length > 0 && (
          <>
            <SectionTitle>گزینه‌های تأییدشده‌ی دیگه</SectionTitle>
            <div className="flex flex-col gap-2">
              {others.map((s) => (
                <div key={s.shop.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{s.shop.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] text-muted">
                      {s.price ? <span className="font-bold text-good">{formatTomanShort(s.price)}</span> : null}
                      <TravelLine x={s} />
                    </div>
                  </div>
                  <button
                    onClick={() => act({ action: "choose", shopId: s.shop.id })}
                    disabled={busy}
                    className="rounded-xl bg-brand-soft px-3 py-2 text-[12.5px] font-bold text-brand"
                  >
                    این رو انتخاب کن
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!live && m.queueLeft > 0 && m.status !== "no_luck" && (
          <Button variant="secondary" className="w-full" onClick={() => act({ action: "more" })} disabled={busy}>
            <PhoneCall className="size-5" /> به فروشگاه‌های بیشتری زنگ بزن
          </Button>
        )}
      </main>
    </>
  );
}

const RESULT: Record<string, { label: string; tone: Tone; icon: typeof Check }> = {
  yes: { label: "موجوده", tone: "good", icon: Check },
  no: { label: "ناموجود", tone: "high", icon: Ban },
  no_answer: { label: "جواب نداد", tone: "muted", icon: PhoneOff },
  busy: { label: "اشغال", tone: "muted", icon: PhoneOff },
  closed: { label: "بسته بود", tone: "fair", icon: Store },
};

function scheduledLabel(ts: number): string {
  const day = Math.floor((ts + 3.5 * 3600_000) / 86_400_000) - Math.floor((Date.now() + 3.5 * 3600_000) / 86_400_000);
  return `${day <= 0 ? "امروز" : day === 1 ? "فردا" : "بعداً"} ${hhmmFromTs(ts)}`;
}

function CallCard({ c, shops, replacedName }: { c: CallView; shops: RankedShop[]; replacedName?: string }) {
  const done = c.state === "done";
  const [open, setOpen] = useState(false);
  const expanded = !done || open;
  const r = c.result;
  const key = !r ? null : r.outcome === "answered" ? (r.available ? "yes" : "no") : r.outcome;
  const res = key ? RESULT[key] : null;
  const ranked = shops.find((s) => s.shop.id === c.shop.id);
  const stateLabel =
    c.state === "scheduled"
      ? `${scheduledLabel(c.startedAt)} زنگ می‌زنم`
      : c.state === "dialing"
        ? "در حال شماره‌گیری…"
        : c.state === "talking"
          ? "در حال صحبت"
          : c.state === "waiting_seller"
            ? "پیام به پنل فروشنده؛ منتظر جواب"
            : "";

  return (
    <div className={`rise rounded-[var(--radius-card)] bg-surface p-3 ${r?.available ? "ring-2 ring-good/40" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${
            done ? (r?.available ? "bg-good-soft text-good" : "bg-surface-2 text-muted") : c.state === "scheduled" ? "bg-surface-2 text-brand" : "ring-pulse bg-brand text-white"
          }`}
        >
          {c.state === "scheduled" ? <Clock className="size-5" /> : c.channel === "seller" ? <UserRound className="size-5" /> : <PhoneCall className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/s/${encodeURIComponent(c.shop.id)}`} className="block truncate text-[14.5px] font-extrabold">
            {c.shop.name}
          </Link>
          <div className="truncate text-[11.5px] text-muted">
            {replacedName ? `جایگزین «${replacedName}»` : c.reason ?? ""}
          </div>
        </div>
        {res ? (
          <Pill tone={res.tone}>
            <res.icon className="size-3.5" /> {res.label}
          </Pill>
        ) : (
          <span className="flex items-center gap-2 text-[11.5px] font-bold text-brand">
            {c.state === "talking" && (
              <span className="wave flex items-center gap-0.5">
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            {stateLabel}
          </span>
        )}
      </div>

      {r?.outcome === "answered" && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
          {r.price ? (
            <span className="font-extrabold">
              {formatToman(r.price)}{" "}
              {r.priceChange === "up" && <span className="text-[11px] font-bold text-high">▲ گرون‌تر از ثبت‌شده</span>}
              {r.priceChange === "down" && <span className="text-[11px] font-bold text-good">▼ ارزون‌تر</span>}
              {r.priceChange === "same" && <span className="text-[11px] font-bold text-good">همون قیمت ثبت‌شده</span>}
            </span>
          ) : null}
          {r.holdUntil && <span className="font-bold text-good">نگه می‌داره تا {hhmmFromTs(r.holdUntil)}</span>}
          {r.installment === true && <span className="text-muted">قسطی داره</span>}
          {r.warranty && <span className="text-muted">{r.warranty}</span>}
          {r.restockDays && <span className="text-muted">موجود شدن: {r.restockDays <= 3 ? "چند روز دیگه" : "شاید هفته‌ی بعد"}</span>}
        </div>
      )}
      {ranked && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <TravelLine x={ranked} />
          <span className="text-[12px] text-muted">{[c.shop.mall, c.shop.floor ? `طبقه ${c.shop.floor}` : null].filter(Boolean).join("، ")}</span>
        </div>
      )}

      {done && c.lines.length > 0 && (
        <button onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-[12px] font-bold text-muted">
          متن تماس <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
      {expanded && c.lines.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 rounded-2xl bg-bg p-2.5">
          {c.lines.map((l, i) =>
            l.who === "system" ? (
              <div key={i} className="fade-in text-center text-[11.5px] text-muted">
                {l.text}
              </div>
            ) : (
              <div
                key={i}
                className={`fade-in max-w-[85%] rounded-2xl px-3 py-1.5 text-[13px] leading-6 ${
                  l.who === "agent" ? "self-start rounded-tr-md bg-brand-soft text-brand-ink" : "self-end rounded-tl-md bg-surface text-ink ring-1 ring-line"
                }`}
              >
                <span className="me-1 text-[10.5px] font-black opacity-60">{l.who === "agent" ? "میزان" : "فروشنده"}</span>
                {l.text}
              </div>
            ),
          )}
          {!done && c.state === "talking" && (
            <div className="dots self-end text-[12px] text-muted">
              <span>●</span>
              <span>●</span>
              <span>●</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BestCard({ m, best, busy, act }: { m: MissionView; best: RankedShop; busy: boolean; act: (a: MissionAction) => Promise<void> }) {
  const [checkOpen, setCheckOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const c = best.confirmation;
  const now = useNow();
  // Visit plan: arrive before the hold ends / the shop closes.
  const closesTs = best.status.state === "open" && best.status.closesIn ? now + best.status.closesIn * 60_000 : null;
  const deadline = [c?.holdUntil ?? null, closesTs].filter((x): x is number => !!x && x > now).sort((a, b) => a - b)[0] ?? null;
  const leaveBy = deadline && best.travel ? deadline - (best.travel.minutes + 10) * 60_000 : null;
  const chosen = m.chosenShopId === best.shop.id;

  return (
    <section className="rise overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-[0_6px_20px_-10px_rgba(17,153,74,0.5)] ring-2 ring-good/50">
      <div className="flex items-center gap-2 bg-good px-4 py-2.5 text-white">
        <Sparkles className="size-5" />
        <span className="text-[14px] font-extrabold">{chosen ? "انتخاب تو" : "پیشنهاد میزان"}</span>
        {m.status === "visiting" && <span className="ms-auto text-[12px] font-bold">در راهی 🚶</span>}
        {m.status === "bought" && <span className="ms-auto text-[12px] font-bold">خریدی 🎉</span>}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/s/${encodeURIComponent(best.shop.id)}`} className="block text-[17px] font-black">
              {best.shop.name}
            </Link>
            <div className="mt-1">
              <StockLine c={c} />
            </div>
          </div>
          <div className="text-end">
            <div className="tabular text-[20px] font-black text-good">{best.price ? formatTomanShort(best.price) : "—"}</div>
            <div className="text-[11px] text-muted">{best.priceSource === "confirmed" ? "قیمت تأییدشده" : "قیمت ثبت‌شده"}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-surface-2 p-3">
          <AddressLine shop={best.shop} full />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {best.status.state === "closed" && c?.available && now - c.at < 2 * 3600_000 ? (
              // Registered hours say closed, but the shop just answered: trust the fresher fact, show both.
              <Pill tone="good">همین الان جواب دادن (ساعت ثبت‌شده: بسته)</Pill>
            ) : (
              <OpenPill status={best.status} />
            )}
            <TravelLine x={best} />
          </div>
        </div>

        {leaveBy && (
          <div className="flex items-start gap-2 rounded-2xl bg-info-soft px-3 py-2.5 text-[13px] leading-6 text-info">
            <Clock className="mt-1 size-4 shrink-0" />
            <span>
              برای اینکه {c?.holdUntil && deadline === c.holdUntil ? "تا وقتی برات نگه داشتن" : "قبل از بسته شدن"} برسی، حداکثر تا{" "}
              <b>{hhmmFromTs(leaveBy)}</b> راه بیفت{best.travel ? ` (${best.travel.label})` : ""}.
            </span>
          </div>
        )}
        <TrafficHint shop={best.shop} />

        <MapButtons shop={best.shop} />
        <div className="flex gap-2">
          <CallSelfButton shop={best.shop} />
        </div>

        <div className="rounded-2xl bg-surface-2">
          <button className="flex w-full items-center justify-between px-3 py-2.5 text-[13.5px] font-bold" onClick={() => setCheckOpen((v) => !v)} aria-expanded={checkOpen}>
            قبل از پرداخت چک کن
            <ChevronDown className={`size-5 transition-transform ${checkOpen ? "rotate-180" : ""}`} />
          </button>
          {checkOpen && m.product && (
            <ul className="space-y-1.5 px-3 pb-3 text-[12.5px] leading-6">
              {CHECKLISTS[m.product.kind].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        {m.status === "visiting" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setReporting(true)} disabled={busy}>
              <ShoppingBag className="size-5" /> خریدم
            </Button>
            <Button variant="secondary" onClick={() => act({ action: "status", status: "ready" })} disabled={busy}>
              نشد
            </Button>
          </div>
        ) : m.status !== "bought" ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={async () => {
                if (!chosen) await act({ action: "choose", shopId: best.shop.id });
                await act({ action: "status", status: "visiting" });
              }}
              disabled={busy}
            >
              <Navigation className="size-5" /> دارم میرم
            </Button>
            <Button variant="secondary" onClick={() => act({ action: "recheck" })} disabled={busy || m.status === "calling"}>
              <RefreshCw className="size-5" /> دوباره بپرس
            </Button>
          </div>
        ) : null}
        <p className="text-[11.5px] leading-5 text-muted">«دوباره بپرس» درست قبل از راه افتادن دوباره زنگ می‌زنه تا موجودی و قیمت عوض نشده باشه.</p>
      </div>
      {reporting && (
        <ReportBought
          m={m}
          best={best}
          onDone={() => {
            setReporting(false);
            act({ action: "status", status: "bought" });
          }}
        />
      )}
    </section>
  );
}

/** After buying: what did you pay? Feeds confirmations so the next shopper sees a real price. */
function ReportBought({ m, best, onDone }: { m: MissionView; best: RankedShop; onDone: () => void }) {
  const [raw, setRaw] = useState(best.price ? String(best.price) : "");
  const [busy, setBusy] = useState(false);
  const price = parsePrice(raw);
  async function submit() {
    setBusy(true);
    if (m.product) {
      await api("/api/reports", { body: { shopId: best.shop.id, productId: m.product.id, available: true, price } }).catch(() => null);
    }
    onDone();
  }
  return (
    <div className="border-t border-line bg-good-soft p-4">
      <div className="text-[14px] font-extrabold">مبارکه! نهایتاً چند خریدی؟</div>
      <p className="mt-1 text-[12px] text-muted">با ثبتش، خریدار بعدی قیمت واقعی رو می‌بینه.</p>
      <div className="mt-2 flex gap-2">
        <input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          inputMode="numeric"
          className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-surface px-3 text-[15px] outline-none focus:border-brand"
          placeholder="مثلاً ۳٫۵ میلیون"
        />
        <Button className="h-11" onClick={submit} disabled={busy}>
          ثبت
        </Button>
      </div>
      {price ? <div className="mt-1 text-[12px] text-muted">{formatToman(price)}</div> : null}
      {best.price && price && price < best.price ? (
        <div className="mt-1 text-[12px] font-bold text-good">{formatToman(best.price - price)} کمتر از قیمت تأییدشده؛ چونه‌ت جواب داد!</div>
      ) : null}
    </div>
  );
}
