import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { SectionRail } from "@/components/novel/SectionRail";
import { SiteFooter } from "@/components/site/SiteFooter";
import { NovelCard } from "@/components/novel/NovelCard";
import { ALL_CATEGORY_SLUGS, getCategoryLabel } from "@/lib/content/categories";
import { getNovelsByCategory, sortNovelsByRankingThenUpdated } from "@/lib/content/novels";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams(): { category: string }[] {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = getCategoryLabel(category);
  const title = `${label} Novels - ${SITE_NAME}`;
  const description = `Browse English ${label} novels — directories, synopses, and crawlable chapter links on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(`/category/${category}`)
    },
    openGraph: {
      ...baseOpenGraph(),
      title,
      description,
      url: absoluteOgUrl(`/category/${category}`)
    },
    robots: publicRobots()
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  if (!(ALL_CATEGORY_SLUGS as readonly string[]).includes(category)) {
    notFound();
  }

  const label = getCategoryLabel(category);
  const novels = getNovelsByCategory(category);
  const popularCandidates = novels.filter((item) => item.hot || item.featured);
  const popularPool = popularCandidates.length ? popularCandidates : novels;
  const popularRail = sortNovelsByRankingThenUpdated(popularPool).slice(0, 8);
  const latest = [...novels].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const latestRail = latest.slice(0, 8);
  const novelsSorted = sortNovelsByRankingThenUpdated(novels);

  return (
    <>
    <SideAdsLayout page="category">
      <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">
      <section aria-label={`${label} category semantic summary`} className="sr-only">
        <h1>{label} Novels</h1>
        <p>
          Popular and recently updated novels in this shelf. Every card opens a crawlable novel
          directory with chapter links.
        </p>
      </section>
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)]/70 px-3 py-5 sm:px-6 sm:py-6">
        <SectionRail title={`Popular in ${label}`} novels={popularRail} className="mb-8 sm:mb-10" />
        <SectionRail title={`Latest in ${label}`} novels={latestRail} className="mb-0" />
      </section>

      <section className="mt-8 sm:mt-10" aria-labelledby="all-category-heading">
        <h2 id="all-category-heading" className="mb-5 font-serif text-2xl font-semibold text-[var(--text-deep)]">
          All {label} Novels
        </h2>
        {novelsSorted.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {novelsSorted.map((novel) => (
              <NovelCard key={`${novel.categorySlug}-${novel.novelId}`} novel={novel} className="max-w-none" />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-surface)] px-6 py-10 text-center text-[var(--text-soft)]">
            No novels in this category yet.
          </p>
        )}
      </section>
      </div>
    </SideAdsLayout>
    <SiteFooter variant="category" categoryLabel={label} />
  </>
  );
}
