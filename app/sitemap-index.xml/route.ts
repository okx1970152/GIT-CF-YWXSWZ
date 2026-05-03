import { getSitemapBaseUrl, getSitemapChunkCount } from "../sitemap";

/**
 * 手动提供 Sitemap Index（绕过 Next 默认 `/sitemap.xml` 在 OpenNext+CF 上的 404）。
 * 入口：GET /sitemap-index.xml
 * 子表：/sitemap/{id}.xml（由 app/sitemap.ts + generateSitemaps 生成）
 */
export async function GET(): Promise<Response> {
  const base = getSitemapBaseUrl().replace(/\/+$/, "");
  const chunkCount = getSitemapChunkCount();

  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];

  for (let id = 0; id < chunkCount; id++) {
    const loc = `${base}/sitemap/${id}.xml`;
    lines.push(`  <sitemap>`);
    lines.push(`    <loc>${escapeXml(loc)}</loc>`);
    lines.push(`  </sitemap>`);
  }

  lines.push(`</sitemapindex>`);

  const body = lines.join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
