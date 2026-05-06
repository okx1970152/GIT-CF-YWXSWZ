import { getSearchIndex, type SearchResult } from "@/lib/content/novels";

export async function searchContent(query: string): Promise<SearchResult[]> {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];

  const index = await getSearchIndex();
  return index.filter((item) => {
    return (
      item.title.toLowerCase().includes(keyword) || item.excerpt.toLowerCase().includes(keyword)
    );
  });
}
