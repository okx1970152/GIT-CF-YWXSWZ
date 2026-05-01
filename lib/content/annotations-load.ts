import type { AnnotationItem } from "@/lib/content/annotations-types";
import { getAnnotationIndexEntry } from "@/lib/content/annotation-index";
import { loadAnnotationMarkdownCached } from "@/lib/content/load-markdown";

/** 仅服务端/Server Component 使用：从磁盘读取导读 markdown */
export async function loadAnnotationByChapterNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): Promise<AnnotationItem | null> {
  const meta = getAnnotationIndexEntry(categorySlug, novelId, chapterNo);
  if (!meta) return null;
  const loaded = await loadAnnotationMarkdownCached(categorySlug, novelId, meta.fileName);
  return {
    chapterNo: meta.chapterNo,
    title: meta.title,
    relatedTopics: meta.relatedTopics,
    content: loaded.body
  };
}
