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
  /** 榜单/排序权重；正数时优先于 info/index.md 的 ranking */
  ranking?: number;
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

/** 正文 hover / 导读节锚点（由生产端 meta/<chapter>.json 写入） */
export type LoreAnchor = {
  id: string;
  surfaces: string[];
  /** 与 id 相同时可省略；预留与导读 DOM id 对齐 */
  guide_section_id?: string;
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
  lore_anchors?: LoreAnchor[];
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

