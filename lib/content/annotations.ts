import { getIndexNovel } from "@/lib/content/content-index";

export type AnnotationItem = {
  chapterNo: string;
  title: string;
  content: string;
  relatedTopics: string[];
};

export function getAnnotationByChapterNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): AnnotationItem | null {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return null;
  const item = novel.annotationsByChapterNo[chapterNo];
  if (!item) return null;
  return { ...item };
}
