import { getSearchIndex, type SearchResult } from "@/lib/content/novels";

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  const keyword = normalizeForSearch(query);
  if (!keyword) return [];

  const index = await getSearchIndex();
  return index.filter((item) => {
    const title = normalizeForSearch(item.title);
    const excerpt = normalizeForSearch(item.excerpt);
    return title.includes(keyword) || excerpt.includes(keyword);
  });
}
