import { getCloudflareContext } from "@opennextjs/cloudflare";
import { primeContentIndexCache, type ContentIndexRoot } from "@/lib/content/content-index";
import { primeWikiIndexCache, type WikiIndexData } from "@/lib/content/wiki-index";

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

/**
 * Cloudflare Worker 冷启动时从 ASSETS 绑定拉取索引 JSON，写入模块缓存；
 * 避免 content-index / wiki-index 里对 data/ 的 fs 读在 Worker 上失败。
 */
export async function register() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return;

    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://placeholder.invalid";
    const loadJson = async (pathname: string): Promise<unknown> => {
      const url = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
      const res = await assets.fetch(new Request(url));
      if (!res.ok) {
        throw new Error(`assets_fetch_failed:${pathname}:${res.status}`);
      }
      return res.json() as Promise<unknown>;
    };

    const [content, wiki] = await Promise.all([
      loadJson("/__site_data__/content-index.json"),
      loadJson("/__site_data__/wiki-index.json")
    ]);

    primeContentIndexCache(content as ContentIndexRoot);
    primeWikiIndexCache(wiki as WikiIndexData);
  } catch (err) {
    /* 本地 next dev / Node：仍由 fs 从 data/ 或 public/__site_data__ 读取 */
    console.warn("[instrumentation] ASSETS index preload skipped:", err);
  }
}
