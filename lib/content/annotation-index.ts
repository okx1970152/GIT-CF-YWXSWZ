import { getIndexNovel } from "@/lib/content/content-index";
import type { ContentIndexAnnotation } from "@/lib/content/content-index";

/** 仅从 content-index 取导读元数据（索引由服务端 fs 加载），可供客户端组件间接依赖的模块链使用 */
export function getAnnotationIndexEntry(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): ContentIndexAnnotation | null {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return null;
  return novel.annotationsByChapterNo[chapterNo] ?? null;
}
