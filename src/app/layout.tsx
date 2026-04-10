import type { Metadata } from "next";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <ThemeScript />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
