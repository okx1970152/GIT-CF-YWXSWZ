import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const manifestPath = path.join(workspaceRoot, "data", "wiki-manifest.json");
const shardsRoot = path.join(workspaceRoot, "data", "wiki", "novels");

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
 * 从 novels 下各书的 meta 目录中的章节 JSON 直接读取 lore_anchors。
 * 输出：轻量 wiki-manifest.json + 每本书单独 shard（避免单体巨型 wiki-index.json 在 Worker 内整文件 parse 触发 1102）。
 */
function buildWikiShardsFromDisk() {
  /** @type {Record<string, { categorySlug: string, termIds: string[] }>} */
  const manifestNovels = {};

  if (!fs.existsSync(novelsRoot)) {
    return {
      manifest: {
        version: 2,
        generatedAt: new Date().toISOString(),
        novels: manifestNovels,
      },
      shardCount: 0,
    };
  }

  if (fs.existsSync(shardsRoot)) {
    fs.rmSync(shardsRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(shardsRoot, { recursive: true });

  let shardCount = 0;

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

      const termIds = Object.keys(entries).sort((a, b) => a.localeCompare(b));
      if (termIds.length === 0) continue;

      manifestNovels[novelId] = {
        categorySlug,
        termIds,
      };

      const shard = {
        novelId,
        categorySlug,
        entries,
      };

      const shardFile = path.join(shardsRoot, `${novelId}.json`);
      fs.writeFileSync(shardFile, JSON.stringify(shard) + "\n", "utf8");
      shardCount += 1;
    }
  }

  const manifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    novels: manifestNovels,
  };

  return { manifest, shardCount };
}

const { manifest, shardCount } = buildWikiShardsFromDisk();

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

const termCount = Object.values(manifest.novels).reduce((acc, n) => acc + (n.termIds?.length ?? 0), 0);
log(
  `written: manifest v${manifest.version}, novels=${Object.keys(manifest.novels).length}, terms=${termCount}, shards=${shardCount}, manifest=${manifestPath}`
);
