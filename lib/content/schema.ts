import { z } from "zod";

export const novelInfoSchema = z.object({
  title: z.string(),
  title_en: z.string().optional().default(""),
  author: z.string().optional().default("Anonymous"),
  category: z.string(),
  novel_id: z.string(),
  desc: z.string(),
  total_chapters: z.number().int().nonnegative(),
  status: z.string(),
  cover: z.string().optional().default(""),
  hero: z.string().optional().default(""),
  featured: z.boolean().optional().default(false),
  hot: z.boolean().optional().default(false),
  ranking: z.number().optional().default(0),
  updated_at: z.string(),
  tags: z.array(z.string()).optional().default([])
});

export const chapterSchema = z.object({
  title: z.string(),
  chapter_no: z.string().regex(/^\d{4}$/),
  published_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type NovelInfo = z.infer<typeof novelInfoSchema> & {
  categorySlug: string;
  novelId: string;
};

export type ChapterFrontmatter = z.infer<typeof chapterSchema>;
