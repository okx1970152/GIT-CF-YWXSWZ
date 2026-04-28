import type { Metadata } from "next";
import Link from "next/link";
import { searchContent } from "@/lib/content/search";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
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
  const titleBase = raw
    ? `Search: ${raw} - ${SITE_NAME}`
    : `Search - ${SITE_NAME}`;
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
    robots: publicRobots()
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = sp.q?.trim() || "";
  const results = query ? searchContent(query) : [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-emerald-950">Search</h1>
      {!query ? (
        <>
          <p className="mt-3 leading-relaxed text-slate-700">
            Enter a keyword in your browser address bar, or use the navbar search box — for example{" "}
            <Link className="text-emerald-900 underline" href="/search?q=DaoHeart">
              /search?q=DaoHeart
            </Link>
            .
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Matches titles, authors, synopsis, categories, tags, chapter titles, and Related Topics keywords.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-slate-700">
            Results for <span className="font-semibold">{query}</span>: {results.length} hit
            {results.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-6 space-y-4">
            {results.map((item) => (
              <li key={`${item.type}-${item.href}`}>
                <Link href={item.href} className="font-medium text-emerald-900 underline">
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-slate-600">{item.excerpt}</p>
              </li>
            ))}
          </ul>
          {results.length === 0 ? (
            <p className="mt-6 text-slate-600">No matches. Try another keyword or browse categories.</p>
          ) : null}
        </>
      )}
    </main>
  );
}
