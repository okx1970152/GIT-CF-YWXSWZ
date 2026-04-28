/** Navbar + routing: slug is lowercase kebab-case; label is English display name. */
export const CATEGORY_NAV = [
  { slug: "xuanhuan", label: "Xuanhuan" },
  { slug: "wuxia", label: "Wuxia" },
  { slug: "urban", label: "Urban" },
  { slug: "historical", label: "Historical" },
  { slug: "gaming", label: "Gaming" },
  { slug: "sci-fi", label: "Sci-Fi" },
  { slug: "female", label: "Female" },
  { slug: "ranking", label: "Ranking" },
  { slug: "completed", label: "Completed" },
  { slug: "hot-essays", label: "Hot Essays" }
] as const;

export type CategorySlug = (typeof CATEGORY_NAV)[number]["slug"];

export const ALL_CATEGORY_SLUGS: CategorySlug[] = CATEGORY_NAV.map((item) => item.slug);

export function getCategoryLabel(slug: string): string {
  const found = CATEGORY_NAV.find((item) => item.slug === slug);
  return found?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
