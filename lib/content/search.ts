import { getSearchIndex, type SearchResult } from "@/lib/content/novels";

export function searchContent(query: string): SearchResult[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  return getSearchIndex().filter((item) => {
    return (
      item.title.toLowerCase().includes(keyword) || item.excerpt.toLowerCase().includes(keyword)
    );
  });
}
