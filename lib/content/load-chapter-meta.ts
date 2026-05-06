import "server-only";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { padChapterNo } from "@/lib/content/chapter-utils";
import { getMetaDir } from "@/lib/content/paths";
import { toAbsoluteUrl } from "@/lib/seo";
import type { ChapterMeta } from "@/lib/content/meta";

const META_LRU_MAX = 500;
const metaLru = new Map<string, ChapterMeta | null>();

function lruGet(key: string): ChapterMeta | null | undefined {
  if (!metaLru.has(key)) return undefined;
  const v = metaLru.get(key)!;
  metaLru.delete(key);
  metaLru.set(key, v);
  return v;
}

function lruSet(key: string, value: ChapterMeta | null): void {
  if (metaLru.has(key)) metaLru.delete(key);
  metaLru.set(key, value);
  while (metaLru.size > META_LRU_MAX) {
    const first = metaLru.keys().next().value as string;
    metaLru.delete(first);
  }
}

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

async function fetchChapterMetaFromAssets(relPath: string): Promise<ChapterMeta | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return null;
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://workers-assets.internal";
    const url = `${base}${relPath.startsWith("/") ? relPath : `/${relPath}`}`;
    const res = await assets.fetch(new Request(url));
    if (!res.ok) return null;
    return (await res.json()) as ChapterMeta;
  } catch {
    return null;
  }
}

async function fetchChapterMetaFromHttp(relPath: string): Promise<ChapterMeta | null> {
  const url = toAbsoluteUrl(relPath);
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return (await res.json()) as ChapterMeta;
}

function chapterMetaFileName(chapterNo: string): string {
  return `${padChapterNo(chapterNo)}.json`;
}

async function loadChapterMetaUncached(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): Promise<ChapterMeta | null> {
  const fileName = chapterMetaFileName(chapterNo);
  const rel = `/__novel_meta__/${encodeURIComponent(categorySlug)}/${encodeURIComponent(novelId)}/${encodeURIComponent(fileName)}`;

  const publicPath = path.join(
    process.cwd(),
    "public",
    "__novel_meta__",
    categorySlug,
    novelId,
    fileName
  );
  const sourcePath = path.join(getMetaDir(categorySlug, novelId), fileName);

  try {
    if (existsSync(publicPath)) {
      const raw = await readFile(publicPath, "utf8");
      return JSON.parse(raw) as ChapterMeta;
    }
  } catch {
    /* continue */
  }

  try {
    if (existsSync(sourcePath)) {
      const raw = await readFile(sourcePath, "utf8");
      return JSON.parse(raw) as ChapterMeta;
    }
  } catch {
    /* continue */
  }

  try {
    const fromAssets = await fetchChapterMetaFromAssets(rel);
    if (fromAssets) return fromAssets;
  } catch {
    /* continue */
  }

  try {
    return await fetchChapterMetaFromHttp(rel);
  } catch {
    return null;
  }
}

/**
 * 单章 meta：Worker 上从 public/__novel_meta__（ASSETS）或 novels/meta 读取；React cache + LRU 减轻重复解析。
 */
export const loadChapterMetaCached = cache(async (categorySlug: string, novelId: string, chapterNo: string) => {
  const key = `${categorySlug}/${novelId}/${padChapterNo(chapterNo)}`;
  const hit = lruGet(key);
  if (hit !== undefined) return hit;

  const loaded = await loadChapterMetaUncached(categorySlug, novelId, chapterNo);
  lruSet(key, loaded);
  return loaded;
});
