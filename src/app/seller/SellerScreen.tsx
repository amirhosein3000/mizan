"use client";
// The other side: a shop owner answers Mizan's questions in two taps and keeps
// prices fresh. Answers reach the shopper's call screen live.
import { useEffect, useRef, useState } from "react";
import { BellRing, Check, PhoneIncoming, Search, Store, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ProductImage } from "@/components/ProductImage";
import { AddressLine, PriceTruth } from "@/components/shop";
import { Button, Card, EmptyState, ErrorNote, Pill, SectionTitle, Segmented, Skeleton } from "@/components/ui";
import type { Offer, Product, Shop } from "@/lib/catalog/types";
import type { Inquiry } from "@/lib/agent/seller";
import { api, errorMessage } from "@/lib/client-api";
import { formatNumber, formatToman, parsePrice, timeAgo } from "@/lib/format";
import { priceFreshness } from "@/lib/shop/freshness";
import type { Confirmation } from "@/lib/shop/rank";
import { useApi, usePoll } from "@/lib/use-api";
import { useLocalString } from "@/lib/use-local";

interface InboxResponse {
  shop: Shop;
  inquiries: Inquiry[];
  products?: { offer: Offer; product: Product; confirmation: Confirmation | null }[];
  now: number;
}

const always = () => true;

export function SellerScreen() {
  const [shopId, setShopId] = useLocalString("mizan.seller.shop");
  return shopId ? <Inbox shopId={shopId} onChange={() => setShopId(null)} /> : <Picker onPick={setShopId} />;
}

function Picker({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data } = useApi<{ recent: Shop[]; matches: Shop[] }>(`/api/seller/shops?q=${encodeURIComponent(term)}`);
  return (
    <>
      <AppHeader title="پنل فروشنده" back="/" />
      <main className="space-y-3 px-4 pb-8">
        <Card className="text-[13px] leading-7 text-muted">
          فروشگاهت رو انتخاب کن. تا وقتی این صفحه بازه، سؤال‌های میزان (موجودی، قیمت، نگه‌داشتن کالا) مستقیم برات میاد و جوابت همون لحظه به خریدار می‌رسه.
        </Card>
        {(data?.recent.length ?? 0) > 0 && (
          <>
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <BellRing className="size-4 text-brand" /> همین الان میزان بهشون زنگ زده
              </span>
            </SectionTitle>
            <ShopList shops={data!.recent} onPick={onPick} />
          </>
        )}
        <form
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(q.trim());
          }}
        >
          <Search className="size-4 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="نام فروشگاه یا پاساژ…" className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </form>
        {data && <ShopList shops={data.matches} onPick={onPick} />}
      </main>
    </>
  );
}

function ShopList({ shops, onPick }: { shops: Shop[]; onPick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {shops.map((s) => (
        <button key={s.id} onClick={() => onPick(s.id)} className="flex items-center gap-3 rounded-2xl bg-surface p-3 text-start active:bg-surface-2">
          <Store className="size-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-bold">{s.name}</span>
            <span className="block truncate text-[12px] text-muted">{[s.mall, s.floor ? `طبقه ${s.floor}` : null, s.unit].filter(Boolean).join("، ") || s.address}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Inbox({ shopId, onChange }: { shopId: string; onChange: () => void }) {
  const [tab, setTab] = useState<"inbox" | "products">("inbox");
  const { data, error, refresh } = usePoll<InboxResponse>(`/api/seller/inbox?shop=${encodeURIComponent(shopId)}${tab === "products" ? "&products=1" : ""}`, 2000, always);
  const pending = data?.inquiries.filter((i) => !i.answered && i.expiresAt > data.now) ?? [];
  useRingOnNew(pending.map((i) => i.callId));
  const past = data?.inquiries.filter((i) => i.answered || i.expiresAt <= data.now) ?? [];

  return (
    <>
      <AppHeader
        title="پنل فروشنده"
        back="/"
        action={
          <button onClick={onChange} className="rounded-full px-3 py-1.5 text-[12px] font-bold text-brand active:bg-brand-soft">
            تغییر فروشگاه
          </button>
        }
      />
      <main className="space-y-3 px-4 pb-8">
        {error && !data && <ErrorNote message={error} />}
        {!data && !error && <Skeleton className="h-24" />}
        {data && (
          <Card className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-good opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-good" />
              </span>
              <span className="text-[12px] font-bold text-good">آنلاین — سؤال‌های میزان مستقیم به شما میاد</span>
            </div>
            <div className="text-[16px] font-black">{data.shop.name}</div>
            <AddressLine shop={data.shop} />
          </Card>
        )}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "inbox", label: `سؤال‌ها${pending.length ? ` (${formatNumber(pending.length)})` : ""}` },
            { value: "products", label: "قیمت‌های من" },
          ]}
        />

        {tab === "inbox" && data && (
          <>
            {pending.length === 0 && (
              <EmptyState icon={<PhoneIncoming className="size-6" />} title="فعلاً سؤالی نیست">
                وقتی خریداری از میزان بخواد به شما زنگ بزنه، اینجا با صدای زنگ و لرزش ظاهر می‌شه.
              </EmptyState>
            )}
            {pending.map((i) => (
              <InquiryCard key={i.callId} shopId={shopId} i={i} now={data.now} onDone={refresh} />
            ))}
            {past.length > 0 && (
              <>
                <SectionTitle>قبلی‌ها</SectionTitle>
                {past.map((i) => (
                  <div key={i.callId} className="flex items-center gap-3 rounded-2xl bg-surface p-3 opacity-80">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{i.productTitle}</div>
                      <div className="text-[11.5px] text-muted">{timeAgo(i.startedAt)}</div>
                    </div>
                    {i.answered ? (
                      <Pill tone={i.answered.available ? "good" : "high"}>{i.answered.available ? "گفتید موجوده" : "گفتید نداریم"}</Pill>
                    ) : (
                      <Pill>بی‌جواب</Pill>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === "products" && data && <MyProducts shopId={shopId} items={data.products} onSaved={refresh} />}
      </main>
    </>
  );
}

/** A short double beep + vibration when a new question arrives (the seller already tapped, so audio is allowed). */
function useRingOnNew(ids: string[]) {
  const seen = useRef<Set<string> | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (!seen.current) {
      seen.current = new Set(list);
      return;
    }
    const fresh = list.filter((id) => !seen.current!.has(id));
    list.forEach((id) => seen.current!.add(id));
    if (!fresh.length) return;
    try {
      navigator.vibrate?.([180, 80, 180]);
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.22].forEach((t) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + 0.2);
      });
    } catch {
      /* no audio: the card still pops in */
    }
  }, [key]);
}

function InquiryCard({ shopId, i, now, onDone }: { shopId: string; i: Inquiry; now: number; onDone: () => void }) {
  const [step, setStep] = useState<"ask" | "price">("ask");
  const [raw, setRaw] = useState(i.listedPrice ? formatNumber(i.listedPrice) : "");
  const [hold, setHold] = useState<number | null>(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(Math.max(0, Math.round((i.expiresAt - now) / 1000)));

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  async function send(available: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/seller/answer", {
        body: { shopId, callId: i.callId, available, price: available ? parsePrice(raw) : null, holdMinutes: available ? hold : null },
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="rise rounded-[var(--radius-card)] bg-surface p-3.5 ring-2 ring-brand">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-brand">
          <PhoneIncoming className="size-4" /> سؤال از طرف میزان
        </span>
        <span className="tabular text-[12px] font-bold text-muted">{formatNumber(left)} ثانیه</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <ProductImage product={{ images: i.image ? [i.image] : [], category: "", title: i.productTitle }} size={56} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[14px] font-extrabold leading-6">«{i.productTitle}» موجود دارید؟</div>
          {i.listedPrice && <div className="text-[12px] text-muted">قیمت ثبت‌شده‌ی شما: {formatToman(i.listedPrice)}</div>}
        </div>
      </div>
      {(i.asks.length > 0 || i.question) && (
        <div className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-[12.5px] leading-6">
          {i.asks.length > 0 && <div>می‌پرسه: {i.asks.join("، ")}</div>}
          {i.question && <div className="font-bold">«{i.question}»</div>}
        </div>
      )}
      {step === "ask" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => setStep("price")} disabled={busy || left === 0}>
            <Check className="size-5" /> موجوده
          </Button>
          <Button variant="danger" onClick={() => send(false)} disabled={busy || left === 0}>
            <X className="size-5" /> نداریم
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="block text-[12px] font-bold text-muted">قیمت امروز (تومان)</label>
          <input value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="numeric" className="h-11 w-full rounded-2xl border border-line bg-bg px-3 text-[15px] font-bold outline-none focus:border-brand" />
          <div className="flex flex-wrap gap-2">
            {[
              { v: 60, l: "۱ ساعت نگه می‌دارم" },
              { v: 180, l: "۳ ساعت" },
              { v: null, l: "نگه نمی‌دارم" },
            ].map((o) => (
              <button
                key={o.l}
                onClick={() => setHold(o.v)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-bold ${hold === o.v ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={() => send(true)} disabled={busy || left === 0 || !parsePrice(raw)}>
            ارسال جواب
          </Button>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <ErrorNote message={error} />
        </div>
      )}
    </div>
  );
}

function MyProducts({
  shopId,
  items,
  onSaved,
}: {
  shopId: string;
  items?: { offer: Offer; product: Product; confirmation: Confirmation | null }[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  if (!items) return <Skeleton className="h-40" />;
  if (!items.length) return <EmptyState icon={<Store className="size-6" />} title="کالایی ثبت نشده" />;

  async function save(productId: string, available: boolean) {
    await api("/api/seller/price", { body: { shopId, productId, available, price: parsePrice(raw) } }).catch(() => null);
    setEditing(null);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[12px] leading-5 text-muted">قیمتی که اینجا تأیید کنید با برچسب «تأیید خود فروشنده» به خریدارها نشون داده می‌شه.</p>
      {items.map(({ offer, product, confirmation }) => (
        <div key={product.id} className="rounded-2xl bg-surface p-3">
          <div className="flex items-center gap-3">
            <ProductImage product={product} size={48} />
            <div className="min-w-0 flex-1 text-[13px] font-bold leading-6">
              <span className="line-clamp-2">{offer.title}</span>
            </div>
            <PriceTruth
              compact
              x={{
                price: confirmation?.price ?? offer.price,
                priceSource: confirmation?.price ? "confirmed" : offer.price ? "listed" : "none",
                offer,
                confirmation,
                freshness: priceFreshness(offer.changedAt),
              }}
            />
          </div>
          {editing === product.id ? (
            <div className="mt-2 flex gap-2">
              <input value={raw} onChange={(e) => setRaw(e.target.value)} inputMode="numeric" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 text-[14px] outline-none focus:border-brand" />
              <Button className="h-10" onClick={() => save(product.id, true)} disabled={!parsePrice(raw)}>
                ثبت
              </Button>
              <Button variant="danger" className="h-10" onClick={() => save(product.id, false)}>
                تموم شده
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditing(product.id);
                setRaw(offer.price ? formatNumber(confirmation?.price ?? offer.price) : "");
              }}
              className="mt-2 text-[12.5px] font-bold text-brand"
            >
              تأیید / به‌روزرسانی قیمت امروز
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
