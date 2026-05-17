import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const outIndexPath = path.join(root, "data", "encyclopedia-index.json");
const outEntriesRoot = path.join(root, "data", "encyclopedia", "entries");
const localNovelsRoot = path.join(root, "novels", "eastern-mythology-encyclopedia");
const fallbackNovelsRoot = path.join(
  root,
  "..",
  "..",
  "小说素材爬取",
  "7-最终发布结果",
  "novels",
  "eastern-mythology-encyclopedia"
);

const VOLUME_CONFIG = [
  { volumeKey: "xian" },
  { volumeKey: "shen" },
  { volumeKey: "fo" },
  { volumeKey: "yao" },
  { volumeKey: "mo" },
  { volumeKey: "gui" },
  { volumeKey: "ren" },
  { volumeKey: "dijie" },
  { volumeKey: "famen" },
  { volumeKey: "qiwu" }
];

function log(message) {
  process.stdout.write(`[encyclopedia-index] ${message}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readFrontmatterMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return matter(raw);
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasUsableHotEssaysRoot(candidateRoot) {
  if (!fs.existsSync(candidateRoot)) return false;
  return VOLUME_CONFIG.every((config) => {
    const volumeDir = path.join(candidateRoot, config.volumeKey);
    const infoPath = path.join(volumeDir, "info", "index.md");
    const metaPath = path.join(volumeDir, "meta", "novel.json");
    return fs.existsSync(volumeDir) && fs.existsSync(infoPath) && fs.existsSync(metaPath);
  });
}

function resolveHotEssaysRoot() {
  if (hasUsableHotEssaysRoot(localNovelsRoot)) return localNovelsRoot;
  if (hasUsableHotEssaysRoot(fallbackNovelsRoot)) return fallbackNovelsRoot;
  throw new Error(
    `Missing usable eastern-mythology-encyclopedia source dir. Tried: ${path.relative(root, localNovelsRoot)} and ${path.relative(root, fallbackNovelsRoot)}`
  );
}

function sortByTitle(a, b) {
  return `${a.titleEn} ${a.titleCn}`.localeCompare(`${b.titleEn} ${b.titleCn}`, "en");
}

function wipeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

function buildVolumeRecord(config) {
  const hotEssaysRoot = resolveHotEssaysRoot();
  const volumeSourceDir = path.join(hotEssaysRoot, config.volumeKey);
  const infoPath = path.join(volumeSourceDir, "info", "index.md");
  const novelMetaPath = path.join(volumeSourceDir, "meta", "novel.json");

  if (!fs.existsSync(infoPath)) {
    throw new Error(`Missing volume info file: ${infoPath}`);
  }
  if (!fs.existsSync(novelMetaPath)) {
    throw new Error(`Missing volume meta file: ${novelMetaPath}`);
  }
  if (!fs.existsSync(volumeSourceDir)) {
    throw new Error(`Missing encyclopedia source dir: ${volumeSourceDir}`);
  }

  const info = readFrontmatterMarkdown(infoPath).data;
  const meta = readJson(novelMetaPath, {});
  const novelId = compactText(info.novel_id || meta.slug);
  const titleCn = compactText(info.title || meta.title);
  const titleEn = compactText(info.title_en || meta.title_en);

  if (!novelId) {
    throw new Error(`Missing novel_id/slug for volume ${config.volumeKey}`);
  }

  const outVolumeEntriesDir = path.join(outEntriesRoot, novelId);
  ensureDir(outVolumeEntriesDir);

  const entryFiles = fs
    .readdirSync(volumeSourceDir)
    .filter((name) => name.toLowerCase().endsWith(".json"));

  const entries = entryFiles
    .map((fileName, index) => {
      const sourceFilePath = path.join(volumeSourceDir, fileName);
      const payload = readJson(sourceFilePath, {});
      const fileStem = fileName.replace(/\.json$/i, "");
      const [titleCnFromFile = ""] = fileStem.split("_");
      const titleCn = compactText(titleCnFromFile) || compactText(payload?.meta?.title_cn);
      const titleEn = compactText(payload?.meta?.title_en);
      const slug = compactText(payload?.meta?.english_slug);
      const hook = compactText(payload?.entry?.hook);
      if (!slug || !titleEn) return null;

      const outEntryRelPath = path.posix.join(
        "data",
        "encyclopedia",
        "entries",
        novelId,
        `${slug}.json`
      );
      const outEntryAbsPath = path.join(outEntriesRoot, novelId, `${slug}.json`);
      fs.copyFileSync(sourceFilePath, outEntryAbsPath);

      return {
        chapterNo: String(index + 1).padStart(4, "0"),
        slug,
        titleCn,
        titleEn,
        hook,
        updatedAt: compactText(payload?.meta?.updated_at) || null,
        jsonPath: outEntryRelPath
      };
    })
    .filter(Boolean)
    .sort(sortByTitle)
    .map((entry, index) => ({
      ...entry,
      chapterNo: String(index + 1).padStart(4, "0")
    }));

  const latestUpdatedAt = entries
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    novelId,
    categorySlug: "eastern-mythology-encyclopedia",
    volumeKey: config.volumeKey,
    title: titleCn,
    titleEn,
    author: compactText(info.author || "Yao-XinXin"),
    summary: compactText(info.summary),
    desc: compactText(info.desc),
    totalChapters: entries.length,
    status: compactText(info.status || "Completed"),
    updatedAt: latestUpdatedAt || compactText(info.updated_at || meta.updated_at || ""),
    tags: Array.isArray(info.tags) ? info.tags.map(compactText).filter(Boolean) : [],
    keywords: Array.isArray(meta.keywords) ? meta.keywords.map(compactText).filter(Boolean) : [],
    cover: compactText(info.cover),
    hero: compactText(info.hero),
    featured: Boolean(info.featured),
    hot: Boolean(info.hot),
    ranking: Number(info.ranking || 0),
    seoTitle: compactText(meta.seo_title),
    metaDescription: compactText(meta.meta_description),
    ogTitle: compactText(meta.og_title),
    ogDescription: compactText(meta.og_description),
    twitterTitle: compactText(meta.twitter_title),
    twitterDescription: compactText(meta.twitter_description),
    entries
  };
}

function main() {
  const hotEssaysRoot = resolveHotEssaysRoot();
  log(`source root: ${path.relative(root, hotEssaysRoot)}`);
  wipeDir(outEntriesRoot);
  const volumes = VOLUME_CONFIG.map(buildVolumeRecord);
  ensureDir(path.dirname(outIndexPath));
  fs.writeFileSync(
    outIndexPath,
    JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        volumes
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  log(`written encyclopedia index: volumes=${volumes.length}, out=${outIndexPath}`);
}

main();
