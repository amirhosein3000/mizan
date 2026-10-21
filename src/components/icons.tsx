import {
  AirVent,
  Barcode,
  Camera,
  ChartLine,
  ListChecks,
  MapPin,
  Mic,
  ReceiptText,
  Scale,
  Store,
  Coffee,
  CookingPot,
  Flame,
  Gavel,
  History,
  Laptop,
  MessageCircle,
  Microwave,
  Package,
  Refrigerator,
  ScanLine,
  Shirt,
  ShoppingBasket,
  Shuffle,
  Smartphone,
  Sparkles,
  Tv,
  WashingMachine,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Feature icon names used in src/config/features.ts. */
export const FEATURE_ICONS: Record<string, LucideIcon> = {
  scan: ScanLine,
  xray: Zap,
  gavel: Gavel,
  shuffle: Shuffle,
  chat: MessageCircle,
  history: History,
  sparkles: Sparkles,
  camera: Camera,
  barcode: Barcode,
  list: ListChecks,
  receipt: ReceiptText,
  compare: Scale,
  chart: ChartLine,
  map: MapPin,
  mic: Mic,
  store: Store,
};

export const SUBCATEGORY_ICONS: Record<string, LucideIcon> = {
  "یخچال و فریزر": Refrigerator,
  "ماشین لباسشویی": WashingMachine,
  "ماشین ظرفشویی": WashingMachine,
  تلویزیون: Tv,
  مایکروویو: Microwave,
  "کولر گازی": AirVent,
  جاروبرقی: Wind,
  "اجاق گاز": Flame,
  "بخاری و پکیج": Flame,
  "چای‌ساز": Coffee,
  "قهوه‌ساز": Coffee,
  "سرخ‌کن": CookingPot,
  اتو: Shirt,
  "آبمیوه‌گیری و غذاساز": CookingPot,
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mobile: Smartphone,
  laptop: Laptop,
  appliance: Package,
  grocery: ShoppingBasket,
};

/** Soft tile colour per category, so lists are scannable at a glance. */
export const CATEGORY_TINT: Record<string, string> = {
  mobile: "bg-[#e8f0ff] text-[#2f5bd8]",
  laptop: "bg-[#efe9ff] text-[#5b47e0]",
  appliance: "bg-[#e3f6f3] text-[#11806f]",
  grocery: "bg-[#fff0e0] text-[#c2620a]",
};

export const CATEGORY_LABEL: Record<string, string> = {
  mobile: "موبایل",
  laptop: "لپ‌تاپ",
  appliance: "لوازم خانگی",
  grocery: "سوپرمارکت",
};
