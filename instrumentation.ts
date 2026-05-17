import { getCloudflareContext } from "@opennextjs/cloudflare";
import { primeContentIndexCache, type ContentIndexRoot } from "@/lib/content/content-index";
import { primeWikiIndexCache, type WikiManifest } from "@/lib/content/wiki-index";
import { primeEncyclopediaIndexCache, type EncyclopediaIndexRoot } from "@/lib/encyclopedia/index";

type AssetFetcher = { fetch: typeof fetch };

function isAssetFetcher(x: unknown): x is AssetFetcher {
  return typeof x === "object" && x !== null && typeof (x as AssetFetcher).fetch === "function";
}

/**
 * Worker 冷启动预载 content-index；并预载轻量 wiki-manifest（几 KB 级，避免首条 wiki 请求再拉取）。
 * 各书完整词条仍在访问该书 wiki/章节时按 shard 加载，避免单体巨型 wiki-index parse 触发 1102。
 */
export async function register() {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const assets = (ctx.env as Record<string, unknown>).ASSETS;
    if (!isAssetFetcher(assets)) return;

    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://placeholder.invalid";
    const contentUrl = `${base}/__site_data__/content-index.json`;
    const res = await assets.fetch(new Request(contentUrl));
    if (!res.ok) {
      throw new Error(`assets_fetch_failed:content-index:${res.status}`);
    }
    const content = (await res.json()) as ContentIndexRoot;
    primeContentIndexCache(content);

    const wikiUrl = `${base}/__site_data__/wiki-manifest.json`;
    const wikiRes = await assets.fetch(new Request(wikiUrl));
    if (wikiRes.ok) {
      const wiki = (await wikiRes.json()) as WikiManifest;
      primeWikiIndexCache(wiki);
    }

    const encyclopediaUrl = `${base}/__site_data__/encyclopedia-index.json`;
    const encyclopediaRes = await assets.fetch(new Request(encyclopediaUrl));
    if (encyclopediaRes.ok) {
      const encyclopedia = (await encyclopediaRes.json()) as EncyclopediaIndexRoot;
      primeEncyclopediaIndexCache(encyclopedia);
    }
  } catch (err) {
    console.warn("[instrumentation] ASSETS index preload skipped:", err);
  }
}
