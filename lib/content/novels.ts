import "server-only";

import { getIndexCategories, getIndexNovel, getIndexNovelsByCategory } from "@/lib/content/content-index";
import { getDisplayNovelTitle, getNovelSummary } from "@/lib/content/novel-display";
import { novelInfoSchema, type NovelInfo } from "@/lib/content/schema";
import { getChapters } from "@/lib/content/chapters";
import { getAnnotationIndexEntry } from "@/lib/content/annotation-index";
import { mergeGuideTopicLists } from "@/lib/content/guide-topics";
import { getChapterSearchHintsFromIndex, getNovelMeta } from "@/lib/content/meta";
import { effectiveRanking } from "@/lib/content/novel-merge";

export function getAllCategories(): string[] {
  return getIndexCategories().sort((a, b) => a.localeCompare(b));
}

export function getNovelsByCategory(categorySlug: string): NovelInfo[] {
  return getIndexNovelsByCategory(categorySlug)
    .map((entry) => {
      try {
        const parsed = novelInfoSchema.parse(entry.frontmatter);
        return { ...parsed, categorySlug, novelId: entry.novelId };
      } catch {
        return null;
      }
    })
    .filter((item): item is NovelInfo => item !== null);
}

export function getAllNovels(): NovelInfo[] {
  return getAllCategories().flatMap((category) => getNovelsByCategory(category));
}

/** Hot rail: novels marked hot; falls back to featured; then all. */
/** 用于首页 Hot、分类 Popular 等：ranking（meta 优先）降序，再按 updated_at。 */
export function sortNovelsByRankingThenUpdated(novels: NovelInfo[]): NovelInfo[] {
  return [...novels].sort((a, b) => {
    const ra = effectiveRanking(a, getNovelMeta(a.categorySlug, a.novelId));
    const rb = effectiveRanking(b, getNovelMeta(b.categorySlug, b.novelId));
    if (rb !== ra) return rb - ra;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function getHotNovels(): NovelInfo[] {
  const all = getAllNovels();
  const hot = all.filter((n) => n.hot);
  if (hot.length > 0) return sortNovelsByRankingThenUpdated(hot);
  const featured = all.filter((n) => n.featured);
  if (featured.length > 0) return sortNovelsByRankingThenUpdated(featured);
  return sortNovelsByRankingThenUpdated(all);
}

/** Latest by frontmatter updated_at descending. */
export function getLatestNovels(limit = 24): NovelInfo[] {
  return [...getAllNovels()]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
}

/** Latest content update time within a category (for sitemap lastModified). */
export function getCategoryLatestUpdatedAt(categorySlug: string): Date | undefined {
  const novels = getNovelsByCategory(categorySlug);
  const times = novels
    .map((n) => new Date(n.updated_at).getTime())
    .filter((t) => !Number.isNaN(t));
  if (!times.length) return undefined;
  return new Date(Math.max(...times));
}

/** Latest update across all novels (home / global freshness hints). */
export function getLatestContentUpdatedAt(): Date | undefined {
  const novels = getAllNovels();
  const times = novels
    .map((n) => new Date(n.updated_at).getTime())
    .filter((t) => !Number.isNaN(t));
  if (!times.length) return undefined;
  return new Date(Math.max(...times));
}

export function getNovel(categorySlug: string, novelId: string): NovelInfo | null {
  const entry = getIndexNovel(categorySlug, novelId);
  if (!entry) return null;
  try {
    const parsed = novelInfoSchema.parse(entry.frontmatter);
    return { ...parsed, categorySlug, novelId };
  } catch {
    return null;
  }
}

export type SearchResult = {
  type: "novel" | "chapter";
  title: string;
  excerpt: string;
  href: string;
};

export async function getSearchIndex(): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  for (const novel of getAllNovels()) {
    results.push({
      type: "novel",
      title: getDisplayNovelTitle(novel),
      excerpt: getNovelSummary(novel),
      href: `/novels/${novel.categorySlug}/${novel.novelId}`
    });

    for (const chapter of getChapters(novel.categorySlug, novel.novelId)) {
      const guide = getAnnotationIndexEntry(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const hints = getChapterSearchHintsFromIndex(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const topicLabels = mergeGuideTopicLists(
        [...(guide?.relatedTopics ?? []), ...(hints.chapter_keywords ?? [])],
        hints.guide_tags ?? []
      );

      results.push({
        type: "chapter",
        title: `${chapter.title} (${chapter.chapterNo})`,
        excerpt: `${chapter.title} ${topicLabels.join(" ")}`.trim(),
        href: `/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`
      });
    }
  }
  return results;
}

export { getDisplayNovelTitle, getNovelSummary } from "@/lib/content/novel-display";
