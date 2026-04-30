import { getIndexNovel } from "@/lib/content/content-index";

export type NovelMeta = {
  title?: string;
  title_en?: string;
  slug?: string;
  category?: string;
  summary?: string;
  status?: string;
  featured?: boolean;
  /** 与 info/index.md hot 对齐（可选） */
  hot?: boolean;
  keywords?: string[];
  seo_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
  chapter_count?: number;
  updated_at?: string;
  tags?: string[];
};

export type ChapterMeta = {
  /** 与 chapter_code 同义，章节 JSON 内显式写入 */
  chapter_no?: string;
  chapter_code?: string;
  chapter_slug?: string;
  chapter_title_en?: string;
  chapter_keywords?: string[];
  guide_tags?: string[];
  chapter_seo_title?: string;
  chapter_meta_description?: string;
  og_title?: string;
  og_description?: string;
  twitter_title?: string;
  twitter_description?: string;
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

