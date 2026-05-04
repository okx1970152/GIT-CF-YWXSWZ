import type { ChapterMeta } from "@/lib/content/meta";

/** 分享/OG 用较短章节标题：优先 meta.chapter_title_en，否则用章节 md 标题。 */
export function buildChapterShareTitle(
  chapterTitle: string,
  displayNovelTitle: string,
  chapterMeta: ChapterMeta | null
): string {
  const en = chapterMeta?.chapter_title_en?.trim();
  const chapterPart = en || chapterTitle;
  return `${chapterPart} - ${displayNovelTitle}`;
}
