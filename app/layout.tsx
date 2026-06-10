import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { baseOpenGraph, publicRobots, SITE_NAME } from "@/lib/seo-metadata";
import { SiteShell } from "@/components/site/SiteShell";

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

const siteDescription =
  "English-language xiuxian, wuxia, xuanhuan, and eastern fantasy - chapters, annotations, and crawlable reading.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
  description: siteDescription,
  openGraph: {
    ...baseOpenGraph(),
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description: siteDescription,
    url: SITE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Xianxia, Wuxia & Eastern Fantasy Reading`
      }
    ]
  },
  robots: publicRobots(),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png"
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description: siteDescription,
    images: ["/og-image.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontSans.variable} ${fontSerif.variable}`}>
      <body className={`${fontSans.className} font-sans antialiased`}>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
