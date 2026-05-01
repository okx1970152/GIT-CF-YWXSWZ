import { getIndexNovel } from "@/lib/content/content-index";
import type { ContentIndexAnnotation } from "@/lib/content/content-index";
import { loadAnnotationMarkdownCached } from "@/lib/content/load-markdown";

export type AnnotationItem = {
  chapterNo: string;
  title: string;
  content: string;
  relatedTopics: string[];
};

export function getAnnotationIndexEntry(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): ContentIndexAnnotation | null {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return null;
  return novel.annotationsByChapterNo[chapterNo] ?? null;
}

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
