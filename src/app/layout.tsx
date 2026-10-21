import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { APP_NAME, APP_NAME_EN, TAGLINE } from "@/lib/persona";
import "./globals.css";

const vazirmatn = localFont({
  src: "../../node_modules/vazirmatn/fonts/webfonts/Vazirmatn[wght].woff2",
  variable: "--font-vazirmatn",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — ${TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: "دستیار هوشمند خرید حضوری از فروشگاه‌های تهران: پیدا کردن نزدیک‌ترین فروشگاه، مقایسه‌ی قیمت و تماس برای موجودی. ساخته‌شده برای هکاتون ترب.",
  applicationName: APP_NAME_EN,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5b47e0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg pb-[calc(76px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
        <ServiceWorker />
      </body>
    </html>
  );
}
