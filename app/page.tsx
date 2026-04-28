import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/site/Hero";
import { SectionRail } from "@/components/novel/SectionRail";
import { getHotNovels, getLatestNovels, getNovelsByCategory } from "@/lib/content/novels";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { SITE_URL, toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
  description:
    "Read xianxia, wuxia, urban fantasy, and eastern stories in English — directories, chapters, and annotation guides.",
  alternates: {
    canonical: toAbsoluteUrl("/")
  },
  openGraph: {
    ...baseOpenGraph(),
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description:
      "Read xianxia, wuxia, urban fantasy, and eastern stories in English — directories, chapters, and annotation guides.",
    url: absoluteOgUrl("/")
  },
  robots: publicRobots()
};

export default function HomePage() {
  const hot = getHotNovels();
  const latest = getLatestNovels(12);
  const xuanhuan = getNovelsByCategory("xuanhuan");
  const wuxia = getNovelsByCategory("wuxia");
  const hotEssays = getNovelsByCategory("hot-essays");

  const searchTemplate = `${SITE_URL}/search?q={search_term_string}`;
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: searchTemplate,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <JsonLd id="ld-json-website" data={websiteJsonLd} />
      <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-6">
      <Hero
        title="Novel Portal"
        subtitle="Xianxia, wuxia, urban fantasy, and eastern stories — curated for immersive English reading."
        className="mb-12"
      />

      <SectionRail id="section-hot" title="Hot" novels={hot} />
      <SectionRail id="section-latest" title="Latest" novels={latest} />
      <SectionRail id="section-xuanhuan" title="Xuanhuan" novels={xuanhuan} />
      <SectionRail id="section-wuxia" title="Wuxia" novels={wuxia} />
      <SectionRail id="section-hot-essays" title="Hot Essays" novels={hotEssays} />
      </div>
    </>
  );
}
