import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { CommandPalette } from "@/components/CommandPalette";
import { KeywordHotkey } from "@/components/KeywordHotkey";
import { BirthdayConfetti } from "@/components/BirthdayConfetti";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Medina Chamber of Commerce",
    template: "%s | Medina Chamber",
  },
  description:
    "The Greater Medina Chamber of Commerce connects businesses, drives economic growth, and strengthens the Medina community. Est. 1938.",
  metadataBase: new URL("https://medinachamber.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Medina Chamber of Commerce",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/images/chamber-logos/icon-green.png", type: "image/png" },
    ],
    apple: [
      { url: "/images/chamber-logos/icon-green.png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload brand fonts — woff2 only (otf kept as @font-face fallback).
            Bold preloaded first: used in hero h1, event graphics, nav; block
            display means it must arrive before first paint of those elements. */}
        <link
          rel="preload"
          href="/fonts/BNBergen-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/BNBergen.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/Mistrully.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <PostHogProvider>
          <ThemeProvider>
            <a
              href="#main-content"
              className="
                sr-only focus:not-sr-only
                focus:fixed focus:top-4 focus:left-4 focus:z-[100]
                focus:px-4 focus:py-2
                focus:bg-oxford focus:text-white
                focus:rounded-[var(--radius-md)]
                focus:outline-none focus:ring-2 focus:ring-cambridge/60
                focus:text-body-sm focus:font-bold
              "
            >
              Skip to main content
            </a>
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <Footer />
            <ChatWidget />
            <CommandPalette />
            <KeywordHotkey />
            <BirthdayConfetti />
          </ThemeProvider>
        </PostHogProvider>
        {/* Vercel observability — page views + web vitals (LCP, INP, CLS).
            Both ship sub-1KB scripts; data shows up in the Vercel project
            dashboard under Analytics + Speed Insights. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
