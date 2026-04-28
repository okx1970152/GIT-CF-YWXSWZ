import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NOVELS_ROOT, getNovelInfoPath } from "@/lib/content/paths";
import { novelInfoSchema, type NovelInfo } from "@/lib/content/schema";
import { getChapters } from "@/lib/content/chapters";
import { getAnnotationByChapterNo } from "@/lib/content/annotations";

export function getAllCategories(): string[] {
  if (!fs.existsSync(NOVELS_ROOT)) return [];
  return fs
    .readdirSync(NOVELS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getNovelsByCategory(categorySlug: string): NovelInfo[] {
  const categoryDir = path.join(NOVELS_ROOT, categorySlug);
  if (!fs.existsSync(categoryDir)) return [];

  return fs
    .readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => getNovel(categorySlug, entry.name))
    .filter((item): item is NovelInfo => item !== null);
}

export function getAllNovels(): NovelInfo[] {
  return getAllCategories().flatMap((category) => getNovelsByCategory(category));
}

/** Hot rail: novels marked hot; falls back to featured; then all. */
export function getHotNovels(): NovelInfo[] {
  const all = getAllNovels();
  const hot = all.filter((n) => n.hot);
  if (hot.length > 0) return hot;
  const featured = all.filter((n) => n.featured);
  if (featured.length > 0) return featured;
  return all;
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
  const infoPath = getNovelInfoPath(categorySlug, novelId);
  if (!fs.existsSync(infoPath)) return null;

  const raw = fs.readFileSync(infoPath, "utf8");
  const { data } = matter(raw);
  const parsed = novelInfoSchema.parse(data);

  return {
    ...parsed,
    categorySlug,
    novelId
  };
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
      excerpt: `${novel.author} - ${novel.desc}`,
      href: `/novels/${novel.categorySlug}/${novel.novelId}`
    });

    for (const chapter of getChapters(novel.categorySlug, novel.novelId)) {
      const guide = getAnnotationByChapterNo(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const topics = guide?.relatedTopics.join(" ") || "";

      results.push({
        type: "chapter",
        title: `${chapter.title} (${chapter.chapterNo})`,
        excerpt: `${chapter.content.slice(0, 120)} ${topics}`.trim(),
        href: `/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`
      });
    }
  }
  return results;
}
