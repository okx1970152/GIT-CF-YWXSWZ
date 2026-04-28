import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hero } from "@/components/site/Hero";
import { SectionRail } from "@/components/novel/SectionRail";
import { ALL_CATEGORY_SLUGS, getCategoryLabel } from "@/lib/content/categories";
import { getNovelsByCategory } from "@/lib/content/novels";
import { SITE_NAME, absoluteOgUrl, baseOpenGraph, publicRobots } from "@/lib/seo-metadata";
import { toAbsoluteUrl } from "@/lib/seo";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export function generateStaticParams(): { category: string }[] {
  return ALL_CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = getCategoryLabel(category);
  const title = `${label} Novels - ${SITE_NAME}`;
  const description = `Browse English ${label} novels — directories, synopses, and crawlable chapter links on ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical: toAbsoluteUrl(`/category/${category}`)
    },
    openGraph: {
      ...baseOpenGraph(),
      title,
      description,
      url: absoluteOgUrl(`/category/${category}`)
    },
    robots: publicRobots()
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  if (!(ALL_CATEGORY_SLUGS as readonly string[]).includes(category)) {
    notFound();
  }

  const label = getCategoryLabel(category);
  const novels = getNovelsByCategory(category);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-20 pt-6">
      <Hero
        title={`${label} Novels`}
        subtitle="Browse series in this category. Every card opens the novel directory with chapter links for crawlers and readers."
        className="mb-12"
      />
      <SectionRail title={`All ${label}`} novels={novels} />
    </div>
  );
}
