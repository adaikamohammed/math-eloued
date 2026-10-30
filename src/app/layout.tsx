import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AppShell } from "@/components/AppShell";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "منصة جسور التعليمية — حيث يلتقي الأستاذ، الولي، والتلميذ",
  description: "منصة جسور التعليمية — المنصة الوطنية الموحدة للتربية والتعليم والتسيير البيداغوجي، والربط المباشر بين الأستاذ، الإدارة، المفتش، والولي لمتابعة كراس القسم والتقويم والامتحانات.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "منصة جسور",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#064e3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* التحميل المسبق للخط العربي المعتمد لتسريع العرض بدون وميض */}
        <link
          rel="preload"
          href="/fonts/alexandria-arabic.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/alexandria-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500 selection:text-white">
        <ServiceWorkerRegister />
        <OfflineIndicator />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
