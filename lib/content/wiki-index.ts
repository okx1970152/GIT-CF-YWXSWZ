import "server-only";
import fs from "fs";
import path from "path";
import { getDisplayNovelTitle } from "@/lib/content/novel-display";
import { getNovel } from "@/lib/content/novels";

export type WikiEntryRecord = {
  id: string;
  displayTitle: string;
  surfaces: string[];
  definition: string;
  chapterNos: string[];
};

export type WikiNovelBucket = {
  categorySlug: string;
  entries: Record<string, WikiEntryRecord>;
};

export type WikiIndexData = {
  version: number;
  generatedAt: string;
  novels: Record<string, WikiNovelBucket>;
};

let wikiCache: WikiIndexData | null = null;

/** Worker 冷启动时由 instrumentation 从 ASSETS 预载。 */
export function primeWikiIndexCache(snapshot: WikiIndexData): void {
  wikiCache = snapshot;
}

export function isWikiIndexPrimed(): boolean {
  return wikiCache !== null;
}

/**
 * 运行时读取 wiki-index.json（勿静态 import JSON），避免 Worker bundle 内联整份维基索引。
 * 与 content-index 相同：Worker 依赖 ASSETS 预载；本地可读 data/ 或 public/__site_data__/。
 */
function loadWikiIndexData(): WikiIndexData {
  if (wikiCache) return wikiCache;
  const candidates = [
    path.join(process.cwd(), "data", "wiki-index.json"),
    path.join(process.cwd(), "public", "__site_data__", "wiki-index.json")
  ];
  let raw: string | null = null;
  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        raw = fs.readFileSync(filePath, "utf8");
        break;
      }
    } catch {
      /* 同上 */
    }
  }
  if (!raw) {
    throw new Error(
      "wiki_index_not_loaded: run copy-site-index before build, deploy ASSETS, and await ensureWikiIndex() before any getWiki* / getWikiIndexSnapshot()."
    );
  }
  wikiCache = JSON.parse(raw) as WikiIndexData;
  return wikiCache;
}

/** 供 sitemap 等需要整棵维基索引的调用方 */
export function getWikiIndexSnapshot(): WikiIndexData {
  return loadWikiIndexData();
}

/** 正文只对在此集合中的 lore id 包 wiki 链接，避免 404 */
export function getWikiLinkedIdsForNovel(novelId: string): Set<string> {
  const wikiIndex = loadWikiIndexData();
  const bucket = wikiIndex.novels[novelId];
  if (!bucket?.entries) return new Set();
  return new Set(Object.keys(bucket.entries));
}

export function getWikiNovelBucket(novelId: string): WikiNovelBucket | null {
  return loadWikiIndexData().novels[novelId] ?? null;
}

export function getWikiEntry(novelId: string, loreId: string): WikiEntryRecord | null {
  const wikiIndex = loadWikiIndexData();
  const bucket = wikiIndex.novels[novelId];
  return bucket?.entries[loreId] ?? null;
}

/** SSG：所有有条目的 (novelId, id) */
export function getWikiTermStaticParams(): { novelId: string; id: string }[] {
  const wikiIndex = loadWikiIndexData();
  const out: { novelId: string; id: string }[] = [];
  for (const novelId of Object.keys(wikiIndex.novels)) {
    const entries = wikiIndex.novels[novelId]?.entries ?? {};
    for (const id of Object.keys(entries)) {
      out.push({ novelId, id });
    }
  }
  return out;
}

/** 有条目的 novelId 列表（排序） */
export function getWikiNovelIdsSorted(): string[] {
  return Object.keys(loadWikiIndexData().novels).sort((a, b) => a.localeCompare(b));
}

export function listWikiEntriesForNovel(novelId: string): WikiEntryRecord[] {
  const bucket = loadWikiIndexData().novels[novelId];
  if (!bucket?.entries) return [];
  return Object.values(bucket.entries).sort((a, b) =>
    a.displayTitle.localeCompare(b.displayTitle, "en")
  );
}

/** 导航展示用：书名优先取站点 NovelInfo */
export function getWikiNovelDisplayLabel(categorySlug: string, novelId: string): string {
  const novel = getNovel(categorySlug, novelId);
  if (novel) return getDisplayNovelTitle(novel);
  return novelId;
}
