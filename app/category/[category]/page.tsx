import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { SectionRail } from "@/components/novel/SectionRail";
import { SiteFooter } from "@/components/site/SiteFooter";
import { NovelCard } from "@/components/novel/NovelCard";
import { VolumeCard } from "@/components/encyclopedia/VolumeCard";
import { ALL_CATEGORY_SLUGS, getCategoryLabel } from "@/lib/content/categories";
import { ensureContentIndex, ensureEncyclopediaIndex } from "@/lib/content/ensure-site-indexes-loaded";
import { getAllNovels, getNovelsByCategory, sortNovelsByRankingThenUpdated } from "@/lib/content/novels";
import { getEncyclopediaVolumes } from "@/lib/encyclopedia/index";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";
import { buildCollectionPageJsonLd } from "@/lib/seo/structured-data";

const RANKING_AGGREGATE_SLUG = "ranking";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams(): { category: string }[] {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = getCategoryLabel(category);
  const isRanking = category === RANKING_AGGREGATE_SLUG;
  const isEncyclopedia = category === "eastern-mythology-encyclopedia";

  const title = isRanking
    ? `Site Ranking & Leaderboard - ${SITE_NAME}`
    : isEncyclopedia
      ? `${label} - ${SITE_NAME}`
      : `${label} Novels - ${SITE_NAME}`;

  const description = isRanking
    ? `Browse all English novels on ${SITE_NAME} sorted by editorial ranking across XiuXian, WuXia, XuanHuan, and more plus recently updated picks.`
    : isEncyclopedia
      ? `Browse the ten mythic volumes of the Eastern Mythology Encyclopedia, from immortals and gods to ghosts, realms, arts, and relics.`
      : `Browse English ${label} novels, with directories, synopses, and crawlable chapter links on ${SITE_NAME}.`;

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
  const isRanking = category === RANKING_AGGREGATE_SLUG;
  const isEncyclopedia = category === "eastern-mythology-encyclopedia";

  if (isEncyclopedia) {
    await ensureEncyclopediaIndex();
    const volumes = getEncyclopediaVolumes();

    return (
      <>
        <SideAdsLayout page="category">
          <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">
            <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)]/70 px-4 py-6 sm:px-6 sm:py-8">
              <p className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Eastern Mythology Encyclopedia
              </p>
              <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--text-deep)]">
                Eastern Mythology Encyclopedia
              </h1>
              <p className="mt-3 max-w-4xl font-serif text-lg leading-8 text-[var(--text-soft)]">
                Ten mythic volumes. Ten doors into an older cosmology. Read them like books, move through
                them like directories, and open each entry like a full chapter of lore.
              </p>
            </section>

            <section className="mt-10" aria-labelledby="encyclopedia-volumes-heading">
              <h2
                id="encyclopedia-volumes-heading"
                className="mb-5 font-serif text-2xl font-semibold text-[var(--text-deep)]"
              >
                The Ten Volumes
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {volumes.map((volume) => (
                  <VolumeCard key={volume.novelId} volume={volume} />
                ))}
              </div>
            </section>
          </div>
        </SideAdsLayout>
        <SiteFooter variant="category" categoryLabel={label} />
      </>
    );
  }

  await ensureContentIndex();

  const shelfNovels = isRanking ? null : getNovelsByCategory(category);
  const pool = isRanking ? getAllNovels() : shelfNovels!;

  const novelsSorted = sortNovelsByRankingThenUpdated(pool);
  const railLimit = 12;

  const popularRail = isRanking
    ? novelsSorted.slice(0, railLimit)
    : (() => {
        const popularCandidates = shelfNovels!.filter((item) => item.hot || item.featured);
        const popularPool = popularCandidates.length ? popularCandidates : shelfNovels!;
        return sortNovelsByRankingThenUpdated(popularPool).slice(0, railLimit);
      })();

  const latestRail = [...pool]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, railLimit);

  const railTopTitle = isRanking ? "Top ranked (site-wide)" : `Popular in ${label}`;
  const railLatestTitle = isRanking ? "Recently updated (site-wide)" : `Latest in ${label}`;
  const gridHeading = isRanking ? "All novels by rank" : `All ${label} Novels`;
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: isRanking ? "Site Ranking & Leaderboard" : `${label} Novels`,
    description: isRanking
      ? `Top-ranked novels across every shelf on ${SITE_NAME}.`
      : `Browse English ${label} novels with crawlable directories and chapter links.`,
    pageUrl: toAbsoluteUrl(`/category/${category}`),
    items: novelsSorted.slice(0, 24).map((item) => ({
      name: item.title,
      url: toAbsoluteUrl(`/novels/${item.categorySlug}/${item.novelId}`)
    }))
  });

  return (
    <>
      <JsonLd id="ld-json-collection-page" data={collectionJsonLd} />
      <SideAdsLayout page="category">
        <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">
          <section aria-label={`${label} category semantic summary`} className="sr-only">
            <h1>{isRanking ? "Site ranking and leaderboard" : `${label} Novels`}</h1>
            <p>
              {isRanking
                ? "Top-ranked novels across every shelf, plus recently updated titles. Cards link to each novel's real category directory."
                : "Popular and recently updated novels in this shelf. Every card opens a crawlable novel directory with chapter links."}
            </p>
          </section>
          <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)]/70 px-3 py-5 sm:px-6 sm:py-6">
            <SectionRail title={railTopTitle} novels={popularRail} className="mb-8 sm:mb-10" />
            <SectionRail title={railLatestTitle} novels={latestRail} className="mb-0" />
          </section>

          <section className="mt-8 sm:mt-10" aria-labelledby="all-category-heading">
            <h2 id="all-category-heading" className="mb-5 font-serif text-2xl font-semibold text-[var(--text-deep)]">
              {gridHeading}
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
