import "server-only";
import fs from "fs";
import path from "path";

export type ContentIndexChapter = {
  chapterNo: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  updatedAt: string | null;
  /** 正文词数（来自 frontmatter word_count 或由正文估算） */
  wordCount: number;
  fileName: string;
};

export type ContentIndexAnnotation = {
  chapterNo: string;
  title: string;
  relatedTopics: string[];
  /** 原始导读文件名（用于运行时读取 markdown，避免把正文打进索引 JSON） */
  fileName: string;
};

export type ContentIndexNovel = {
  categorySlug: string;
  novelId: string;
  frontmatter: Record<string, unknown>;
  metaNovel: Record<string, unknown> | null;
  chapters: ContentIndexChapter[];
  annotationsByChapterNo: Record<string, ContentIndexAnnotation>;
  chapterMetaByChapterNo: Record<string, Record<string, unknown>>;
};

export type ContentIndexRoot = {
  version: number;
  generatedAt: string;
  categories: Array<{ slug: string; novels: ContentIndexNovel[] }>;
};

let indexCache: ContentIndexRoot | null = null;

/**
 * 运行时读取 content-index.json（勿静态 import JSON），避免 OpenNext Worker bundle 内联整份索引。
 * 依赖 next.config outputFileTracingIncludes 在部署物中包含该文件。
 */
function loadContentIndexRoot(): ContentIndexRoot {
  if (indexCache) return indexCache;
  const filePath = path.join(process.cwd(), "data", "content-index.json");
  const raw = fs.readFileSync(filePath, "utf8");
  indexCache = JSON.parse(raw) as ContentIndexRoot;
  return indexCache;
}

/** 供 sitemap 等需要整棵索引树的调用方 */
export function getContentIndexSnapshot(): ContentIndexRoot {
  return loadContentIndexRoot();
}

export function getIndexCategories(): string[] {
  return loadContentIndexRoot().categories.map((c) => c.slug);
}

export function getIndexNovelsByCategory(categorySlug: string): ContentIndexNovel[] {
  return loadContentIndexRoot().categories.find((c) => c.slug === categorySlug)?.novels ?? [];
}

export function getIndexNovel(categorySlug: string, novelId: string): ContentIndexNovel | null {
  return getIndexNovelsByCategory(categorySlug).find((n) => n.novelId === novelId) ?? null;
}

export function getAllIndexNovels(): ContentIndexNovel[] {
  return loadContentIndexRoot().categories.flatMap((c) => c.novels);
}

