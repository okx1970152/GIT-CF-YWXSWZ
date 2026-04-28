import type { MetadataRoute } from "next";
import { ALL_CATEGORY_SLUGS } from "@/lib/content/categories";
import {
  getAllNovels,
  getCategoryLatestUpdatedAt,
  getLatestContentUpdatedAt
} from "@/lib/content/novels";
import { getChapters } from "@/lib/content/chapters";
import { getAnnotationByChapterNo } from "@/lib/content/annotations";
import { SITE_URL } from "@/lib/seo";

function absolute(path: string): string {
  return `${SITE_URL}${path}`;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const homeLm = getLatestContentUpdatedAt();

  const items: MetadataRoute.Sitemap = [
    {
      url: absolute("/"),
      lastModified: homeLm ?? new Date(),
      changeFrequency: "daily",
      priority: 1
    }
  ];

  for (const category of ALL_CATEGORY_SLUGS) {
    const lm = getCategoryLatestUpdatedAt(category);
    items.push({
      url: absolute(`/category/${category}`),
      lastModified: lm ?? homeLm,
      changeFrequency: "daily",
      priority: 0.9
    });
  }

  const topics = new Set<string>();

  for (const novel of getAllNovels()) {
    items.push({
      url: absolute(`/novels/${novel.categorySlug}/${novel.novelId}`),
      lastModified: toDate(novel.updated_at) ?? homeLm,
      changeFrequency: "weekly",
      priority: 0.85
    });
    for (const chapter of getChapters(novel.categorySlug, novel.novelId)) {
      items.push({
        url: absolute(`/novels/${novel.categorySlug}/${novel.novelId}/chapters/${chapter.chapterNo}`),
        lastModified: toDate(chapter.updatedAt ?? novel.updated_at),
        changeFrequency: "monthly",
        priority: 0.7
      });
      const guide = getAnnotationByChapterNo(novel.categorySlug, novel.novelId, chapter.chapterNo);
      guide?.relatedTopics.forEach((topic) => topics.add(topic));
    }
  }

  for (const topic of topics) {
    items.push({
      url: absolute(`/search?q=${encodeURIComponent(topic)}`),
      changeFrequency: "weekly",
      priority: 0.5
    });
  }

  items.push({
    url: absolute("/search"),
    changeFrequency: "weekly",
    priority: 0.6
  });

  return items;
}
