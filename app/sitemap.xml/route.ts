import { getSitemapBaseUrl, getSitemapChunkCount } from "../sitemap";

/**
 * Explicit /sitemap.xml alias for search engines and tools that probe the
 * conventional sitemap URL first. Returning the sitemap index here avoids the
 * App Router 404 metadata collision seen on OpenNext + Cloudflare.
 */
export async function GET(): Promise<Response> {
  const base = getSitemapBaseUrl().replace(/\/+$/, "");
  const chunkCount = await getSitemapChunkCount();

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

  return new Response(lines.join("\n"), {
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
