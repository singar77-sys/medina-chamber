import type { Metadata } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { CommandPalette } from "@/components/CommandPalette";
import { KeywordHotkey } from "@/components/KeywordHotkey";
import { MedinaAmbience } from "@/components/weather/MedinaAmbience";
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce issued by middleware.ts — passed to every inline <script>
  // we render so they execute under the strict policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload fonts for fastest paint */}
        <link
          rel="preload"
          href="/fonts/bn-bergen-bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/bn-bergen-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <ThemeScript nonce={nonce} />
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
            {/* Weather-aware landing ambience — plays once per session
                based on Medina's live conditions (snow/rain/fog) + applies
                time-aware theme on first visit if user hasn't chosen. */}
            <MedinaAmbience />
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
