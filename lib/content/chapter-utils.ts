/**
 * 纯函数、无 content-index / fs 依赖，可供 Client Components 安全引用（如 padChapterNo）。
 */

export function padChapterNo(input: number | string): string {
  const value = typeof input === "number" ? input.toString() : input;
  return value.padStart(4, "0");
}

export function parseChapterFileName(filename: string): { chapterNo: string; slug: string } {
  const chapterNo = filename.slice(0, 4);
  const slug = filename.replace(/^\d{4}-/, "").replace(/\.md$/, "");
  return { chapterNo, slug };
}
