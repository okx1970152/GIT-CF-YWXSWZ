import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const outputPath = path.join(workspaceRoot, "data", "wiki-index.json");

function log(message) {
  process.stdout.write(`[wiki-index] ${message}\n`);
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
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

/**
 * 从 novels 下各书的 meta 目录中的章节 JSON 直接读取 lore_anchors（不依赖 content-index 内嵌重型 meta）。
 */
function buildWikiIndexFromDisk() {
  /** @type {Record<string, { categorySlug: string, entries: Record<string, unknown> }>} */
  const novels = {};

  if (!fs.existsSync(novelsRoot)) {
    return { version: 1, generatedAt: new Date().toISOString(), novels };
  }

  for (const catEnt of fs.readdirSync(novelsRoot, { withFileTypes: true })) {
    if (!catEnt.isDirectory()) continue;
    const categorySlug = catEnt.name;
    const catPath = path.join(novelsRoot, categorySlug);

    for (const novelEnt of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!novelEnt.isDirectory()) continue;
      const novelId = novelEnt.name;
      const metaDir = path.join(catPath, novelId, "meta");
      if (!fs.existsSync(metaDir)) continue;

      /** @type {Map<string, { definition: string, surfaces: Set<string>, chapters: Set<string> }>} */
      const byId = new Map();

      for (const fileName of fs.readdirSync(metaDir)) {
        if (!fileName.endsWith(".json") || fileName === "novel.json") continue;
        const chapterNo = fileName.slice(0, 4);
        const full = readJson(path.join(metaDir, fileName));
        const anchors = full?.lore_anchors;
        if (!Array.isArray(anchors)) continue;

        for (const anchor of anchors) {
          const id = anchor?.id;
          if (!isNonEmptyString(id)) continue;

          const rawDef = typeof anchor.definition === "string" ? anchor.definition.trim() : "";
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

const wikiData = buildWikiIndexFromDisk();

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(wikiData, null, 2) + "\n", "utf8");

const termCount = Object.values(wikiData.novels).reduce(
  (acc, n) => acc + Object.keys(n.entries || {}).length,
  0
);
log(`written: novels=${Object.keys(wikiData.novels).length}, terms=${termCount}, file=${outputPath}`);
