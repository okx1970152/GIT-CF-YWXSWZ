import { getIndexNovel } from "@/lib/content/content-index";

export type ChapterItem = {
  chapterNo: string;
  slug: string;
  title: string;
  content: string;
  publishedAt?: string;
  updatedAt?: string;
  fileName: string;
};

export function padChapterNo(input: number | string): string {
  const value = typeof input === "number" ? input.toString() : input;
  return value.padStart(4, "0");
}

export function parseChapterFileName(filename: string): { chapterNo: string; slug: string } {
  const chapterNo = filename.slice(0, 4);
  const slug = filename.replace(/^\d{4}-/, "").replace(/\.md$/, "");
  return { chapterNo, slug };
}

export function getChapters(categorySlug: string, novelId: string): ChapterItem[] {
  const novel = getIndexNovel(categorySlug, novelId);
  if (!novel) return [];
  return [...novel.chapters]
    .sort((a, b) => a.chapterNo.localeCompare(b.chapterNo))
    .map((c) => ({
      chapterNo: c.chapterNo,
      slug: c.slug,
      title: c.title,
      content: c.content,
      publishedAt: c.publishedAt || undefined,
      updatedAt: c.updatedAt || undefined,
      fileName: c.fileName,
    }));
}

export function getChapter(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): ChapterItem | null {
  const target = padChapterNo(chapterNo);
  const chapter = getChapters(categorySlug, novelId).find((item) => item.chapterNo === target);
  return chapter || null;
}

export function getAdjacentChapters(categorySlug: string, novelId: string, chapterNo: string): {
  prev: string | null;
  next: string | null;
} {
  const current = Number.parseInt(chapterNo, 10);
  const prevNo = Number.isNaN(current) ? null : padChapterNo(current - 1);
  const nextNo = Number.isNaN(current) ? null : padChapterNo(current + 1);
  const all = new Set(getChapters(categorySlug, novelId).map((item) => item.chapterNo));

  return {
    prev: prevNo && all.has(prevNo) ? prevNo : null,
    next: nextNo && all.has(nextNo) ? nextNo : null
  };
}
