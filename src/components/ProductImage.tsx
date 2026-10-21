"use client";
import { useState } from "react";
import {
  BatteryCharging,
  Cable,
  Camera,
  Glasses,
  Headphones,
  Laptop,
  Lightbulb,
  Package,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Speaker,
  SprayCan,
  Watch,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Product } from "@/lib/catalog/types";

const ICONS: Record<string, LucideIcon> = {
  phone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  speaker: Speaker,
  charger: BatteryCharging,
  camera: Camera,
  watch: Watch,
  glasses: Glasses,
  sofa: Sofa,
  bag: ShoppingBag,
  shirt: Shirt,
  perfume: SprayCan,
  light: Lightbulb,
  cable: Cable,
  power: Zap,
  other: Package,
};

const RULES: [RegExp, keyof typeof ICONS][] = [
  [/گوشی موبایل|تبلت/, "phone"],
  [/لپ.?تاپ|کامپیوتر/, "laptop"],
  [/هدفون|هندزفری|هدست|ایرپاد/, "headphones"],
  [/اسپیکر|صوتی/, "speaker"],
  [/شارژر|باتری|پاوربانک/, "charger"],
  [/دوربین/, "camera"],
  [/ساعت/, "watch"],
  [/عینک/, "glasses"],
  [/مبل|صندلی|میز/, "sofa"],
  [/کیف|کوله|کفش|صندل/, "bag"],
  [/پیراهن|لباس|هودی|تاپ|شلوار/, "shirt"],
  [/عطر|ادکلن/, "perfume"],
  [/لامپ|چراغ|ریسه|پروژکتور/, "light"],
  [/سیم|کابل/, "cable"],
  [/برق|ژنراتور|کنتاکتور|رله|فیوز|کلید/, "power"],
];

function iconKey(category: string): keyof typeof ICONS {
  return RULES.find(([re]) => re.test(category))?.[1] ?? "other";
}

/**
 * Product photo from the dataset (Torob image CDN) with a calm icon fallback
 * when there is no image or it fails to load.
 */
export function ProductImage({
  product,
  size = 64,
  className = "",
}: {
  product: Pick<Product, "images" | "category" | "title">;
  size?: number;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const src = product.images[0];
  const Icon = ICONS[iconKey(product.category)];
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-line ${className}`}
      style={{ width: size, height: size }}
    >
      {/* The icon sits underneath: visible while the photo loads, or if it never does. */}
      {state !== "loaded" && <Icon className="text-muted/70" style={{ width: size * 0.42, height: size * 0.42 }} strokeWidth={1.6} />}
      {src && state !== "failed" && (
        // Remote CDN image from the dataset; plain <img> keeps it cheap and avoids an image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={product.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 size-full object-contain p-1 transition-opacity duration-300 ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
    </span>
  );
}
