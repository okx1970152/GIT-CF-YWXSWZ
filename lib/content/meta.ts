import { getIndexNovel } from "@/lib/content/content-index";

export type NovelMeta = {
  title?: string;
  slug?: string;
  category?: string;
  summary?: string;
  status?: string;
  featured?: boolean;
  chapter_count?: number;
  updated_at?: string;
  tags?: string[];
};

export type ChapterMeta = {
  chapter_code?: string;
  chapter_slug?: string;
  chapter_title_en?: string;
  chapter_keywords?: string[];
  chapter_seo_title?: string;
  chapter_meta_description?: string;
  updated_at?: string;
};

export function getNovelMeta(categorySlug: string, novelId: string): NovelMeta | null {
  const novel = getIndexNovel(categorySlug, novelId);
  return (novel?.metaNovel as NovelMeta | null) ?? null;
}

export function getChapterMetaByNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): ChapterMeta | null {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return null;
  return (novel.chapterMetaByChapterNo[chapterNo] as ChapterMeta | undefined) ?? null;
}

