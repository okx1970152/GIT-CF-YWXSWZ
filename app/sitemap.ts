import type { MetadataRoute } from "next";
import { getContentIndexSnapshot } from "@/lib/content/content-index";
import { getWikiManifest } from "@/lib/content/wiki-index";
import { ensureSiteIndexesLoaded } from "@/lib/content/ensure-site-indexes-loaded";
import { ALL_CATEGORY_SLUGS } from "@/lib/content/categories";
import { getChapters } from "@/lib/content/chapters";
import { getCategoryLatestUpdatedAt, getLatestContentUpdatedAt } from "@/lib/content/novels";
import { novelInfoSchema } from "@/lib/content/schema";

const CHUNK_SIZE = 10_000;

/** Sitemap 的绝对 URL 基址：优先构建环境变量，缺省则用线上域名（避免回落到 localhost）。 */
function sitemapBaseUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (v) return v;
  return "https://wx.0o0o.mom";
}

type WikiSitemapShape = {
  generatedAt?: string;
  novels: Record<string, { termIds?: string[] }>;
};

function absolute(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${sitemapBaseUrl()}${p}`;
}

/** 解析 lastmod：依次尝试多个字段，无效则用索引生成时间，再不行用当前时间。 */
function parseLastMod(...candidates: (string | null | undefined)[]): Date {
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const t = raw.trim();
    if (!t) continue;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const g = getContentIndexSnapshot().generatedAt?.trim();
  if (g) {
    const d = new Date(g);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

let cachedEntries: MetadataRoute.Sitemap | null = null;

function buildAllSitemapEntries(): MetadataRoute.Sitemap {
  const indexData = getContentIndexSnapshot();
  const wikiData = getWikiManifest() as WikiSitemapShape;

  const homeLm = getLatestContentUpdatedAt() ?? parseLastMod(indexData.generatedAt);
  const items: MetadataRoute.Sitemap = [
    {
      url: absolute("/"),
      lastModified: homeLm,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const category of ALL_CATEGORY_SLUGS) {
    const lm = getCategoryLatestUpdatedAt(category) ?? homeLm;
    items.push({
      url: absolute(`/category/${category}`),
      lastModified: lm,
      changeFrequency: "daily",
      priority: 0.9,
    });
  }

  items.push({
    url: absolute("/search"),
    lastModified: homeLm,
    changeFrequency: "weekly",
    priority: 0.6,
  });

  const wikiLm = parseLastMod(wikiData.generatedAt, indexData.generatedAt);
  items.push({
    url: absolute("/wiki/"),
    lastModified: wikiLm,
    changeFrequency: "weekly",
    priority: 0.72,
  });

  for (const novelId of Object.keys(wikiData.novels ?? {})) {
    items.push({
      url: absolute(`/wiki/${novelId}/`),
      lastModified: wikiLm,
      changeFrequency: "weekly",
      priority: 0.68,
    });
    const termIds = wikiData.novels[novelId]?.termIds ?? [];
    for (const loreId of termIds) {
      items.push({
        url: absolute(`/wiki/${novelId}/${encodeURIComponent(loreId)}/`),
        lastModified: wikiLm,
        changeFrequency: "monthly",
        priority: 0.62,
      });
    }
  }

  for (const cat of indexData.categories) {
    const categorySlug = cat.slug;
    for (const novelEntry of cat.novels) {
      const parsed = novelInfoSchema.safeParse(novelEntry.frontmatter);
      if (!parsed.success) continue;

      const novelId = novelEntry.novelId;
      const novelLm = parseLastMod(parsed.data.updated_at, indexData.generatedAt);

      items.push({
        url: absolute(`/novels/${categorySlug}/${novelId}`),
        lastModified: novelLm,
        changeFrequency: "weekly",
        priority: 0.85,
      });

      const chapters = getChapters(categorySlug, novelId);
      for (const ch of chapters) {
        const chapterLm = parseLastMod(ch.updatedAt, parsed.data.updated_at, indexData.generatedAt);
        items.push({
          url: absolute(`/novels/${categorySlug}/${novelId}/chapters/${ch.chapterNo}`),
          lastModified: chapterLm,
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  }

  return items;
}

async function getAllSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  await ensureSiteIndexesLoaded();
  if (!cachedEntries) {
    cachedEntries = buildAllSitemapEntries();
  }
  return cachedEntries;
}

/** 供 Route Handler（如 sitemap-index.xml）与 OpenNext 兜底索引用：站点绝对基址。 */
export function getSitemapBaseUrl(): string {
  return sitemapBaseUrl();
}

export const SITEMAP_CHUNK_SIZE = CHUNK_SIZE;

/** 与 `generateSitemaps()` 一致：子 sitemap 分块数量（至少为 1）。 */
export async function getSitemapChunkCount(): Promise<number> {
  const all = await getAllSitemapEntries();
  return Math.max(1, Math.ceil(all.length / CHUNK_SIZE));
}

/**
 * Next.js 15：声明分块 Sitemap Index 的子表数量。
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */
export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const all = await getAllSitemapEntries();
  const total = all.length;
  const count = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const page = typeof id === "string" ? Number.parseInt(String(id), 10) : Number(id);
  const safePage = Number.isFinite(page) && page >= 0 ? page : 0;

  const all = await getAllSitemapEntries();
  const start = safePage * CHUNK_SIZE;
  return all.slice(start, start + CHUNK_SIZE);
}
