import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const outputPath = path.join(workspaceRoot, "data", "content-index.json");

const CHAPTER_FILE_PATTERN = /^\d{4}-[A-Za-z0-9-]+\.md$/;
const ANNOTATION_FILE_PATTERN = /^\d{4}-[A-Za-z0-9-]+-guide\.md$/;
const RELATED_TOPICS_PATTERN = /(?:^|\n)Related Topics:\s*((?:#[A-Za-z0-9_-]+\s*)+)$/m;

function log(message) {
  process.stdout.write(`[content-index] ${message}\n`);
}

function parseRelatedTopics(markdown) {
  const match = markdown.match(RELATED_TOPICS_PATTERN);
  if (!match) return [];
  return match[1]
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^#/, ""));
}

function stripRelatedTopics(markdown) {
  return markdown.replace(RELATED_TOPICS_PATTERN, "").trim();
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function listFiles(dir, suffix) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(suffix))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function buildIndex() {
  const categories = [];
  for (const categorySlug of listDirs(novelsRoot)) {
    const categoryPath = path.join(novelsRoot, categorySlug);
    const novels = [];

    for (const novelId of listDirs(categoryPath)) {
      const novelBase = path.join(categoryPath, novelId);
      const infoPath = path.join(novelBase, "info", "index.md");
      if (!fs.existsSync(infoPath)) continue;

      const infoRaw = fs.readFileSync(infoPath, "utf8");
      const { data: novelFrontmatter } = matter(infoRaw);
      const metaNovel = readJson(path.join(novelBase, "meta", "novel.json"));

      const chapterItemsRaw = [];
      const chaptersDir = path.join(novelBase, "chapters");
      for (const fileName of listFiles(chaptersDir, ".md")) {
        if (!CHAPTER_FILE_PATTERN.test(fileName)) continue;
        const chapterNo = fileName.slice(0, 4);
        const slug = fileName.replace(/^\d{4}-/, "").replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(chaptersDir, fileName), "utf8");
        const { data, content } = matter(raw);
        chapterItemsRaw.push({
          chapterNo,
          slug,
          title: data?.title ?? `Chapter ${chapterNo}`,
          content,
          publishedAt: data?.published_at ?? null,
          updatedAt: data?.updated_at ?? null,
          fileName,
        });
      }
      const chapterItems = dedupeChapters(chapterItemsRaw);

      const annotationMap = {};
      const annotationsDir = path.join(novelBase, "annotations");
      for (const fileName of listFiles(annotationsDir, ".md")) {
        if (!ANNOTATION_FILE_PATTERN.test(fileName)) continue;
        const chapterNo = fileName.slice(0, 4);
        const raw = fs.readFileSync(path.join(annotationsDir, fileName), "utf8");
        const { data, content } = matter(raw);
        annotationMap[chapterNo] = {
          chapterNo,
          title: typeof data?.title === "string" ? data.title : `Guide for ${chapterNo}`,
          content: stripRelatedTopics(content),
          relatedTopics: parseRelatedTopics(content),
        };
      }

      const chapterMetaMap = {};
      const metaDir = path.join(novelBase, "meta");
      for (const fileName of listFiles(metaDir, ".json")) {
        if (fileName === "novel.json") continue;
        const chapterNo = fileName.slice(0, 4);
        const payload = readJson(path.join(metaDir, fileName));
        if (payload) chapterMetaMap[chapterNo] = payload;
      }

      novels.push({
        categorySlug,
        novelId,
        frontmatter: novelFrontmatter,
        metaNovel,
        chapters: chapterItems,
        annotationsByChapterNo: annotationMap,
        chapterMetaByChapterNo: chapterMetaMap,
      });
    }

    categories.push({ slug: categorySlug, novels });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    categories,
  };
}

function dedupeChapters(items) {
  const bestByChapterNo = new Map();
  for (const item of items) {
    const prev = bestByChapterNo.get(item.chapterNo);
    if (!prev) {
      bestByChapterNo.set(item.chapterNo, item);
      continue;
    }
    const prevTs = Date.parse(prev.updatedAt || prev.publishedAt || "");
    const nextTs = Date.parse(item.updatedAt || item.publishedAt || "");
    if (Number.isFinite(nextTs) && (!Number.isFinite(prevTs) || nextTs > prevTs)) {
      bestByChapterNo.set(item.chapterNo, item);
      continue;
    }
    if (item.fileName.localeCompare(prev.fileName) > 0) {
      bestByChapterNo.set(item.chapterNo, item);
    }
  }
  return [...bestByChapterNo.values()].sort((a, b) => a.chapterNo.localeCompare(b.chapterNo));
}

const indexData = buildIndex();
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(indexData, null, 2) + "\n", "utf8");

const novelCount = indexData.categories.reduce((acc, c) => acc + c.novels.length, 0);
const chapterCount = indexData.categories.reduce(
  (acc, c) => acc + c.novels.reduce((sum, n) => sum + n.chapters.length, 0),
  0
);
log(`index generated: novels=${novelCount}, chapters=${chapterCount}, file=${outputPath}`);

