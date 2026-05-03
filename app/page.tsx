import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { SectionRail } from "@/components/novel/SectionRail";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getHotNovels, getLatestNovels, getNovelsByCategory } from "@/lib/content/novels";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { SITE_URL, toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
  description:
    "Read xiuxian, wuxia, xuanhuan, and eastern fantasy in English — directories, chapters, and annotation guides.",
  alternates: {
    canonical: toAbsoluteUrl("/")
  },
  openGraph: {
    ...baseOpenGraph(),
    title: `${SITE_NAME} - Xianxia, Wuxia and Eastern Fantasy Reading`,
    description:
      "Read xiuxian, wuxia, xuanhuan, and eastern fantasy in English — directories, chapters, and annotation guides.",
    url: absoluteOgUrl("/")
  },
  robots: publicRobots()
};

export default function HomePage() {
  const hot = getHotNovels();
  const latest = getLatestNovels(12);
  const xiuxian = getNovelsByCategory("xiuxian");
  const wuxia = getNovelsByCategory("wuxia");
  const xuanhuan = getNovelsByCategory("xuanhuan");
  const hotEssays = getNovelsByCategory("hot-essays");
  const featured = hot.find((item) => item.featured) ?? hot[0];

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
      <SideAdsLayout page="home">
        <div className="mx-auto max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">
        <section aria-label="Homepage semantic summary" className="sr-only">
          <h1>A Calm Reading Room for Eastern Fantasy Worlds</h1>
          <p>
            Translated xianxia, wuxia, and cultivation novels with clean chapters, essential guides,
            and reader-friendly navigation.
          </p>
          <ul>
            <li>Start Reading: {featured ? `/novels/${featured.categorySlug}/${featured.novelId}` : "/search"}</li>
            <li>Browse shelves: /category/xiuxian, /category/wuxia, /category/xuanhuan</li>
            <li>Latest Updates: /#section-latest</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)]/70 px-3 py-5 sm:px-6 sm:py-6">
          <SectionRail id="section-hot" title="Hot Novels" novels={hot} className="mb-8 sm:mb-10" />
          <SectionRail id="section-latest" title="Latest Updates" novels={latest} className="mb-0" />
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)]/70 px-3 py-5 sm:mt-10 sm:px-6 sm:py-6">
          <h2 className="mb-5 font-serif text-2xl font-semibold text-[var(--text-deep)]">Category Shelves</h2>
          <SectionRail id="section-xiuxian" title="XiuXian" novels={xiuxian} className="mb-8 sm:mb-10" />
          <SectionRail id="section-wuxia" title="WuXia" novels={wuxia} className="mb-8 sm:mb-10" />
          <SectionRail id="section-xuanhuan" title="XuanHuan" novels={xuanhuan} className="mb-0" />
        </section>

        <section className="mt-8 sm:mt-10">
          <SectionRail
            id="section-featured"
            title="Featured Series"
            novels={featured ? [featured, ...hotEssays] : hotEssays}
          />
        </section>
        </div>
      </SideAdsLayout>
      <SiteFooter variant="home" />
    </>
  );
}
