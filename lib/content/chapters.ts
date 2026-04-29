import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getChaptersDir } from "@/lib/content/paths";
import { chapterSchema, type ChapterFrontmatter } from "@/lib/content/schema";

const CHAPTER_FILE_PATTERN = /^\d{4}-[A-Za-z0-9-]+\.md$/;

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
  if (!CHAPTER_FILE_PATTERN.test(filename)) {
    throw new Error(`Invalid chapter filename: ${filename}`);
  }
  const chapterNo = filename.slice(0, 4);
  const slug = filename.replace(/^\d{4}-/, "").replace(/\.md$/, "");
  return { chapterNo, slug };
}

function readChapterFile(filePath: string): ChapterItem {
  const fileName = path.basename(filePath);
  const { chapterNo, slug } = parseChapterFileName(fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const meta = chapterSchema.parse(data) as ChapterFrontmatter;

  return {
    chapterNo,
    slug,
    title: meta.title,
    content,
    publishedAt: meta.published_at,
    updatedAt: meta.updated_at,
    fileName
  };
}

export function getChapters(categorySlug: string, novelId: string): ChapterItem[] {
  const dir = getChaptersDir(categorySlug, novelId);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((name) => readChapterFile(path.join(dir, name)));
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
