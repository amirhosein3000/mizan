"use client";
// A shop, with everything the dataset knows and says it doesn't know: exact
// address, hours, payment options (and how sure we are), what it lists, and
// neighbours in the same passage for a quick plan B.
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AtSign, Clock, CreditCard, Globe, Info, PhoneCall, Search, Store, Truck } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MapView } from "@/components/MapView";
import { ProductImage } from "@/components/ProductImage";
import { AddressLine, MapButtons, OpenPill, PaymentBadges, PriceTruth, StockLine, TrafficHint } from "@/components/shop";
import { Card, ErrorNote, Pill, SectionTitle, Skeleton } from "@/components/ui";
import type { Offer, Product, Shop } from "@/lib/catalog/types";
import { formatNumber } from "@/lib/format";
import { priceFreshness } from "@/lib/shop/freshness";
import { formatDistance, travelEstimate } from "@/lib/shop/geo";
import { DAY_NAMES, dayLabel, tehranClock, type OpenStatus } from "@/lib/shop/hours";
import type { Confirmation } from "@/lib/shop/rank";
import { useShopper, withCtx } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";

interface ShopResponse {
  shop: Shop;
  status: OpenStatus;
  distanceM: number | null;
  offers: { offer: Offer; product: Product; confirmation: Confirmation | null }[];
  neighbours: { shop: Shop; distanceM: number; status: OpenStatus }[];
}

export function ShopScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const focus = search.get("p");
  const { ctx, query } = useShopper();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const { data, previous, error, reload } = useApi<ShopResponse>(
    withCtx(`/api/shops/${encodeURIComponent(id)}${term ? `?q=${encodeURIComponent(term)}` : ""}`, query),
  );
  const d = data ?? previous;
  const today = tehranClock().day;

  const offers = useMemo(() => {
    const list = [...(d?.offers ?? [])];
    if (focus) list.sort((a, b) => (a.product.id === focus ? -1 : b.product.id === focus ? 1 : 0));
    return list;
  }, [d, focus]);

  if (error && !d) {
    return (
      <>
        <AppHeader title="فروشگاه" back />
        <div className="p-4">
          <ErrorNote message={error} onRetry={reload} />
        </div>
      </>
    );
  }
  if (!d) {
    return (
      <>
        <AppHeader title="…" back />
        <div className="space-y-3 p-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-48" />
        </div>
      </>
    );
  }
  const { shop } = d;
  const travel = d.distanceM !== null ? travelEstimate(d.distanceM) : null;

  return (
    <>
      <AppHeader title={shop.name} back />
      <main className="space-y-3 px-4 pb-10">
        <Card className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Store className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-black leading-7">{shop.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <OpenPill status={d.status} />
                {shop.area && <Pill>{shop.area}</Pill>}
                {!shop.nameReal && <Pill tone="muted">نام نمایشی</Pill>}
              </div>
            </div>
          </div>
          <AddressLine shop={shop} full />
          {d.distanceM !== null && (
            <div className="text-[12.5px] text-muted">
              از {ctx.origin?.label}: {formatDistance(d.distanceM)} • {travel?.label}
            </div>
          )}
          <MapView points={[{ id: shop.id, lat: shop.lat, lon: shop.lon, label: shop.name, tone: "brand", selected: true }]} origin={ctx.origin} className="h-44" />
          <MapButtons shop={shop} />
          <TrafficHint shop={shop} />
        </Card>

        <Card className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <CreditCard className="size-4.5" /> شرایط خرید
          </h3>
          <PaymentBadges shop={shop} />
          <div className="flex flex-wrap gap-1.5">
            <Pill tone={shop.torobPay === "in_person" ? "good" : "muted"}>
              ترب‌پی: {shop.torobPay === "in_person" ? "پذیرنده‌ی حضوری" : shop.torobPay === "unknown" ? "دارد، نوع پذیرش نامشخص" : "ثبت نشده"}
            </Pill>
            <Pill tone={shop.fastDelivery ? "good" : "muted"}>
              <Truck className="size-3.5" /> ارسال فوری: {shop.fastDelivery === null ? "نامشخص" : shop.fastDelivery ? "دارد" : "ندارد"}
            </Pill>
            <Pill tone="muted">کالابرگ: ثبت نشده</Pill>
          </div>
          <p className="text-[11.5px] leading-5 text-muted">این‌ها چیزیه که فروشنده اعلام کرده؛ «حضوری» یعنی گفته تو مغازه هم قبول می‌کنه.</p>
        </Card>

        <Card>
          <h3 className="flex items-center gap-1.5 text-[14px] font-extrabold">
            <Clock className="size-4.5" /> ساعت کاری
          </h3>
          {shop.hours ? (
            <ul className="mt-2 divide-y divide-line text-[13px]">
              {DAY_NAMES.map((name, i) => (
                <li key={name} className={`flex justify-between py-1.5 ${i === today ? "font-extrabold text-brand" : ""}`}>
                  <span>
                    {name}
                    {i === today ? " (امروز)" : ""}
                  </span>
                  <span className="tabular">{dayLabel(shop.hours![i])}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-muted">این فروشگاه ساعت کاری ثبت نکرده. قبل از رفتن بذار میزان زنگ بزنه.</p>
          )}
        </Card>

        <Card className="space-y-2">
          <h3 className="text-[14px] font-extrabold">راه ارتباطی</h3>
          {shop.phone && (
            <a href={`tel:${shop.phone}`} className="flex items-center gap-2 text-[14px] font-bold" dir="ltr">
              <PhoneCall className="size-4 text-brand" /> {shop.phone}
            </a>
          )}
          {shop.instagram && (
            <a href={shop.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-brand" dir="ltr">
              <AtSign className="size-4" /> {shop.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")}
            </a>
          )}
          {shop.website && (
            <a href={shop.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-brand">
              <Globe className="size-4" /> {shop.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
          <p className="flex items-start gap-1.5 text-[11.5px] leading-5 text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            شماره‌ها و اغلب نام‌ها در دیتاست چالش نمایشی‌اند؛ آدرس و موقعیت واقعی است.
          </p>
        </Card>

        <section>
          <SectionTitle>
            چی داره؟ <span className="text-[12px] font-bold text-muted">{formatNumber(shop.offerCount)} کالای ثبت‌شده</span>
          </SectionTitle>
          {shop.offerCount === 0 ? (
            <Card className="text-[13px] leading-6 text-muted">
              این فروشگاه هیچ کالای مشخصی ثبت نکرده؛ فقط دسته‌های فعالیتش معلومه: {shop.categories.slice(0, 6).join("، ") || "—"}. دسته‌ی فعالیت نشونه‌ی موجود بودن یک کالا نیست.
            </Card>
          ) : (
            <>
              <form
                className="mb-2 flex items-center gap-2 rounded-2xl border border-line bg-surface px-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setTerm(q.trim());
                }}
              >
                <Search className="size-4 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="تو این فروشگاه بگرد…" className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
              </form>
              <div className="flex flex-col gap-2">
                {offers.map(({ offer, product, confirmation }) => (
                  <Link
                    key={product.id}
                    href={`/p/${encodeURIComponent(product.id)}`}
                    className={`flex items-center gap-3 rounded-2xl bg-surface p-3 ${product.id === focus ? "ring-2 ring-brand" : ""}`}
                  >
                    <ProductImage product={product} size={52} />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[13px] font-bold leading-6">{offer.title}</div>
                      <div className="mt-0.5">
                        <StockLine c={confirmation} />
                      </div>
                      {offer.warranty && <div className="text-[11.5px] text-muted">{offer.warranty}</div>}
                    </div>
                    <PriceTruth
                      compact
                      x={{
                        price: confirmation?.available && confirmation.price ? confirmation.price : offer.price,
                        priceSource: confirmation?.available && confirmation.price ? "confirmed" : offer.price ? "listed" : "none",
                        offer,
                        confirmation,
                        freshness: priceFreshness(offer.changedAt),
                      }}
                    />
                  </Link>
                ))}
                {offers.length === 0 && <Card className="text-[13px] text-muted">چیزی با این اسم ثبت نکرده.</Card>}
              </div>
            </>
          )}
        </section>

        {d.neighbours.length > 0 && (
          <section>
            <SectionTitle>همسایه‌ها (همین پاساژ و اطراف)</SectionTitle>
            <div className="flex flex-col gap-2">
              {d.neighbours.map((n) => (
                <Link key={n.shop.id} href={`/s/${encodeURIComponent(n.shop.id)}`} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold">{n.shop.name}</div>
                    <div className="truncate text-[12px] text-muted">
                      {[n.shop.floor ? `طبقه ${n.shop.floor}` : null, n.shop.unit, `${formatDistance(n.distanceM)} فاصله`].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <OpenPill status={n.status} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
