import contentIndex from "@/data/content-index.json";

export type ContentIndexChapter = {
  chapterNo: string;
  slug: string;
  title: string;
  content: string;
  publishedAt: string | null;
  updatedAt: string | null;
  /** 正文词数（来自 frontmatter word_count 或由正文估算） */
  wordCount: number;
  fileName: string;
};

export type ContentIndexAnnotation = {
  chapterNo: string;
  title: string;
  content: string;
  relatedTopics: string[];
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

type ContentIndexShape = {
  version: number;
  generatedAt: string;
  categories: Array<{ slug: string; novels: ContentIndexNovel[] }>;
};

const indexData = contentIndex as ContentIndexShape;

export function getIndexCategories(): string[] {
  return indexData.categories.map((c) => c.slug);
}

export function getIndexNovelsByCategory(categorySlug: string): ContentIndexNovel[] {
  return indexData.categories.find((c) => c.slug === categorySlug)?.novels ?? [];
}

export function getIndexNovel(categorySlug: string, novelId: string): ContentIndexNovel | null {
  return getIndexNovelsByCategory(categorySlug).find((n) => n.novelId === novelId) ?? null;
}

export function getAllIndexNovels(): ContentIndexNovel[] {
  return indexData.categories.flatMap((c) => c.novels);
}

