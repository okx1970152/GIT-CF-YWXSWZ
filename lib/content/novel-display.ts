import type { NovelInfo } from "@/lib/content/schema";

function looksLikeMostlyCjk(input: string): boolean {
  if (!input.trim()) return false;
  const cjk = (input.match(/[\u3400-\u9fff]/g) || []).length;
  return cjk >= Math.max(1, Math.floor(input.length / 3));
}

export function getDisplayNovelTitle(novel: NovelInfo): string {
  const titleEn = novel.title_en?.trim();
  if (titleEn) return titleEn;
  if (!looksLikeMostlyCjk(novel.title)) return novel.title;
  return novel.novelId
    .split("-")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function getNovelSummary(novel: NovelInfo): string {
  const summary = novel.summary?.trim();
  if (summary) return summary;
  const desc = novel.desc?.trim();
  if (desc) return desc;
  return `${getDisplayNovelTitle(novel)} is an ongoing web novel.`;
}
