import path from "node:path";

export const PROJECT_ROOT = process.cwd();
export const NOVELS_ROOT = path.join(PROJECT_ROOT, "novels");

export function getNovelBasePath(categorySlug: string, novelId: string): string {
  return path.join(NOVELS_ROOT, categorySlug, novelId);
}

export function getNovelInfoPath(categorySlug: string, novelId: string): string {
  return path.join(getNovelBasePath(categorySlug, novelId), "info", "index.md");
}

export function getChaptersDir(categorySlug: string, novelId: string): string {
  return path.join(getNovelBasePath(categorySlug, novelId), "chapters");
}

export function getAnnotationsDir(categorySlug: string, novelId: string): string {
  return path.join(getNovelBasePath(categorySlug, novelId), "annotations");
}
