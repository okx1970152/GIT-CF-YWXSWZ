import { getIndexCategories, getIndexNovel, getIndexNovelsByCategory } from "@/lib/content/content-index";
import { novelInfoSchema, type NovelInfo } from "@/lib/content/schema";
import { getChapters } from "@/lib/content/chapters";
import { getAnnotationIndexEntry } from "@/lib/content/annotation-index";
import { mergeGuideTopicLists } from "@/lib/content/guide-topics";
import { getChapterMetaByNo, getNovelMeta } from "@/lib/content/meta";
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

function looksLikeMostlyCjk(input: string): boolean {
  if (!input.trim()) return false;
  const cjk = (input.match(/[\u3400-\u9fff]/g) || []).length;
  return cjk >= Math.max(1, Math.floor(input.length / 3));
}

export function getDisplayNovelTitle(novel: NovelInfo): string {
  const titleEn = novel.title_en?.trim();
  if (titleEn) return titleEn;
  if (!looksLikeMostlyCjk(novel.title)) return novel.title;
  return novel.novelId
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function getNovelSummary(novel: NovelInfo): string {
  const summary = novel.summary?.trim();
  if (summary) return summary;
  const desc = novel.desc?.trim();
  if (desc) return desc;
  return `${getDisplayNovelTitle(novel)} is an ongoing web novel.`;
}

export type SearchResult = {
  type: "novel" | "chapter";
  title: string;
  excerpt: string;
  href: string;
};

export function getSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const novel of getAllNovels()) {
    results.push({
      type: "novel",
      title: novel.title,
      excerpt: `${novel.author} - ${getNovelSummary(novel)}`,
      href: `/novels/${novel.categorySlug}/${novel.novelId}`
    });

    for (const chapter of getChapters(novel.categorySlug, novel.novelId)) {
      const guide = getAnnotationIndexEntry(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const chapterMeta = getChapterMetaByNo(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const topicLabels = mergeGuideTopicLists(
        [...(guide?.relatedTopics ?? []), ...(chapterMeta?.chapter_keywords ?? [])],
        chapterMeta?.guide_tags ?? []
      );
      const metaDesc = chapterMeta?.chapter_meta_description?.trim() || "";

      results.push({
        type: "chapter",
        title: `${chapter.title} (${chapter.chapterNo})`,
        excerpt: `${metaDesc} ${chapter.title} ${topicLabels.join(" ")}`.trim(),
        href: `/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`
      });
    }
  }
  return results;
}
