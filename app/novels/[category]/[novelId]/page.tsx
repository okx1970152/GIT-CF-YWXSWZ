import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { DirectoryPage } from "@/components/novel/DirectoryPage";
import { VolumeDirectoryPage } from "@/components/encyclopedia/VolumeDirectoryPage";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getCategoryLabel } from "@/lib/content/categories";
import { getNovelMeta } from "@/lib/content/meta";
import { mergeNovelTags } from "@/lib/content/novel-merge";
import { ensureContentIndex, ensureEncyclopediaIndex } from "@/lib/content/ensure-site-indexes-loaded";
import { getAllNovels, getDisplayNovelTitle, getNovel, getNovelSummary } from "@/lib/content/novels";
import { getChapters } from "@/lib/content/chapters";
import { getEncyclopediaVolume, getEncyclopediaVolumeIds } from "@/lib/encyclopedia/index";
import { absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;
export const dynamic = "force-static";

type Props = { params: Promise<{ category: string; novelId: string }> };

export async function generateStaticParams(): Promise<{ category: string; novelId: string }[]> {
  await ensureContentIndex();
  await ensureEncyclopediaIndex();
  return [
    ...getAllNovels().map((novel) => ({
      category: novel.categorySlug,
      novelId: novel.novelId
    })),
    ...getEncyclopediaVolumeIds().map((novelId) => ({
      category: "eastern-mythology-encyclopedia",
      novelId
    }))
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, novelId } = await params;

  if (category === "eastern-mythology-encyclopedia") {
    await ensureEncyclopediaIndex();
    const volume = getEncyclopediaVolume(novelId);
    if (!volume) return {};

    const path = `/novels/${category}/${novelId}`;
    const title = volume.seoTitle || `${volume.titleEn} - Eastern Mythology Encyclopedia`;
    const description = volume.metaDescription || volume.summary;

    return {
      title,
      description,
      alternates: {
        canonical: toAbsoluteUrl(path)
      },
      openGraph: {
        ...baseOpenGraph(),
        title: volume.ogTitle || title,
        description: volume.ogDescription || description,
        url: absoluteOgUrl(path),
        type: "website"
      },
      twitter: {
        card: "summary_large_image",
        title: volume.twitterTitle || volume.ogTitle || title,
        description: volume.twitterDescription || volume.ogDescription || description
      },
      keywords: volume.keywords.length ? volume.keywords : volume.tags,
      robots: publicRobots()
    };
  }

  await ensureContentIndex();
  const novel = getNovel(category, novelId);
  if (!novel) return {};
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
      description: (novelMeta?.twitter_description || novelMeta?.og_description || description).trim()
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

  if (category === "eastern-mythology-encyclopedia") {
    await ensureEncyclopediaIndex();
    const volume = getEncyclopediaVolume(novelId);
    if (!volume) notFound();

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
          name: "Eastern Mythology Encyclopedia",
          item: toAbsoluteUrl(`/category/${category}`)
        },
        {
          "@type": "ListItem",
          position: 3,
          name: volume.titleEn,
          item: toAbsoluteUrl(`/novels/${category}/${novelId}`)
        }
      ]
    };

    return (
      <>
        <JsonLd id="ld-json-directory-breadcrumb" data={breadcrumbJsonLd} />
        <VolumeDirectoryPage volume={volume} />
        <SiteFooter variant="directory" novelTitle={volume.titleEn} />
      </>
    );
  }

  await ensureContentIndex();
  const novel = getNovel(category, novelId);
  if (!novel) notFound();
  const displayTitle = getDisplayNovelTitle(novel);

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

  return (
    <>
      <JsonLd id="ld-json-directory-breadcrumb" data={breadcrumbJsonLd} />
      <DirectoryPage novel={novel} chapters={chapters} />
      <SiteFooter variant="directory" novelTitle={displayTitle} />
    </>
  );
}
