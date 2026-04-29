import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { markdownToHtml } from "@/lib/markdown";
import { ChapterReader } from "@/components/novel/ChapterReader";
import { MainContent } from "@/components/novel/MainContent";
import { AnnotationTrack } from "@/components/novel/AnnotationTrack";
import { ChapterNavigation } from "@/components/novel/ChapterNavigation";
import { getChapterMetaByNo } from "@/lib/content/meta";
import { getAllNovels, getDisplayNovelTitle, getNovel } from "@/lib/content/novels";
import { getAdjacentChapters, getChapter, getChapters } from "@/lib/content/chapters";
import { getAnnotationByChapterNo } from "@/lib/content/annotations";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string; novelId: string; chapterNo: string }> };

export function generateStaticParams(): { category: string; novelId: string; chapterNo: string }[] {
  return getAllNovels().flatMap((novel) =>
    getChapters(novel.categorySlug, novel.novelId).map((chapter) => ({
      category: novel.categorySlug,
      novelId: novel.novelId,
      chapterNo: chapter.chapterNo
    }))
  );
}

function readingDescription(chapterBody: string, novelDesc: string): string {
  const compact = chapterBody.trim().replace(/\s+/g, " ");
  if (compact.length >= 80) return compact.slice(0, 170);
  return novelDesc.trim().slice(0, 170);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, novelId, chapterNo } = await params;
  const novel = getNovel(category, novelId);
  const chapter = getChapter(category, novelId, chapterNo);
  if (!novel || !chapter) return {};
  const chapterMeta = getChapterMetaByNo(category, novelId, chapterNo);
  const displayTitle = getDisplayNovelTitle(novel);

  const description =
    chapterMeta?.chapter_meta_description || readingDescription(chapter.content, novel.desc);
  const canonicalPath = `/novels/${category}/${novelId}/chapters/${chapterNo}`;
  const chapterTitleFull =
    chapterMeta?.chapter_seo_title || `${chapter.title} - ${displayTitle} - Reading Mode`;

  return {
    title: chapterTitleFull,
    description,
    alternates: {
      canonical: toAbsoluteUrl(canonicalPath)
    },
    openGraph: {
      ...baseOpenGraph(),
      type: "article",
      title: chapterTitleFull,
      description,
      url: absoluteOgUrl(canonicalPath)
    },
    keywords: chapterMeta?.chapter_keywords?.length ? chapterMeta.chapter_keywords : undefined,
    robots: publicRobots()
  };
}

export default async function ChapterPage({ params }: Props) {
  const { category, novelId, chapterNo } = await params;
  const novel = getNovel(category, novelId);
  const chapter = getChapter(category, novelId, chapterNo);
  if (!novel || !chapter) notFound();
  const displayTitle = getDisplayNovelTitle(novel);

  const annotation = getAnnotationByChapterNo(category, novelId, chapterNo);
  const adjacent = getAdjacentChapters(category, novelId, chapterNo);

  const chapterHtml = await markdownToHtml(chapter.content);
  const guideHtml = await markdownToHtml(annotation?.content || "*No annotation yet.*");

  const basePath = `/novels/${category}/${novelId}`;
  const chapterUrl = toAbsoluteUrl(`${basePath}/chapters/${chapterNo}`);
  const prevHref = adjacent.prev ? `${basePath}/chapters/${adjacent.prev}` : null;
  const nextHref = adjacent.next ? `${basePath}/chapters/${adjacent.next}` : null;

  const description = readingDescription(chapter.content, novel.desc);

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
        name: novel.category,
        item: toAbsoluteUrl(`/category/${category}`)
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayTitle,
        item: toAbsoluteUrl(basePath)
      },
      {
        "@type": "ListItem",
        position: 4,
        name: chapter.title,
        item: chapterUrl
      }
    ]
  };

  const articleJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: chapter.title,
    name: chapter.title,
    author: {
      "@type": "Person",
      name: novel.author
    },
    description,
    url: chapterUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": chapterUrl
    },
    isPartOf: {
      "@type": "Book",
      name: displayTitle,
      url: toAbsoluteUrl(basePath)
    },
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE_NAME
    }
  };

  if (chapter.publishedAt) articleJsonLd.datePublished = chapter.publishedAt;
  if (chapter.updatedAt || chapter.publishedAt) {
    articleJsonLd.dateModified = chapter.updatedAt || chapter.publishedAt;
  }

  return (
    <>
      <JsonLd id="ld-json-chapter-breadcrumb" data={breadcrumbJsonLd} />
      <JsonLd id="ld-json-chapter-article" data={articleJsonLd} />

      <ChapterReader>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,920px)_minmax(360px,460px)] lg:gap-10">
          <article className="novel-container min-w-0">
            <h1
              className="story-text font-serif text-3xl font-bold tracking-tight"
              style={{ color: "var(--reader-fg, var(--text-deep))", fontSize: "calc(var(--reader-font-size, 20px) * 1.9)" }}
            >
              {chapter.title}
            </h1>
            <MainContent chapterHtml={chapterHtml} />
            <ChapterNavigation
              prevHref={prevHref}
              nextHref={nextHref}
              directoryHref={basePath}
            />
          </article>

          <AnnotationTrack
            title={annotation?.title || "Essential Guide"}
            guideHtml={guideHtml}
            topics={annotation?.relatedTopics ?? []}
          />
        </div>
      </ChapterReader>
    </>
  );
}
