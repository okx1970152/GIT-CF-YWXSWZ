/** Navbar + routing: slug is lowercase kebab-case; label is display name in the header. */
export const CATEGORY_NAV = [
  { slug: "xiuxian", label: "XiuXian" },
  { slug: "wuxia", label: "WuXia" },
  { slug: "xuanhuan", label: "XuanHuan" },
  { slug: "ranking", label: "Ranking" },
  { slug: "hot-essays", label: "Hot Essays" }
] as const;

export type CategorySlug = (typeof CATEGORY_NAV)[number]["slug"];

export const ALL_CATEGORY_SLUGS: CategorySlug[] = CATEGORY_NAV.map((item) => item.slug);

export function getCategoryLabel(slug: string): string {
  const found = CATEGORY_NAV.find((item) => item.slug === slug);
  return found?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
