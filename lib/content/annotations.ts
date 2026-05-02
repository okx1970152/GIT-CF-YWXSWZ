/**
 * 仅导出类型与「运行时读盘」的加载函数。
 * `getAnnotationIndexEntry` 在 `annotation-index.ts`，避免与 `novels.ts` 同链时把 Node fs 打进客户端包。
 */
export type { AnnotationItem } from "@/lib/content/annotations-types";
export { loadAnnotationByChapterNo } from "@/lib/content/annotations-load";
