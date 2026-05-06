import wikiRaw from "@/data/wiki-index.json";
import { getDisplayNovelTitle, getNovel } from "@/lib/content/novels";

export type WikiEntryRecord = {
  id: string;
  displayTitle: string;
  surfaces: string[];
  definition: string;
  chapterNos: string[];
};

export type WikiNovelBucket = {
  categorySlug: string;
  entries: Record<string, WikiEntryRecord>;
};

export type WikiIndexData = {
  version: number;
  generatedAt: string;
  novels: Record<string, WikiNovelBucket>;
};

const wikiIndex = wikiRaw as WikiIndexData;

/** 正文只对在此集合中的 lore id 包 wiki 链接，避免 404 */
export function getWikiLinkedIdsForNovel(novelId: string): Set<string> {
  const bucket = wikiIndex.novels[novelId];
  if (!bucket?.entries) return new Set();
  return new Set(Object.keys(bucket.entries));
}

export function getWikiNovelBucket(novelId: string): WikiNovelBucket | null {
  return wikiIndex.novels[novelId] ?? null;
}

export function getWikiEntry(novelId: string, loreId: string): WikiEntryRecord | null {
  const bucket = wikiIndex.novels[novelId];
  return bucket?.entries[loreId] ?? null;
}

/** SSG：所有有条目的 (novelId, id) */
export function getWikiTermStaticParams(): { novelId: string; id: string }[] {
  const out: { novelId: string; id: string }[] = [];
  for (const novelId of Object.keys(wikiIndex.novels)) {
    const entries = wikiIndex.novels[novelId]?.entries ?? {};
    for (const id of Object.keys(entries)) {
      out.push({ novelId, id });
    }
  }
  return out;
}

/** 有条目的 novelId 列表（排序） */
export function getWikiNovelIdsSorted(): string[] {
  return Object.keys(wikiIndex.novels).sort((a, b) => a.localeCompare(b));
}

export function listWikiEntriesForNovel(novelId: string): WikiEntryRecord[] {
  const bucket = wikiIndex.novels[novelId];
  if (!bucket?.entries) return [];
  return Object.values(bucket.entries).sort((a, b) =>
    a.displayTitle.localeCompare(b.displayTitle, "en")
  );
}

/** 导航展示用：书名优先取站点 NovelInfo */
export function getWikiNovelDisplayLabel(categorySlug: string, novelId: string): string {
  const novel = getNovel(categorySlug, novelId);
  if (novel) return getDisplayNovelTitle(novel);
  return novelId;
}
