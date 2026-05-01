import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cache } from "react";
import { getAnnotationsDir, getChaptersDir } from "@/lib/content/paths";
import { toAbsoluteUrl } from "@/lib/seo";

export type LoadedMarkdown = {
  body: string;
  data: Record<string, unknown>;
};

async function parseRaw(raw: string): Promise<LoadedMarkdown> {
  const { data, content } = matter(raw);
  return { body: content, data: (data ?? {}) as Record<string, unknown> };
}

async function readMarkdownFile(absolutePath: string): Promise<LoadedMarkdown> {
  const raw = await readFile(absolutePath, "utf8");
  return parseRaw(raw);
}

/**
 * Cloudflare Worker 上通常无法访问构建机里的 `novels/` 目录；构建时会把 md 复制到
 * `public/__novel_md__/**`，随 ASSETS 下发。运行时通过同源 fetch 读取。
 */
async function fetchMarkdownFromPublicAsset(
  kind: "chapters" | "annotations",
  categorySlug: string,
  novelId: string,
  fileName: string
): Promise<LoadedMarkdown> {
  const rel = `/__novel_md__/${encodeURIComponent(categorySlug)}/${encodeURIComponent(novelId)}/${kind}/${encodeURIComponent(fileName)}`;
  const url = toAbsoluteUrl(rel);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`markdown_fetch_failed:${res.status}:${url}`);
  }
  const raw = await res.text();
  return parseRaw(raw);
}

async function loadMarkdownForKind(
  kind: "chapters" | "annotations",
  categorySlug: string,
  novelId: string,
  fileName: string
): Promise<LoadedMarkdown> {
  const publicPath = path.join(
    process.cwd(),
    "public",
    "__novel_md__",
    categorySlug,
    novelId,
    kind,
    fileName
  );
  const sourcePath = path.join(
    kind === "chapters" ? getChaptersDir(categorySlug, novelId) : getAnnotationsDir(categorySlug, novelId),
    fileName
  );

  try {
    if (existsSync(publicPath)) {
      return await readMarkdownFile(publicPath);
    }
  } catch {
    /* Worker 上 existsSync 行为可能异常，继续尝试其它路径 */
  }

  try {
    if (existsSync(sourcePath)) {
      return await readMarkdownFile(sourcePath);
    }
  } catch {
    /* 同上 */
  }

  return fetchMarkdownFromPublicAsset(kind, categorySlug, novelId, fileName);
}

export const loadChapterMarkdownCached = cache(async (categorySlug: string, novelId: string, fileName: string) => {
  return loadMarkdownForKind("chapters", categorySlug, novelId, fileName);
});

export const loadAnnotationMarkdownCached = cache(
  async (categorySlug: string, novelId: string, fileName: string) => {
    return loadMarkdownForKind("annotations", categorySlug, novelId, fileName);
  }
);
