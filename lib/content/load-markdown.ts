import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { getAnnotationsDir, getChaptersDir } from "@/lib/content/paths";

export type LoadedMarkdown = {
  body: string;
  data: Record<string, unknown>;
};

async function readMarkdownFile(absolutePath: string): Promise<LoadedMarkdown> {
  if (!existsSync(absolutePath)) {
    throw new Error(`markdown_missing:${absolutePath}`);
  }
  const raw = await readFile(absolutePath, "utf8");
  const { data, content } = matter(raw);
  return { body: content, data: (data ?? {}) as Record<string, unknown> };
}

export const loadChapterMarkdownCached = cache(async (categorySlug: string, novelId: string, fileName: string) => {
  const filePath = path.join(getChaptersDir(categorySlug, novelId), fileName);
  return readMarkdownFile(filePath);
});

export const loadAnnotationMarkdownCached = cache(
  async (categorySlug: string, novelId: string, fileName: string) => {
    const filePath = path.join(getAnnotationsDir(categorySlug, novelId), fileName);
    return readMarkdownFile(filePath);
  }
);
