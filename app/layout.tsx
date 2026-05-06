import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { baseOpenGraph, publicRobots, SITE_NAME } from "@/lib/seo-metadata";
import { SiteShell } from "@/components/site/SiteShell";
import { ensureContentIndex } from "@/lib/content/ensure-site-indexes-loaded";

const fontSans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  adjustFontFallback: true
});

const fontSerif = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
  adjustFontFallback: true
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
  description:
    "English-language xiuxian, wuxia, xuanhuan, and eastern fantasy — chapters, annotations, and crawlable reading.",
  openGraph: {
    ...baseOpenGraph(),
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description:
      "English-language xiuxian, wuxia, xuanhuan, and eastern fantasy — chapters, annotations, and crawlable reading.",
    url: SITE_URL
  },
  robots: publicRobots(),
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" }
    ],
    shortcut: "/favicon.png",
    apple: "/icon.png"
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await ensureContentIndex();
  return (
    <html lang="en" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body className={`${fontSans.className} font-sans antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
