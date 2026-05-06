import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import {
  getWikiEntry,
  getWikiNovelBucket,
  getWikiNovelDisplayLabel,
  getWikiTermStaticParams
} from "@/lib/content/wiki-index";
import {
  buildWikiDefinedTermJsonLd,
  buildWikiTermBreadcrumbJsonLd
} from "@/lib/seo/structured-data";
import { SITE_NAME, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams(): { novelId: string; id: string }[] {
  return getWikiTermStaticParams();
}

type Props = { params: Promise<{ novelId: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { novelId, id } = await params;
  const entry = getWikiEntry(novelId, id);
  const bucket = getWikiNovelBucket(novelId);
  if (!entry || !bucket) return {};

  const bookLabel = getWikiNovelDisplayLabel(bucket.categorySlug, novelId);
  const path = `/wiki/${novelId}/${encodeURIComponent(id)}`;
  const title = `${entry.displayTitle} — ${bookLabel}`;
  const description = entry.definition.trim().slice(0, 170);
  return {
    title,
    description,
    alternates: { canonical: toAbsoluteUrl(path) },
    openGraph: {
      ...baseOpenGraph(),
      title: `${entry.displayTitle} — ${SITE_NAME}`,
      description,
      url: toAbsoluteUrl(path),
      type: "article"
    },
    robots: publicRobots()
  };
}

export default async function WikiTermPage({ params }: Props) {
  const { novelId, id } = await params;
  const entry = getWikiEntry(novelId, id);
  const bucket = getWikiNovelBucket(novelId);
  if (!entry || !bucket) notFound();

  const bookLabel = getWikiNovelDisplayLabel(bucket.categorySlug, novelId);
  const termPath = `/wiki/${novelId}/${encodeURIComponent(id)}`;
  const termAbs = toAbsoluteUrl(termPath);
  const glossaryPath = `/wiki/${novelId}`;
  const glossaryAbs = toAbsoluteUrl(glossaryPath);
  const wikiHubAbs = toAbsoluteUrl("/wiki");

  const jsonLd = buildWikiDefinedTermJsonLd({
    name: entry.displayTitle,
    description: entry.definition,
    pageUrl: termAbs,
    glossaryIndexUrl: wikiHubAbs,
    siteName: SITE_NAME
  });

  const breadcrumbLd = buildWikiTermBreadcrumbJsonLd({
    homeUrl: toAbsoluteUrl("/"),
    novelGlossaryName: `${bookLabel} glossary`,
    novelGlossaryUrl: glossaryAbs,
    termName: entry.displayTitle,
    termUrl: termAbs
  });

  const categorySlug = bucket.categorySlug;

  return (
    <>
      <JsonLd id="ld-json-wiki-term" data={jsonLd} />
      <JsonLd id="ld-json-wiki-term-breadcrumb" data={breadcrumbLd} />
      <div className="mx-auto w-full max-w-[880px] px-3 py-10 sm:px-4">
        <nav className="font-sans text-sm text-[var(--text-muted)]">
          <Link href="/wiki" className="text-[var(--accent-green)] hover:underline">
            Lore glossary
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <Link href={glossaryPath} className="text-[var(--accent-green)] hover:underline">
            {bookLabel}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-[var(--text-deep)]">{entry.displayTitle}</span>
        </nav>

        <h1 className="mt-6 font-serif text-4xl font-bold tracking-tight text-[var(--text-deep)]">
          {entry.displayTitle}
        </h1>

        <article className="mt-8 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-6 shadow-sm">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Definition
          </h2>
          <div className="prose prose-neutral mt-3 max-w-none font-serif leading-relaxed text-[var(--text-soft)]">
            {entry.definition
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {para}
                </p>
              ))}
          </div>
        </article>

        <section className="mt-10" aria-labelledby="appears-heading">
          <h2 id="appears-heading" className="font-serif text-xl font-semibold text-[var(--text-deep)]">
            Appears in chapters
          </h2>
          <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
            {entry.chapterNos.map((no) => {
              const n = Number.parseInt(no, 10);
              const label = Number.isFinite(n) ? `Chapter ${n}` : `Chapter ${no}`;
              return (
                <li key={no}>
                  <Link
                    href={`/novels/${categorySlug}/${novelId}/chapters/${no}`}
                    className="inline-block rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 font-sans text-sm font-medium text-[var(--text-deep)] transition hover:border-[var(--accent-green)] hover:bg-[#e9f8ef]"
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="mt-10 font-sans text-sm text-[var(--text-muted)]">
          <Link href={`/novels/${categorySlug}/${novelId}`} className="text-[var(--accent-green)] hover:underline">
            ← Back to {bookLabel}
          </Link>
        </p>
      </div>
      <SiteFooter variant="home" />
    </>
  );
}
