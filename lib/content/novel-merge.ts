import type { NovelMeta } from "@/lib/content/meta";
import type { NovelInfo } from "@/lib/content/schema";

/**
 * info/index.md 与 meta/novel.json 并存时的合并规则（展示 / 排序 / 默认 keywords）：
 *
 * - SEO 专用字段（seo_title、meta_description、og_*、twitter_*）：只用 meta/novel.json；
 *   目录页 generateMetadata 已按「meta 优先，缺省回退 info 摘要」处理。
 * - tags：两边合并后去重（按小写），用于卡片、目录内链、Book JSON-LD、keywords 兜底。
 * - ranking：meta.ranking 为正数时优先用于榜单排序；否则用 info 里的 ranking。
 */
export function mergeNovelTags(novel: NovelInfo, meta: NovelMeta | null): string[] {
  const raw = [...(novel.tags ?? []), ...(meta?.tags ?? [])];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const s = String(t).trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function effectiveRanking(novel: NovelInfo, meta: NovelMeta | null): number {
  const mr = meta?.ranking;
  if (typeof mr === "number" && Number.isFinite(mr) && mr > 0) return mr;
  const ir = novel.ranking;
  if (typeof ir === "number" && Number.isFinite(ir)) return ir;
  return 0;
}
