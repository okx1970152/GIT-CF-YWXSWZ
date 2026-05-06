import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { markdownToHtml } from "@/lib/markdown";
import { SideAdsLayout } from "@/components/ads/SideAdsLayout";
import { ChapterReader } from "@/components/novel/ChapterReader";
import { MainContent } from "@/components/novel/MainContent";
import { AnnotationTrack } from "@/components/novel/AnnotationTrack";
import { ChapterNavigation } from "@/components/novel/ChapterNavigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { buildChapterShareTitle } from "@/lib/content/chapter-share";
import { mergeGuideTopicLists, stripRelatedTopicsFooter } from "@/lib/content/guide-topics";
import { sanitizeCulturalNotesFaqForPage } from "@/lib/content/cultural-notes-faq";
import { getChapterMetaByNo } from "@/lib/content/meta";
import { ensureContentIndex, ensureWikiIndex } from "@/lib/content/ensure-site-indexes-loaded";
import { getWikiLinkedIdsForNovel } from "@/lib/content/wiki-index";
import { getAllNovels, getDisplayNovelTitle, getNovel, getNovelSummary } from "@/lib/content/novels";
import { getAdjacentChapters, getChapter, getChapters } from "@/lib/content/chapters";
import { loadAnnotationByChapterNo } from "@/lib/content/annotations";
import { loadChapterMarkdownCached } from "@/lib/content/load-markdown";
import {
  applyGuideHeadingAnchors,
  applyLoreAnchorsToChapterHtml,
  extractLoreGuideSectionPreviews,
  reorderGuideSectionsHtml
} from "@/lib/lore/lore-html";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import {
  buildChapterBreadcrumbJsonLd,
  buildChapterFaqJsonLd,
  buildChapterReadingGraph,
  markdownToPlainTextForSchema
} from "@/lib/seo/structured-data";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = false;

type Props = { params: Promise<{ category: string; novelId: string; chapterNo: string }> };

export async function generateStaticParams(): Promise<
  { category: string; novelId: string; chapterNo: string }[]
> {
  await ensureContentIndex();
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
  await ensureContentIndex();
  await ensureWikiIndex();
  const novel = getNovel(category, novelId);
  const chapter = getChapter(category, novelId, chapterNo);
  if (!novel || !chapter) return {};
  const chapterMeta = getChapterMetaByNo(category, novelId, chapterNo);
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);

  let chapterBody = "";
  if (!chapterMeta?.chapter_meta_description?.trim()) {
    try {
      const loaded = await loadChapterMarkdownCached(category, novelId, chapter.fileName);
      chapterBody = loaded.body;
    } catch {
      chapterBody = "";
    }
  }

  const description =
    chapterMeta?.chapter_meta_description || readingDescription(chapterBody, summary);
  const canonicalPath = `/novels/${category}/${novelId}/chapters/${chapterNo}`;
  const chapterTitleFull =
    chapterMeta?.chapter_seo_title || `${chapter.title} - ${displayTitle} - Reading Mode`;
  const shareShortTitle = buildChapterShareTitle(chapter.title, displayTitle, chapterMeta);

  const keywordsMerged = mergeGuideTopicLists(
    chapterMeta?.chapter_keywords ?? [],
    chapterMeta?.guide_tags ?? []
  );
  const keywords = keywordsMerged.length ? keywordsMerged : undefined;

  const basePath = `/novels/${category}/${novelId}`;
  const adjacent = getAdjacentChapters(category, novelId, chapterNo);
  const pagination: Metadata["pagination"] | undefined =
    adjacent.prev || adjacent.next
      ? {
          ...(adjacent.prev
            ? { previous: toAbsoluteUrl(`${basePath}/chapters/${adjacent.prev}`) }
            : {}),
          ...(adjacent.next ? { next: toAbsoluteUrl(`${basePath}/chapters/${adjacent.next}`) } : {})
        }
      : undefined;

  return {
    title: chapterTitleFull,
    description,
    ...(pagination ? { pagination } : {}),
    alternates: {
      canonical: toAbsoluteUrl(canonicalPath)
    },
    openGraph: {
      ...baseOpenGraph(),
      type: "article",
      title: chapterMeta?.og_title || shareShortTitle,
      description: chapterMeta?.og_description || description,
      url: absoluteOgUrl(canonicalPath)
    },
    twitter: {
      card: "summary_large_image",
      title: chapterMeta?.twitter_title || chapterMeta?.og_title || shareShortTitle,
      description: chapterMeta?.twitter_description || chapterMeta?.og_description || description,
    },
    keywords,
    robots: publicRobots()
  };
}

export default async function ChapterPage({ params }: Props) {
  const { category, novelId, chapterNo } = await params;
  await ensureContentIndex();
  await ensureWikiIndex();
  const novel = getNovel(category, novelId);
  const chapter = getChapter(category, novelId, chapterNo);
  if (!novel || !chapter) notFound();
  const chapterMeta = getChapterMetaByNo(category, novelId, chapterNo);
  const displayTitle = getDisplayNovelTitle(novel);

  let chapterBody = "";
  try {
    const loaded = await loadChapterMarkdownCached(category, novelId, chapter.fileName);
    chapterBody = loaded.body;
  } catch {
    notFound();
  }

  const annotation = await loadAnnotationByChapterNo(category, novelId, chapterNo);
  const shareTitle = buildChapterShareTitle(chapter.title, displayTitle, chapterMeta);
  const adjacent = getAdjacentChapters(category, novelId, chapterNo);
  const topics = mergeGuideTopicLists(
    annotation?.relatedTopics ?? [],
    chapterMeta?.guide_tags ?? []
  );

  let chapterHtml = await markdownToHtml(chapterBody);
  const anchors = chapterMeta?.lore_anchors ?? [];
  if (anchors.length > 0) {
    const wikiLinkedIds = getWikiLinkedIdsForNovel(novelId);
    chapterHtml = applyLoreAnchorsToChapterHtml(chapterHtml, anchors, {
      novelId,
      wikiLinkedIds
    });
  }

  const guideMarkdown =
    stripRelatedTopicsFooter(annotation?.content ?? "").trim() || "*No annotation yet.*";
  const guidePlainForSchema = markdownToPlainTextForSchema(guideMarkdown);
  const chapterPlainForSchema = markdownToPlainTextForSchema(chapterBody);
  let guideHtml = await markdownToHtml(guideMarkdown);
  guideHtml = applyGuideHeadingAnchors(guideHtml);
  guideHtml = reorderGuideSectionsHtml(guideHtml);
  const lorePreviews = anchors.length > 0 ? extractLoreGuideSectionPreviews(guideHtml) : {};

  const basePath = `/novels/${category}/${novelId}`;
  const bookDirectoryUrl = toAbsoluteUrl(basePath);
  const chapterUrl = toAbsoluteUrl(`${basePath}/chapters/${chapterNo}`);
  const prevHref = adjacent.prev ? `${basePath}/chapters/${adjacent.prev}` : null;
  const nextHref = adjacent.next ? `${basePath}/chapters/${adjacent.next}` : null;

  const chapterHeadlineForSchema = chapterMeta?.chapter_title_en?.trim() || chapter.title;

  const breadcrumbJsonLd = buildChapterBreadcrumbJsonLd({
    homeUrl: toAbsoluteUrl("/"),
    bookName: displayTitle,
    bookDirectoryUrl,
    chapterName: chapterHeadlineForSchema,
    chapterUrl
  });

  const readingGraphJsonLd = buildChapterReadingGraph({
    chapterUrl,
    bookDirectoryUrl,
    displayTitle,
    chapterNo,
    chapterTitle: chapter.title,
    novelAuthor: novel.author,
    guidePlainText: guidePlainForSchema,
    chapterBodyPlainText: chapterPlainForSchema,
    siteName: SITE_NAME,
    chapterDatePublished: chapter.publishedAt,
    chapterDateModified: chapter.updatedAt || chapter.publishedAt
  });

  const culturalNotesFaqForPage = sanitizeCulturalNotesFaqForPage(chapterMeta?.cultural_notes_faq);
  const chapterFaqJsonLd = buildChapterFaqJsonLd({
    chapterUrl,
    faqItems: culturalNotesFaqForPage
  });

  return (
    <>
      <SideAdsLayout page="reading">
        <ChapterReader>
          <JsonLd id="ld-json-reading-graph" data={readingGraphJsonLd} />
          <JsonLd id="ld-json-chapter-breadcrumb" data={breadcrumbJsonLd} />
          {chapterFaqJsonLd ? (
            <JsonLd id="ld-json-chapter-faq" data={chapterFaqJsonLd} />
          ) : null}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,920px)_minmax(360px,460px)] lg:gap-10">
          <article className="novel-container min-w-0">
            <h1
              className="story-text font-serif text-3xl font-bold tracking-tight"
              style={{ color: "var(--reader-fg, var(--text-deep))", fontSize: "30px" }}
            >
              {chapter.title}
            </h1>
            {chapter.wordCount != null && chapter.wordCount > 0 ? (
              <p className="mt-2 font-sans text-sm text-[var(--text-muted)]">{chapter.wordCount.toLocaleString("en-US")} words</p>
            ) : null}
            <MainContent
              chapterHtml={chapterHtml}
              loreHoverEnabled={anchors.length > 0}
              lorePreviews={anchors.length > 0 ? lorePreviews : undefined}
            />
            <ChapterNavigation
              prevHref={prevHref}
              nextHref={nextHref}
              directoryHref={basePath}
              shareUrl={chapterUrl}
              shareTitle={shareTitle}
            />
          </article>

          <AnnotationTrack
            title={annotation?.title || "Essential Guide"}
            guideHtml={guideHtml}
            topics={topics}
            culturalNotesFaq={culturalNotesFaqForPage}
            shareUrl={chapterUrl}
            shareTitle={shareTitle}
          />
          </div>
        </ChapterReader>
      </SideAdsLayout>
      <SiteFooter variant="reading" novelTitle={displayTitle} />
    </>
  );
}
