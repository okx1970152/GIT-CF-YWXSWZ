import { getCloudflareContext } from "@opennextjs/cloudflare";
import { primeContentIndexCache, type ContentIndexRoot } from "@/lib/content/content-index";

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

/**
 * Worker 冷启动仅预载 content-index（首页/骨架路径必需）；wiki-index 由 ensureWikiIndex() 按需加载，降低双大 JSON 峰值。
 */
export async function register() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return;

    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://placeholder.invalid";
    const url = `${base}/__site_data__/content-index.json`;
    const res = await assets.fetch(new Request(url));
    if (!res.ok) {
      throw new Error(`assets_fetch_failed:content-index:${res.status}`);
    }
    const content = (await res.json()) as ContentIndexRoot;
    primeContentIndexCache(content);
  } catch (err) {
    console.warn("[instrumentation] ASSETS content-index preload skipped:", err);
  }
}
