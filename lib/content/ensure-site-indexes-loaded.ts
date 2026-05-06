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

async function primeBothFromPublicFetch(): Promise<void> {
  const contentUrl = toAbsoluteUrl("/__site_data__/content-index.json");
  const wikiUrl = toAbsoluteUrl("/__site_data__/wiki-index.json");

  const [cRes, wRes] = await Promise.all([
    fetch(contentUrl, { next: { revalidate: 300 } }),
    fetch(wikiUrl, { next: { revalidate: 300 } })
  ]);

  if (!cRes.ok || !wRes.ok) {
    await primeBothFromCloudflareAssetsBinding(contentUrl, wikiUrl);
    return;
  }

  const [content, wiki] = (await Promise.all([cRes.json(), wRes.json()])) as [
    ContentIndexRoot,
    WikiIndexData
  ];

  primeContentIndexCache(content);
  primeWikiIndexCache(wiki);
}

/** 同源 fetch 被限制时（如 global_fetch_strictly_public），直接用 ASSETS 绑定读静态文件。 */
async function primeBothFromCloudflareAssetsBinding(
  contentUrl: string,
  wikiUrl: string
): Promise<void> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) {
      throw new Error("ASSETS_binding_missing");
    }
    const loadJson = async (absoluteUrl: string): Promise<unknown> => {
      const res = await assets.fetch(new Request(absoluteUrl));
      if (!res.ok) throw new Error(`assets_fetch:${absoluteUrl}:${res.status}`);
      return res.json() as Promise<unknown>;
    };
    const [content, wiki] = (await Promise.all([loadJson(contentUrl), loadJson(wikiUrl)])) as [
      ContentIndexRoot,
      WikiIndexData
    ];
    primeContentIndexCache(content);
    primeWikiIndexCache(wiki);
  } catch (inner) {
    throw new Error(
      `site_index_load_failed: public_fetch_and_ASSETS_fallback_failed:${String((inner as Error)?.message ?? inner)}`
    );
  }
}

/**
 * Cloudflare Worker 上无 Node fs：在任意 SSR 使用索引前调用本函数。
 * 顺序：已缓存则跳过 → 尝试本地 fs → 同源 fetch 静态资源 `public/__site_data__/*`。
 */
export async function ensureSiteIndexesLoaded(): Promise<void> {
  if (isContentIndexPrimed() && isWikiIndexPrimed()) return;

  if (!inflight) {
    inflight = (async () => {
      if (isContentIndexPrimed() && isWikiIndexPrimed()) return;
      if (tryPrimeBothFromFs()) return;
      await primeBothFromPublicFetch();
    })();
  }

  try {
    await inflight;
  } catch (err) {
    inflight = null;
    throw err;
  }
}
