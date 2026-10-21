"use client";
// The shopper's situation as one row of chips: where from, when, how far, and
// purchase conditions. Every change re-ranks shops instantly on every screen.
import { useMemo, useState } from "react";
import { Check, ChevronDown, Clock, CreditCard, LocateFixed, MapPin, Navigation, Search, ShieldCheck, Store, X } from "lucide-react";
import { formatNumber, formatTomanShort } from "@/lib/format";
import { distanceM, formatDistance } from "@/lib/shop/geo";
import { DAY_NAMES, hhmm, tehranClock } from "@/lib/shop/hours";
import { CENTRAL_TEHRAN } from "@/lib/shop/places";
import type { Origin } from "@/lib/shop/context";
import { useShopper } from "@/lib/shopper-store";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { normalizeText } from "@/lib/text";
import { Sheet } from "./Sheet";
import { FilterChip } from "./ui";

interface AreasResponse {
  areas: { name: string; lat: number; lon: number; shops: number }[];
  landmarks: { name: string; lat: number; lon: number }[];
}

export function ContextBar({ showRadius = true, className = "" }: { showRadius?: boolean; className?: string }) {
  const { ctx, patch } = useShopper();
  const now = useNow();
  const [sheet, setSheet] = useState<null | "where" | "when" | "radius">(null);

  return (
    <>
      <div className={`no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 ${className}`}>
        <FilterChip on={!!ctx.origin} onClick={() => setSheet("where")} className="max-w-[46%]">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">{ctx.origin ? ctx.origin.label : "از کجا میای؟"}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-70" />
        </FilterChip>
        <FilterChip on={!!ctx.visitAt} onClick={() => setSheet("when")}>
          <Clock className="size-4" />
          {ctx.visitAt ? visitLabel(ctx.visitAt, now) : "الان"}
          <ChevronDown className="size-3.5 opacity-70" />
        </FilterChip>
        {ctx.budgetMax ? (
          <FilterChip on onClick={() => patch({ budgetMax: null })}>
            تا {formatTomanShort(ctx.budgetMax)}
            <X className="size-3.5" />
          </FilterChip>
        ) : null}
        {/* Conditions that are on come first, so what the agent set is visible without scrolling. */}
        {[
          { key: "installment", on: ctx.installment, toggle: () => patch({ installment: !ctx.installment }), icon: <CreditCard className="size-4" />, label: "قسطی" },
          { key: "open", on: ctx.openOnly, toggle: () => patch({ openOnly: !ctx.openOnly }), icon: <Store className="size-4" />, label: ctx.visitAt ? "باز در زمان رفتن" : "الان باز" },
          { key: "torobpay", on: ctx.torobPayInPerson, toggle: () => patch({ torobPayInPerson: !ctx.torobPayInPerson }), icon: null, label: "ترب‌پی حضوری" },
          { key: "warranty", on: ctx.warranty, toggle: () => patch({ warranty: !ctx.warranty }), icon: <ShieldCheck className="size-4" />, label: "گارانتی‌دار" },
        ]
          .sort((a, b) => Number(b.on) - Number(a.on))
          .map((c) => (
            <FilterChip key={c.key} on={c.on} onClick={c.toggle}>
              {c.icon}
              {c.label}
              {c.on && <Check className="size-3.5" />}
            </FilterChip>
          ))}
        {showRadius && (
          <FilterChip on={!!ctx.radiusKm} onClick={() => setSheet(ctx.origin ? "radius" : "where")}>
            <Navigation className="size-4" />
            {ctx.radiusKm ? `تا ${formatDistance(ctx.radiusKm * 1000)}` : "کل تهران"}
            <ChevronDown className="size-3.5 opacity-70" />
          </FilterChip>
        )}
      </div>
      {sheet === "where" && <LocationSheet onClose={() => setSheet(null)} />}
      {sheet === "when" && <TimeSheet onClose={() => setSheet(null)} />}
      {sheet === "radius" && <RadiusSheet onClose={() => setSheet(null)} />}
    </>
  );
}

/** Tehran calendar day number (UTC+03:30, no DST). */
const tehranDay = (ts: number) => Math.floor((ts + 3.5 * 3600_000) / 86_400_000);

export function visitLabel(at: number, now: number): string {
  const t = tehranClock(at);
  const dayDiff = tehranDay(at) - tehranDay(now);
  const day = dayDiff <= 0 ? "امروز" : dayDiff === 1 ? "فردا" : DAY_NAMES[t.day];
  return `${day} ${hhmm(t.minute)}`;
}

function OptionRow({ active, onClick, children, sub }: { active?: boolean; onClick: () => void; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-start ${active ? "bg-brand-soft" : "bg-surface active:bg-surface-2"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">{children}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
      {active && <Check className="size-5 text-brand" />}
    </button>
  );
}

export function LocationSheet({ onClose }: { onClose: () => void }) {
  const { ctx, patch } = useShopper();
  const { data } = useApi<AreasResponse>("/api/areas");
  const [q, setQ] = useState("");
  const [gps, setGps] = useState<"idle" | "busy" | "error" | "far">("idle");

  const set = (origin: Origin | null) => {
    patch({ origin, ...(origin ? {} : { radiusKm: null }) });
    onClose();
  };

  function locate() {
    if (!("geolocation" in navigator)) return setGps("error");
    setGps("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        if (distanceM(p, CENTRAL_TEHRAN) > 45_000) return setGps("far");
        set({ ...p, label: "موقعیت فعلی من", source: "gps" });
      },
      () => setGps("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const nq = normalizeText(q);
  const areas = useMemo(() => (data?.areas ?? []).filter((a) => !nq || normalizeText(a.name).includes(nq)), [data, nq]);
  const landmarks = useMemo(() => (data?.landmarks ?? []).filter((a) => !nq || normalizeText(a.name).includes(nq)), [data, nq]);

  return (
    <Sheet title="از کجا راه میفتی؟" onClose={onClose}>
      <button
        onClick={locate}
        className="flex w-full items-center gap-3 rounded-2xl bg-brand px-4 py-3.5 text-start text-white active:bg-brand-ink"
      >
        <LocateFixed className="size-5" />
        <span className="flex-1 text-[14px] font-bold">{gps === "busy" ? "در حال پیدا کردن موقعیتت…" : "موقعیت فعلی من (GPS)"}</span>
      </button>
      {gps === "error" && <p className="mt-2 text-[12px] text-high">دسترسی به موقعیت داده نشد. یکی از محله‌های زیر رو انتخاب کن.</p>}
      {gps === "far" && <p className="mt-2 text-[12px] text-fair">به نظر میاد الان تهران نیستی؛ برای امتحان یکی از محله‌های زیر رو انتخاب کن.</p>}

      <label className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-surface px-3">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی محله یا میدان…"
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] outline-none"
        />
      </label>

      {landmarks.length > 0 && (
        <>
          <div className="mt-4 text-[12px] font-bold text-muted">میدان‌ها و جاهای شناخته‌شده</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {landmarks.map((a) => {
              const on = ctx.origin?.label === a.name;
              return (
                <button
                  key={a.name}
                  onClick={() => set({ lat: a.lat, lon: a.lon, label: a.name, source: "landmark" })}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-bold ${on ? "bg-brand text-white" : "bg-surface ring-1 ring-line active:bg-surface-2"}`}
                >
                  {on && <Check className="size-3.5" />}
                  {a.name}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="mt-5 text-[12px] font-bold text-muted">یا محله‌های پرفروشگاه (از داده‌ی ترب)</div>
      <div className="mt-2 flex flex-col gap-1.5">
        {areas.slice(0, 14).map((a) => (
          <OptionRow
            key={a.name}
            active={ctx.origin?.label === a.name}
            onClick={() => set({ lat: a.lat, lon: a.lon, label: a.name, source: "area" })}
            sub={`${formatNumber(a.shops)} فروشگاه`}
          >
            {a.name}
          </OptionRow>
        ))}
      </div>
      {ctx.origin && (
        <button onClick={() => set(null)} className="mt-4 w-full rounded-2xl py-3 text-[13px] font-bold text-high">
          پاک کردن موقعیت
        </button>
      )}
    </Sheet>
  );
}

function at(now: number, dayOffset: number, hour: number): number {
  // Tehran is UTC+03:30 all year.
  const offset = 3.5 * 3600_000;
  const local = new Date(now + offset);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset;
  return midnight + dayOffset * 86_400_000 + hour * 3600_000;
}

function TimeSheet({ onClose }: { onClose: () => void }) {
  const { ctx, patch } = useShopper();
  const now = useNow();
  const options: { label: string; value: number | null; sub?: string }[] = [
    { label: "همین الان", value: null },
    { label: "یک ساعت دیگه", value: now + 3600_000 },
    { label: "امروز عصر", value: at(now, 0, 18), sub: "ساعت ۱۸" },
    { label: "فردا صبح", value: at(now, 1, 11), sub: "ساعت ۱۱" },
    { label: "فردا عصر", value: at(now, 1, 18), sub: "ساعت ۱۸" },
  ].filter((o) => o.value === null || o.value > now);
  return (
    <Sheet title="کی می‌خوای بری؟" onClose={onClose}>
      <p className="mb-3 text-[13px] leading-6 text-muted">ساعت کاری هر فروشگاه رو برای همون زمان چک می‌کنم و بسته‌ها رو کنار می‌ذارم.</p>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <OptionRow
            key={o.label}
            active={o.value === null ? !ctx.visitAt : !!ctx.visitAt && Math.abs(ctx.visitAt - o.value) < 60_000 * 5}
            sub={o.sub}
            onClick={() => {
              patch({ visitAt: o.value });
              onClose();
            }}
          >
            {o.label}
          </OptionRow>
        ))}
      </div>
    </Sheet>
  );
}

function RadiusSheet({ onClose }: { onClose: () => void }) {
  const { ctx, patch } = useShopper();
  const options: { label: string; value: number | null }[] = [
    { label: "۵۰۰ متر (پیاده)", value: 0.5 },
    { label: "۱ کیلومتر", value: 1 },
    { label: "۲ کیلومتر", value: 2 },
    { label: "۵ کیلومتر", value: 5 },
    { label: "۱۰ کیلومتر", value: 10 },
    { label: "کل تهران", value: null },
  ];
  return (
    <Sheet title={`تا کجا میای؟ (از ${ctx.origin?.label ?? "موقعیتت"})`} onClose={onClose}>
      <div className="flex flex-col gap-1.5">
        {options.map((o) => (
          <OptionRow
            key={o.label}
            active={ctx.radiusKm === o.value}
            onClick={() => {
              patch({ radiusKm: o.value });
              onClose();
            }}
          >
            {o.label}
          </OptionRow>
        ))}
      </div>
    </Sheet>
  );
}
