import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ensureContentIndex, ensureWikiIndex } from "@/lib/content/ensure-site-indexes-loaded";
import {
  getWikiNovelBucket,
  getWikiNovelDisplayLabel,
  getWikiNovelIdsSorted,
  listWikiEntriesForNovel
} from "@/lib/content/wiki-index";
import { WIKI_NAV_LABEL } from "@/lib/content/wiki-labels";
import { SITE_NAME, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
/** true：构建未预生成的 novelId 仍可 SSR（避免 Cloudflare/OpenNext 下子路由全体 404） */
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ novelId: string }[]> {
  await ensureWikiIndex();
  return getWikiNovelIdsSorted().map((novelId) => ({ novelId }));
}

type Props = { params: Promise<{ novelId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { novelId } = await params;
  await ensureContentIndex();
  await ensureWikiIndex();
  const bucket = await getWikiNovelBucket(novelId);
  if (!bucket) return {};
  const label = getWikiNovelDisplayLabel(bucket.categorySlug, novelId);
  const path = `/wiki/${novelId}`;
  const title = `${label} — ${WIKI_NAV_LABEL}`;
  const description = `Glossary terms for ${label}: cultivation lore, techniques, and world concepts with chapter links.`;
  return {
    title,
    description,
    alternates: { canonical: toAbsoluteUrl(path) },
    openGraph: {
      ...baseOpenGraph(),
      title: `${title} — ${SITE_NAME}`,
      description,
      url: toAbsoluteUrl(path),
      type: "website"
    },
    robots: publicRobots()
  };
}

export default async function WikiNovelHubPage({ params }: Props) {
  const { novelId } = await params;
  await ensureContentIndex();
  await ensureWikiIndex();
  const bucket = await getWikiNovelBucket(novelId);
  if (!bucket) notFound();

  const label = getWikiNovelDisplayLabel(bucket.categorySlug, novelId);
  const entries = await listWikiEntriesForNovel(novelId);

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] px-3 py-10 sm:px-4">
        <nav className="font-sans text-sm text-[var(--text-muted)]">
          <Link href="/wiki" className="text-[var(--accent-green)] hover:underline">
            {WIKI_NAV_LABEL}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-[var(--text-deep)]">{label}</span>
        </nav>

        <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight text-[var(--text-deep)] sm:text-4xl">
          {label}
        </h1>
        <p className="mt-2 font-sans text-sm text-[var(--text-soft)] sm:text-base">{entries.length} terms</p>

        <ul className="mt-8 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link
                href={`/wiki/${novelId}/${encodeURIComponent(e.id)}`}
                className="block rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 font-sans text-[var(--text-deep)] shadow-sm transition hover:border-[var(--accent-green)] hover:bg-[#e9f8ef]"
              >
                <span className="font-semibold">{e.displayTitle}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter variant="home" />
    </>
  );
}
