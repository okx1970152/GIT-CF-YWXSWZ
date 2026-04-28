import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getAnnotationsDir } from "@/lib/content/paths";
import { parseRelatedTopics, stripRelatedTopicsFromGuide } from "@/lib/content/relatedTopics";

const ANNOTATION_FILE_PATTERN = /^\d{4}-[a-z0-9-]+-guide\.md$/;

export type AnnotationItem = {
  chapterNo: string;
  title: string;
  content: string;
  relatedTopics: string[];
};

export function getAnnotationByChapterNo(
  categorySlug: string,
  novelId: string,
  chapterNo: string
): AnnotationItem | null {
  const dir = getAnnotationsDir(categorySlug, novelId);
  if (!fs.existsSync(dir)) return null;

  const prefix = `${chapterNo}-`;
  const matched = fs.readdirSync(dir).find((name) => name.startsWith(prefix) && name.endsWith(".md"));
  if (!matched) return null;
  if (!ANNOTATION_FILE_PATTERN.test(matched)) {
    throw new Error(`Invalid annotation filename: ${matched}`);
  }

  const raw = fs.readFileSync(path.join(dir, matched), "utf8");
  const { data, content } = matter(raw);
  const title = typeof data.title === "string" ? data.title : `Guide for ${chapterNo}`;

  return {
    chapterNo,
    title,
    content: stripRelatedTopicsFromGuide(content),
    relatedTopics: parseRelatedTopics(content)
  };
}
