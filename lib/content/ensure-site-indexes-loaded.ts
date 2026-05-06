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
import { isWikiIndexPrimed, primeWikiIndexCache, type WikiIndexData } from "@/lib/content/wiki-index";

let inflight: Promise<void> | null = null;

function tryPrimeBothFromFs(): boolean {
  if (isContentIndexPrimed() && isWikiIndexPrimed()) return true;

  const contentPaths = [
    path.join(process.cwd(), "data", "content-index.json"),
    path.join(process.cwd(), "public", "__site_data__", "content-index.json")
  ];
  const wikiPaths = [
    path.join(process.cwd(), "data", "wiki-index.json"),
    path.join(process.cwd(), "public", "__site_data__", "wiki-index.json")
  ];

  let contentRaw: string | null = null;
  let wikiRaw: string | null = null;

  try {
    for (const p of contentPaths) {
      if (fs.existsSync(p)) {
        contentRaw = fs.readFileSync(p, "utf8");
        break;
      }
    }
    for (const p of wikiPaths) {
      if (fs.existsSync(p)) {
        wikiRaw = fs.readFileSync(p, "utf8");
        break;
      }
    }
  } catch {
    return isContentIndexPrimed() && isWikiIndexPrimed();
  }

  try {
    if (contentRaw) primeContentIndexCache(JSON.parse(contentRaw) as ContentIndexRoot);
    if (wikiRaw) primeWikiIndexCache(JSON.parse(wikiRaw) as WikiIndexData);
  } catch {
    return false;
  }

  return isContentIndexPrimed() && isWikiIndexPrimed();
}

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

/**
 * Cloudflare：必须用 ASSETS 绑定读静态 JSON，禁止先用同源 `fetch(站点URL)`——否则会再次进入
 * 本 Worker → 根 layout → ensure → fetch → … 死循环，最终 1102 Worker exceeded resource limits。
 */
async function tryPrimeBothFromAssetsBinding(): Promise<boolean> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return false;

    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://workers-assets.internal";
    const loadJson = async (pathname: string): Promise<unknown> => {
      const url = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
      const res = await assets.fetch(new Request(url));
      if (!res.ok) throw new Error(`assets:${pathname}:${res.status}`);
      return res.json() as Promise<unknown>;
    };

    const [content, wiki] = (await Promise.all([
      loadJson("/__site_data__/content-index.json"),
      loadJson("/__site_data__/wiki-index.json")
    ])) as [ContentIndexRoot, WikiIndexData];

    primeContentIndexCache(content);
    primeWikiIndexCache(wiki);
    return true;
  } catch {
    return false;
  }
}

/** 非 CF（如 next dev / next start）且无 ASSETS 时：同源拉 public 下的索引。 */
async function primeBothFromHttpFetch(): Promise<void> {
  const contentUrl = toAbsoluteUrl("/__site_data__/content-index.json");
  const wikiUrl = toAbsoluteUrl("/__site_data__/wiki-index.json");

  const [cRes, wRes] = await Promise.all([
    fetch(contentUrl, { next: { revalidate: 300 } }),
    fetch(wikiUrl, { next: { revalidate: 300 } })
  ]);

  if (!cRes.ok) {
    throw new Error(`content_index_fetch_failed:${cRes.status}:${contentUrl}`);
  }
  if (!wRes.ok) {
    throw new Error(`wiki_index_fetch_failed:${wRes.status}:${wikiUrl}`);
  }

  const [content, wiki] = (await Promise.all([cRes.json(), wRes.json()])) as [
    ContentIndexRoot,
    WikiIndexData
  ];

  primeContentIndexCache(content);
  primeWikiIndexCache(wiki);
}

/**
 * Cloudflare Worker 上无 Node fs：在任意 SSR 使用索引前调用本函数。
 * 顺序：缓存命中 → fs → **ASSETS.fetch（生产 CF，避免 Worker 自调用死循环）** → 最后才 HTTP fetch（本地）。
 */
export async function ensureSiteIndexesLoaded(): Promise<void> {
  if (isContentIndexPrimed() && isWikiIndexPrimed()) return;

  if (!inflight) {
    inflight = (async () => {
      if (isContentIndexPrimed() && isWikiIndexPrimed()) return;
      if (tryPrimeBothFromFs()) return;
      if (await tryPrimeBothFromAssetsBinding()) return;
      await primeBothFromHttpFetch();
    })();
  }

  try {
    await inflight;
  } catch (err) {
    inflight = null;
    throw err;
  }
}
