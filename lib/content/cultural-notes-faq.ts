import type { CulturalNotesFaqItem } from "@/lib/content/meta";

/** 与实施方案一致的前端软上限（可与流水线日后对齐数字） */
export const CULTURAL_NOTES_FAQ_MAX_ITEMS = 8;

/**
 * 过滤无效项、截断条数，供页面可见 FAQ 与 FAQPage JSON-LD 同源使用。
 * 与生产端约定一致：`q`/`a` strip 后均非空才保留。
 */
export function sanitizeCulturalNotesFaqForPage(
  raw: CulturalNotesFaqItem[] | undefined | null
): CulturalNotesFaqItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: CulturalNotesFaqItem[] = [];
  for (const row of raw) {
    if (!row || typeof row.q !== "string" || typeof row.a !== "string") continue;
    const q = row.q.trim();
    const a = row.a.trim();
    if (!q || !a) continue;
    out.push({ q, a });
    if (out.length >= CULTURAL_NOTES_FAQ_MAX_ITEMS) break;
  }
  return out;
}
