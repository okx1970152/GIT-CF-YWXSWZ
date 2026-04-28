import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { baseOpenGraph, publicRobots, SITE_NAME } from "@/lib/seo-metadata";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
  description:
    "English-language xianxia, wuxia, urban fantasy, and eastern novels — chapters, annotations, and crawlable reading.",
  openGraph: {
    ...baseOpenGraph(),
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description:
      "English-language xianxia, wuxia, urban fantasy, and eastern novels — chapters, annotations, and crawlable reading.",
    url: SITE_URL
  },
  robots: publicRobots(),
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
