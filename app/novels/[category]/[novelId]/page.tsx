import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectoryPage } from "@/components/novel/DirectoryPage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getCategoryLabel } from "@/lib/content/categories";
import { getNovelMeta } from "@/lib/content/meta";
import { mergeNovelTags } from "@/lib/content/novel-merge";
import { getAllNovels, getDisplayNovelTitle, getNovel, getNovelSummary } from "@/lib/content/novels";
import { getChapters } from "@/lib/content/chapters";
import { absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string; novelId: string }> };

export function generateStaticParams(): { category: string; novelId: string }[] {
  return getAllNovels().map((novel) => ({
    category: novel.categorySlug,
    novelId: novel.novelId
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, novelId } = await params;
  const novel = getNovel(category, novelId);
  if (!novel) return {};
  /** 目录页 SEO：title/description/og/twitter 以 meta/novel.json 为准；tags 与排序合并规则见 lib/content/novel-merge.ts */
  const novelMeta = getNovelMeta(category, novelId);
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const mergedTagList = mergeNovelTags(novel, novelMeta);

  const title = (novelMeta?.seo_title || `${displayTitle} - Directory`).trim();
  const description = (novelMeta?.meta_description || novelMeta?.summary || summary).trim().slice(0, 200);
  const path = `/novels/${category}/${novelId}`;

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(path)
    },
    openGraph: {
      ...baseOpenGraph(),
      title: (novelMeta?.og_title || title).trim(),
      description: (novelMeta?.og_description || description).trim(),
      url: absoluteOgUrl(path),
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: (novelMeta?.twitter_title || novelMeta?.og_title || title).trim(),
      description: (novelMeta?.twitter_description || novelMeta?.og_description || description).trim(),
    },
    keywords: novelMeta?.keywords?.length
      ? novelMeta.keywords
      : mergedTagList.length
        ? mergedTagList
        : novelMeta?.tags?.length
          ? novelMeta.tags
          : undefined,
    robots: publicRobots()
  };
}

export default async function NovelDirectoryRoute({ params }: Props) {
  const { category, novelId } = await params;
  const novel = getNovel(category, novelId);
  if (!novel) notFound();
  const novelMeta = getNovelMeta(category, novelId);
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const mergedTags = mergeNovelTags(novel, novelMeta);

  const chapters = getChapters(category, novelId);
  const canonical = toAbsoluteUrl(`/novels/${category}/${novelId}`);
  const categoryLabel = getCategoryLabel(category);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: toAbsoluteUrl("/")
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `${categoryLabel} Novels`,
        item: toAbsoluteUrl(`/category/${category}`)
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayTitle,
        item: canonical
      }
    ]
  };

  const bookJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: displayTitle,
    author: {
      "@type": "Person",
      name: novel.author
    },
    description: summary,
    url: canonical,
    inLanguage: "en"
  };

  if (mergedTags.length) {
    bookJsonLd.genre = mergedTags;
  }

  return (
    <>
      <JsonLd id="ld-json-directory-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="ld-json-directory-book" data={bookJsonLd} />
      <DirectoryPage novel={novel} chapters={chapters} />
      <SiteFooter variant="directory" novelTitle={displayTitle} />
    </>
  );
}
