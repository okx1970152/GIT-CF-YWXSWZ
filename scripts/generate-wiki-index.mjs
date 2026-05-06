import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const contentIndexPath = path.join(workspaceRoot, "data", "content-index.json");
const outputPath = path.join(workspaceRoot, "data", "wiki-index.json");

function log(message) {
  process.stdout.write(`[wiki-index] ${message}\n`);
}

function readContentIndex() {
  if (!fs.existsSync(contentIndexPath)) {
    log(`missing ${contentIndexPath}; writing empty wiki-index`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(contentIndexPath, "utf8"));
  } catch {
    log(`failed to parse content-index; writing empty wiki-index`);
    return null;
  }
}

/** @param {unknown} v */
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function longestSurface(surfaces) {
  const arr = [...surfaces].filter(isNonEmptyString);
  if (arr.length === 0) return "";
  return arr.reduce((best, s) => (s.length > best.length ? s : best), arr[0]);
}

function buildWikiIndex(indexData) {
  /** @type {Record<string, { categorySlug: string, entries: Record<string, unknown> }>} */
  const novels = {};

  if (!indexData?.categories || !Array.isArray(indexData.categories)) {
    return { version: 1, generatedAt: new Date().toISOString(), novels };
  }

  for (const cat of indexData.categories) {
    const categorySlug = cat.slug;
    if (!categorySlug || !Array.isArray(cat.novels)) continue;

    for (const novel of cat.novels) {
      const novelId = novel.novelId;
      if (!novelId) continue;

      const chapterMetaByChapterNo = novel.chapterMetaByChapterNo || {};
      /** @type {Map<string, { definition: string, surfaces: Set<string>, chapters: Set<string> }>} */
      const byId = new Map();

      for (const [chapterNo, meta] of Object.entries(chapterMetaByChapterNo)) {
        const anchors = meta?.lore_anchors;
        if (!Array.isArray(anchors)) continue;

        for (const anchor of anchors) {
          const id = anchor?.id;
          if (!isNonEmptyString(id)) continue;

          const rawDef =
            typeof anchor.definition === "string" ? anchor.definition.trim() : "";
          const surfaces = Array.isArray(anchor.surfaces)
            ? anchor.surfaces.map((s) => String(s).trim()).filter(Boolean)
            : [];

          let bucket = byId.get(id);
          if (!bucket) {
            bucket = { definition: "", surfaces: new Set(), chapters: new Set() };
            byId.set(id, bucket);
          }

          bucket.chapters.add(chapterNo);
          for (const s of surfaces) bucket.surfaces.add(s);

          if (rawDef.length > bucket.definition.length) {
            bucket.definition = rawDef;
          }
        }
      }

      /** @type {Record<string, { id: string, displayTitle: string, surfaces: string[], definition: string, chapterNos: string[] }>} */
      const entries = {};

      for (const [id, agg] of byId) {
        const definition = agg.definition.trim();
        if (!definition) continue;

        const displayTitle = longestSurface(agg.surfaces) || id;
        entries[id] = {
          id,
          displayTitle,
          surfaces: [...agg.surfaces].sort((a, b) => a.localeCompare(b)),
          definition,
          chapterNos: [...agg.chapters].sort((a, b) => a.localeCompare(b)),
        };
      }

      if (Object.keys(entries).length > 0) {
        novels[novelId] = { categorySlug, entries };
      }
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    novels,
  };
}

const indexData = readContentIndex();
const wikiData = indexData ? buildWikiIndex(indexData) : buildWikiIndex(null);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(wikiData, null, 2) + "\n", "utf8");

const termCount = Object.values(wikiData.novels).reduce(
  (acc, n) => acc + Object.keys(n.entries || {}).length,
  0
);
log(`written: novels=${Object.keys(wikiData.novels).length}, terms=${termCount}, file=${outputPath}`);
