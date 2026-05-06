import { padChapterNo } from "@/lib/content/chapter-utils";
import { getIndexNovel } from "@/lib/content/content-index";
import { loadChapterMetaCached } from "@/lib/content/load-chapter-meta";

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
  /** 百科释义（生产端 lore_pipeline 写入；维基页 / Schema 可用） */
  definition?: string;
  /** 与 id 相同时可省略；预留与导读 DOM id 对齐 */
  guide_section_id?: string;
};

/** 章节 Cultural Notes → FAQPage 数据源（生产端 meta 可选写入） */
export type CulturalNotesFaqItem = {
  q: string;
  a: string;
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
  cultural_notes_faq?: CulturalNotesFaqItem[];
};

export function getNovelMeta(categorySlug: string, novelId: string): NovelMeta | null {
  const novel = getIndexNovel(categorySlug, novelId);
  return (novel?.metaNovel as NovelMeta | null) ?? null;
}

/**
 * 全局 content-index 中的章节 meta 仅保留搜索用轻量字段（见 generate-content-index 的 slim）。
 * 用于 getSearchIndex 等，避免为搜索拉整份 meta JSON。
 */
export function getChapterSearchHintsFromIndex(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): { chapter_keywords?: string[]; guide_tags?: string[] } {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return {};
  const padded = padChapterNo(chapterNo);
  const raw =
    (novel.chapterMetaByChapterNo[padded] as Record<string, unknown> | undefined) ??
    (novel.chapterMetaByChapterNo[chapterNo] as Record<string, unknown> | undefined);
  if (!raw || typeof raw !== "object") return {};

  const chapter_keywords = Array.isArray(raw.chapter_keywords)
    ? (raw.chapter_keywords as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : undefined;
  const guide_tags = Array.isArray(raw.guide_tags)
    ? (raw.guide_tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : undefined;

  const out: { chapter_keywords?: string[]; guide_tags?: string[] } = {};
  if (chapter_keywords?.length) out.chapter_keywords = chapter_keywords;
  if (guide_tags?.length) out.guide_tags = guide_tags;
  return out;
}

/** 完整章节 meta：运行时读 meta/NNNN.json（ASSETS / fs），勿从全局索引取重型字段。 */
export async function getChapterMetaByNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): Promise<ChapterMeta | null> {
  return loadChapterMetaCached(categorySlug, novelId, chapterNo);
}
