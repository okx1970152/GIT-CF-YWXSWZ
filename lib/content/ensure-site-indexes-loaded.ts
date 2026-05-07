import "server-only";
import fs from "fs";
import path from "path";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { toAbsoluteUrl } from "@/lib/seo";
import {
  isContentIndexPrimed,
  primeContentIndexCache,
  type ContentIndexRoot
} from "@/lib/content/content-index";
import { isWikiIndexPrimed, primeWikiIndexCache, type WikiManifest } from "@/lib/content/wiki-index";

let inflightContent: Promise<void> | null = null;
let inflightWiki: Promise<void> | null = null;

const CONTENT_PATHS = [
  path.join(process.cwd(), "data", "content-index.json"),
  path.join(process.cwd(), "public", "__site_data__", "content-index.json")
];
const WIKI_PATHS = [
  path.join(process.cwd(), "data", "wiki-manifest.json"),
  path.join(process.cwd(), "public", "__site_data__", "wiki-manifest.json")
];

function readFirstExistingUtf8(paths: string[]): string | null {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
    } catch {
      /* Worker 上 fs 常不可用 */
    }
  }
  return null;
}

function tryPrimeContentFromFs(): boolean {
  if (isContentIndexPrimed()) return true;
  const raw = readFirstExistingUtf8(CONTENT_PATHS);
  if (!raw) return false;
  try {
    primeContentIndexCache(JSON.parse(raw) as ContentIndexRoot);
  } catch {
    return false;
  }
  return isContentIndexPrimed();
}

function tryPrimeWikiFromFs(): boolean {
  if (isWikiIndexPrimed()) return true;
  const raw = readFirstExistingUtf8(WIKI_PATHS);
  if (!raw) return false;
  try {
    primeWikiIndexCache(JSON.parse(raw) as WikiManifest);
  } catch {
    return false;
  }
  return isWikiIndexPrimed();
}

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

async function fetchJsonFromAssets(pathname: string): Promise<unknown> {
  const ctx = await getCloudflareContext({ async: true });
  const assets = (ctx.env as Record<string, unknown>).ASSETS;
  if (!isAssetFetcher(assets)) throw new Error("ASSETS_missing");
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://workers-assets.internal";
  const url = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  const res = await assets.fetch(new Request(url));
  if (!res.ok) throw new Error(`assets:${pathname}:${res.status}`);
  return res.json() as Promise<unknown>;
}

async function tryPrimeContentFromAssets(): Promise<boolean> {
  try {
    const data = (await fetchJsonFromAssets("/__site_data__/content-index.json")) as ContentIndexRoot;
    primeContentIndexCache(data);
    return true;
  } catch {
    return false;
  }
}

async function tryPrimeWikiFromAssets(): Promise<boolean> {
  try {
    const data = (await fetchJsonFromAssets("/__site_data__/wiki-manifest.json")) as WikiManifest;
    primeWikiIndexCache(data);
    return true;
  } catch {
    return false;
  }
}

async function primeContentFromHttpFetch(): Promise<void> {
  const url = toAbsoluteUrl("/__site_data__/content-index.json");
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`content_index_fetch_failed:${res.status}:${url}`);
  primeContentIndexCache((await res.json()) as ContentIndexRoot);
}

async function primeWikiFromHttpFetch(): Promise<void> {
  const url = toAbsoluteUrl("/__site_data__/wiki-manifest.json");
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`wiki_manifest_fetch_failed:${res.status}:${url}`);
  primeWikiIndexCache((await res.json()) as WikiManifest);
}

/** 小说目录 / 首页 / 分类 / 搜索等：只灌 content-index，避免冷启动解析 wiki-index。 */
export async function ensureContentIndex(): Promise<void> {
  if (isContentIndexPrimed()) return;

  if (!inflightContent) {
    inflightContent = (async () => {
      if (isContentIndexPrimed()) return;
      if (tryPrimeContentFromFs()) return;
      if (await tryPrimeContentFromAssets()) return;
      await primeContentFromHttpFetch();
    })();
  }

  try {
    await inflightContent;
  } catch (err) {
    inflightContent = null;
    throw err;
  }
}

/** /wiki 与需 getWiki* 的页面（含章节 lore）：在 content 已灌后再调用。 */
export async function ensureWikiIndex(): Promise<void> {
  if (isWikiIndexPrimed()) return;

  if (!inflightWiki) {
    inflightWiki = (async () => {
      if (isWikiIndexPrimed()) return;
      if (tryPrimeWikiFromFs()) return;
      if (await tryPrimeWikiFromAssets()) return;
      await primeWikiFromHttpFetch();
    })();
  }

  try {
    await inflightWiki;
  } catch (err) {
    inflightWiki = null;
    throw err;
  }
}

/** sitemap 等同时需要两棵索引；顺序灌入，避免并行双大 JSON 峰值（可选保守策略）。 */
export async function ensureSiteIndexesLoaded(): Promise<void> {
  await ensureContentIndex();
  await ensureWikiIndex();
}
