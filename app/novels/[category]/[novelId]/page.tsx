import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectoryPage } from "@/components/novel/DirectoryPage";
import { getCategoryLabel } from "@/lib/content/categories";
import { getAllNovels, getNovel } from "@/lib/content/novels";
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

  const title = `${novel.title} - Directory`;
  const description = novel.desc.trim().slice(0, 200);
  const path = `/novels/${category}/${novelId}`;

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(path)
    },
    openGraph: {
      ...baseOpenGraph(),
      title,
      description,
      url: absoluteOgUrl(path),
      type: "website"
    },
    robots: publicRobots()
  };
}

export default async function NovelDirectoryRoute({ params }: Props) {
  const { category, novelId } = await params;
  const novel = getNovel(category, novelId);
  if (!novel) notFound();

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
        name: novel.title,
        item: canonical
      }
    ]
  };

  const bookJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: novel.title,
    author: {
      "@type": "Person",
      name: novel.author
    },
    description: novel.desc,
    url: canonical,
    inLanguage: "en"
  };

  if (novel.tags?.length) {
    bookJsonLd.genre = novel.tags;
  }

  return (
    <>
      <JsonLd id="ld-json-directory-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="ld-json-directory-book" data={bookJsonLd} />
      <DirectoryPage novel={novel} chapters={chapters} />
    </>
  );
}
