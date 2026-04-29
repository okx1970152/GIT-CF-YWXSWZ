import fs from "node:fs";
import path from "node:path";
import { getMetaDir } from "@/lib/content/paths";

export type NovelMeta = {
  title?: string;
  slug?: string;
  category?: string;
  summary?: string;
  status?: string;
  featured?: boolean;
  chapter_count?: number;
  updated_at?: string;
  tags?: string[];
};

export type ChapterMeta = {
  chapter_code?: string;
  chapter_slug?: string;
  chapter_title_en?: string;
  chapter_keywords?: string[];
  chapter_seo_title?: string;
  chapter_meta_description?: string;
  updated_at?: string;
};

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getNovelMeta(categorySlug: string, novelId: string): NovelMeta | null {
  const metaDir = getMetaDir(categorySlug, novelId);
  return readJson<NovelMeta>(path.join(metaDir, "novel.json"));
}

export function getChapterMetaByNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): ChapterMeta | null {
  const metaDir = getMetaDir(categorySlug, novelId);
  if (!fs.existsSync(metaDir)) return null;
  const prefix = `${chapterNo}-`;
  const target = fs.readdirSync(metaDir).find((f) => f.startsWith(prefix) && f.endsWith(".json"));
  if (!target) return null;
  return readJson<ChapterMeta>(path.join(metaDir, target));
}

