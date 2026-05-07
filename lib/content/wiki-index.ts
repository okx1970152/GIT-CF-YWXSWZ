import "server-only";
import fs from "fs";
import path from "path";
import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDisplayNovelTitle } from "@/lib/content/novel-display";
import { getNovel } from "@/lib/content/novels";
import { toAbsoluteUrl } from "@/lib/seo";

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

/** 与 data/wiki-manifest.json 对齐 */
export type WikiManifest = {
  version: number;
  generatedAt: string;
  novels: Record<string, { categorySlug: string; termIds: string[] }>;
};

let wikiManifestCache: WikiManifest | null = null;

const SHARD_LRU_MAX = 64;
const shardLru = new Map<string, WikiNovelBucket | null>();
const inflightShards = new Map<string, Promise<WikiNovelBucket | null>>();

function lruShardGet(key: string): WikiNovelBucket | null | undefined {
  if (!shardLru.has(key)) return undefined;
  const v = shardLru.get(key)!;
  shardLru.delete(key);
  shardLru.set(key, v);
  return v;
}

function lruShardSet(key: string, value: WikiNovelBucket | null): void {
  if (shardLru.has(key)) shardLru.delete(key);
  shardLru.set(key, value);
  while (shardLru.size > SHARD_LRU_MAX) {
    const first = shardLru.keys().next().value as string;
    shardLru.delete(first);
  }
}

export function primeWikiIndexCache(manifest: WikiManifest): void {
  wikiManifestCache = manifest;
}

export function isWikiIndexPrimed(): boolean {
  return wikiManifestCache !== null;
}

function getWikiManifestOrThrow(): WikiManifest {
  if (!wikiManifestCache) {
    throw new Error(
      "wiki_manifest_not_loaded: run copy-site-index before build, deploy ASSETS, and await ensureWikiIndex() before getWiki*."
    );
  }
  return wikiManifestCache;
}

export function getWikiManifest(): WikiManifest {
  return getWikiManifestOrThrow();
}

/** @deprecated 单体 wiki-index 已拆分为 manifest + shards；sitemap 等请用 getWikiManifest。 */
export function getWikiIndexSnapshot(): WikiManifest {
  return getWikiManifestOrThrow();
}

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

async function fetchShardFromAssets(relPath: string): Promise<WikiNovelBucket | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return null;
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://workers-assets.internal";
    const url = `${base}${relPath.startsWith("/") ? relPath : `/${relPath}`}`;
    const res = await assets.fetch(new Request(url));
    if (!res.ok) return null;
    const data = (await res.json()) as { categorySlug?: string; entries?: Record<string, WikiEntryRecord> };
    if (!data?.categorySlug || !data.entries) return null;
    return { categorySlug: data.categorySlug, entries: data.entries };
  } catch {
    return null;
  }
}

async function fetchShardFromHttp(relPath: string): Promise<WikiNovelBucket | null> {
  try {
    const url = toAbsoluteUrl(relPath);
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { categorySlug?: string; entries?: Record<string, WikiEntryRecord> };
    if (!data?.categorySlug || !data.entries) return null;
    return { categorySlug: data.categorySlug, entries: data.entries };
  } catch {
    return null;
  }
}

async function loadWikiNovelShardUncached(novelId: string): Promise<WikiNovelBucket | null> {
  const man = getWikiManifestOrThrow();
  if (!man.novels[novelId]) return null;

  const name = `${novelId}.json`;
  const rel = `/__site_data__/wiki/novels/${encodeURIComponent(novelId)}.json`;

  const publicPath = path.join(process.cwd(), "public", "__site_data__", "wiki", "novels", name);
  const dataPath = path.join(process.cwd(), "data", "wiki", "novels", name);

  try {
    if (fs.existsSync(publicPath)) {
      const raw = fs.readFileSync(publicPath, "utf8");
      const data = JSON.parse(raw) as { categorySlug?: string; entries?: Record<string, WikiEntryRecord> };
      if (data?.categorySlug && data.entries) {
        return { categorySlug: data.categorySlug, entries: data.entries };
      }
    }
  } catch {
    /* continue */
  }

  try {
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, "utf8");
      const data = JSON.parse(raw) as { categorySlug?: string; entries?: Record<string, WikiEntryRecord> };
      if (data?.categorySlug && data.entries) {
        return { categorySlug: data.categorySlug, entries: data.entries };
      }
    }
  } catch {
    /* continue */
  }

  const fromAssets = await fetchShardFromAssets(rel);
  if (fromAssets) return fromAssets;

  return fetchShardFromHttp(rel);
}

/**
 * 单书词条：只 parse 该书的 shard JSON，避免整库维基一次 parse（Worker 1102）。
 */
export const loadWikiNovelShard = cache(async (novelId: string): Promise<WikiNovelBucket | null> => {
  const mem = lruShardGet(novelId);
  if (mem !== undefined) return mem;

  let p = inflightShards.get(novelId);
  if (!p) {
    p = (async () => {
      const loaded = await loadWikiNovelShardUncached(novelId);
      lruShardSet(novelId, loaded);
      return loaded;
    })().finally(() => {
      inflightShards.delete(novelId);
    });
    inflightShards.set(novelId, p);
  }

  return p;
});

/** 正文 lore 链接白名单：与同书 shard 中的词条 id 对齐 */
export async function getWikiLinkedIdsForNovel(novelId: string): Promise<Set<string>> {
  const bucket = await loadWikiNovelShard(novelId);
  if (!bucket?.entries) return new Set();
  return new Set(Object.keys(bucket.entries));
}

export async function getWikiNovelBucket(novelId: string): Promise<WikiNovelBucket | null> {
  return loadWikiNovelShard(novelId);
}

export async function getWikiEntry(novelId: string, loreId: string): Promise<WikiEntryRecord | null> {
  const bucket = await loadWikiNovelShard(novelId);
  return bucket?.entries[loreId] ?? null;
}

/** SSG：所有有条目的 (novelId, id)，来自 manifest，无需加载 shard */
export async function getWikiTermStaticParams(): Promise<{ novelId: string; id: string }[]> {
  const man = getWikiManifestOrThrow();
  const out: { novelId: string; id: string }[] = [];
  for (const novelId of Object.keys(man.novels)) {
    const termIds = man.novels[novelId]?.termIds ?? [];
    for (const id of termIds) {
      out.push({ novelId, id });
    }
  }
  return out;
}

export function getWikiNovelIdsSorted(): string[] {
  return Object.keys(getWikiManifestOrThrow().novels).sort((a, b) => a.localeCompare(b));
}

export async function listWikiEntriesForNovel(novelId: string): Promise<WikiEntryRecord[]> {
  const bucket = await loadWikiNovelShard(novelId);
  if (!bucket?.entries) return [];
  return Object.values(bucket.entries).sort((a, b) => a.displayTitle.localeCompare(b.displayTitle, "en"));
}

/**
 * /wiki 枢纽：每本书条数与 categorySlug 均来自 manifest，不拉整本 shard。
 */
export function getWikiHubNovelSummaries(): Array<{
  novelId: string;
  categorySlug: string;
  termCount: number;
}> {
  const man = getWikiManifestOrThrow();
  return Object.entries(man.novels)
    .map(([novelId, v]) => ({
      novelId,
      categorySlug: v.categorySlug,
      termCount: v.termIds?.length ?? 0,
    }))
    .sort((a, b) => a.novelId.localeCompare(b.novelId));
}

/** 导航展示用：书名优先取站点 NovelInfo */
export function getWikiNovelDisplayLabel(categorySlug: string, novelId: string): string {
  const novel = getNovel(categorySlug, novelId);
  if (novel) return getDisplayNovelTitle(novel);
  return novelId;
}
