import type { Metadata } from "next";
import Link from "next/link";
import { ensureContentIndex } from "@/lib/content/ensure-site-indexes-loaded";
import { searchContent } from "@/lib/content/search";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const raw = sp.q?.trim() ?? "";
  const titleBase = raw ? `Search: ${raw} - ${SITE_NAME}` : `Search - ${SITE_NAME}`;
  const description = raw
    ? `Search results for "${raw}" across novels, chapters, tags, and related topics on ${SITE_NAME}.`
    : `Search novels, chapters, authors, descriptions, categories, tags, and related-topic keywords on ${SITE_NAME}.`;

  return {
    title: titleBase,
    description,
    alternates: {
      canonical: toAbsoluteUrl(raw ? `/search?q=${encodeURIComponent(raw)}` : "/search")
    },
    openGraph: {
      ...baseOpenGraph(),
      title: titleBase,
      description,
      url: absoluteOgUrl(raw ? `/search?q=${encodeURIComponent(raw)}` : "/search"),
      type: "website"
    },
    robots: {
      index: false,
      follow: true
    }
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  await ensureContentIndex();
  const query = sp.q?.trim() || "";
  const results = query ? await searchContent(query) : [];
  const novelCards = results.filter((item) => item.type === "novel");
  const otherResults = results.filter((item) => item.type !== "novel");
  const queryLower = query.toLowerCase();

  const highlight = (text: string) => {
    if (!queryLower) return text;
    const idx = text.toLowerCase().indexOf(queryLower);
    if (idx < 0) return text;
    const before = text.slice(0, idx);
    const mid = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (
      <>
        {before}
        <mark className="rounded bg-[#dcefdc] px-1 text-[var(--text-deep)]">{mid}</mark>
        {after}
      </>
    );
  };

  return (
    <>
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--text-deep)]">Search</h1>
        {!query ? (
          <>
            <p className="mt-3 leading-relaxed text-[var(--text-soft)]">
              Enter a keyword in the navbar search box, for example{" "}
              <Link className="text-[#058c46] underline" href="/search?q=DaoHeart">
                /search?q=DaoHeart
              </Link>
              .
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Matches titles, authors, synopsis, categories, tags, chapter titles, and related topic keywords.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-[var(--text-soft)]">
              Results for <span className="font-semibold text-[var(--text-deep)]">{query}</span>: {results.length} hit
              {results.length === 1 ? "" : "s"}
            </p>
            {novelCards.length ? (
              <section className="mt-6" aria-labelledby="matched-novels-heading">
                <h2
                  id="matched-novels-heading"
                  className="font-serif text-2xl font-semibold tracking-tight text-[var(--text-deep)]"
                >
                  Matching novel directories
                </h2>
                <div className="mt-4 space-y-4">
                  {novelCards.map((item) => (
                    <Link
                      key={`novel-card-${item.href}`}
                      href={item.href}
                      className="block rounded-3xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-6 shadow-sm transition hover:border-[var(--accent-green)] hover:bg-[#eef7f0]"
                    >
                      <p className="font-serif text-3xl font-semibold tracking-tight text-[var(--text-deep)]">
                        {highlight(item.title)}
                      </p>
                      <p className="mt-3 max-w-4xl text-base leading-8 text-[var(--text-soft)]">
                        {highlight(item.excerpt)}
                      </p>
                      <p className="mt-4 text-sm font-semibold text-[#058c46]">Open directory -&gt;</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
            <ul className="mt-6 space-y-4">
              {otherResults.map((item) => (
                <li key={`${item.type}-${item.href}`}>
                  <Link href={item.href} className="font-medium text-[#058c46] underline">
                    {highlight(item.title)}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--text-soft)]">{highlight(item.excerpt)}</p>
                </li>
              ))}
            </ul>
            {results.length === 0 ? (
              <p className="mt-6 text-[var(--text-muted)]">No matches. Try another keyword or browse categories.</p>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter variant="search" />
    </>
  );
}
