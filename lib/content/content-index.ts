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

/** Worker 冷启动时由 instrumentation 从 ASSETS 预载，避免对 data/ 使用 fs。 */
export function primeContentIndexCache(snapshot: ContentIndexRoot): void {
  indexCache = snapshot;
}

export function isContentIndexPrimed(): boolean {
  return indexCache !== null;
}

/**
 * 运行时读取 content-index.json（勿静态 import JSON），避免 OpenNext Worker bundle 内联整份索引。
 * Cloudflare Worker 上无可靠 Node fs：依赖 `public/__site_data__/` + instrumentation 预载；
 * 本地 / Node 仍可读 `data/` 或 `public/__site_data__/`。
 */
function loadContentIndexRoot(): ContentIndexRoot {
  if (indexCache) return indexCache;
  const candidates = [
    path.join(process.cwd(), "data", "content-index.json"),
    path.join(process.cwd(), "public", "__site_data__", "content-index.json")
  ];
  let raw: string | null = null;
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        raw = fs.readFileSync(filePath, "utf8");
        break;
      }
    } catch {
      /* Worker 上 existsSync/readFileSync 常不可用，继续尝试 */
    }
  }
  if (!raw) {
    throw new Error(
      "content_index_unavailable: set up public/__site_data__/content-index.json and ASSETS preload (instrumentation), or run copy-site-index before deploy."
    );
  }
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

