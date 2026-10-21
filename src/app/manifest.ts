import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "میزان — دستیار خرید حضوری",
    short_name: "میزان",
    description: "قیمت مغازه رو با قیمت آنلاین مقایسه کن، اشعه‌ی ایکس قیمت بگیر و با خیال راحت چونه بزن.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    dir: "rtl",
    lang: "fa",
    background_color: "#f6f5f1",
    theme_color: "#5b47e0",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "اشعه‌ی ایکس قیمت", url: "/xray", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "اسکن بارکد", url: "/scan?mode=barcode", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
