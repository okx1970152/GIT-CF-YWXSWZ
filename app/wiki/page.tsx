import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getWikiNovelBucket, getWikiNovelDisplayLabel, getWikiNovelIdsSorted } from "@/lib/content/wiki-index";
import {
  WIKI_HUB_HEADING,
  WIKI_HUB_META_DESCRIPTION,
  WIKI_HUB_TAGLINE
} from "@/lib/content/wiki-labels";
import { SITE_NAME, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${WIKI_HUB_HEADING} — ${SITE_NAME}`,
  description: WIKI_HUB_META_DESCRIPTION,
  alternates: { canonical: toAbsoluteUrl("/wiki") },
  openGraph: {
    ...baseOpenGraph(),
    title: `${WIKI_HUB_HEADING} — ${SITE_NAME}`,
    description: WIKI_HUB_META_DESCRIPTION,
    url: toAbsoluteUrl("/wiki"),
    type: "website"
  },
  robots: publicRobots()
};

export default function WikiHubPage() {
  const novelIds = getWikiNovelIdsSorted();

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-3 py-10 sm:px-4">
        <h1 className="text-center font-serif text-3xl font-bold tracking-tight text-[var(--text-deep)] sm:text-4xl">
          {WIKI_HUB_HEADING}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-center font-sans text-sm leading-relaxed text-[var(--text-soft)] sm:text-base">
          {WIKI_HUB_TAGLINE}
        </p>

        {novelIds.length === 0 ? (
          <p className="mt-12 text-center font-sans text-[var(--text-muted)]">
            No glossary entries yet — rerun the content pipeline with lore definitions to populate this index.
          </p>
        ) : (
          <ul className="mx-auto mt-10 max-w-xl list-none space-y-3 p-0">
            {novelIds.map((novelId) => {
              const bucket = getWikiNovelBucket(novelId);
              const count = bucket ? Object.keys(bucket.entries).length : 0;
              const label = bucket
                ? getWikiNovelDisplayLabel(bucket.categorySlug, novelId)
                : novelId;
              return (
                <li key={novelId}>
                  <Link
                    href={`/wiki/${novelId}`}
                    className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 font-sans text-[var(--text-deep)] shadow-sm transition hover:border-[var(--accent-green)] hover:bg-[#e9f8ef]"
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-sm text-[var(--text-muted)]">{count} terms</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <SiteFooter variant="home" />
    </>
  );
}
