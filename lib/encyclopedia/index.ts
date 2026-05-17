import "server-only";

import fs from "fs";
import path from "path";

export type EncyclopediaEntrySummary = {
  chapterNo: string;
  slug: string;
  titleCn: string;
  titleEn: string;
  hook: string;
  updatedAt: string | null;
  jsonPath: string;
};

export type EncyclopediaVolume = {
  novelId: string;
  categorySlug: string;
  volumeKey: string;
  title: string;
  titleEn: string;
  author: string;
  summary: string;
  desc: string;
  totalChapters: number;
  status: string;
  updatedAt: string;
  tags: string[];
  keywords: string[];
  cover: string;
  hero: string;
  featured: boolean;
  hot: boolean;
  ranking: number;
  seoTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  entries: EncyclopediaEntrySummary[];
};

export type EncyclopediaIndexRoot = {
  version: number;
  generatedAt: string;
  volumes: EncyclopediaVolume[];
};

type EncyclopediaEntryRecord = Record<string, unknown>;

let indexCache: EncyclopediaIndexRoot | null = null;
const entryCache = new Map<string, EncyclopediaEntryRecord | null>();

const INDEX_PATHS = [
  path.join(process.cwd(), "data", "encyclopedia-index.json"),
  path.join(process.cwd(), "public", "__site_data__", "encyclopedia-index.json")
];

export function primeEncyclopediaIndexCache(snapshot: EncyclopediaIndexRoot): void {
  indexCache = snapshot;
}

export function isEncyclopediaIndexPrimed(): boolean {
  return indexCache !== null;
}

function readFirstExistingUtf8(paths: string[]): string | null {
  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
    } catch {
      // Worker / preview fallback handled by public copy during build.
    }
  }
  return null;
}

function loadIndexRoot(): EncyclopediaIndexRoot {
  if (indexCache) return indexCache;
  const raw = readFirstExistingUtf8(INDEX_PATHS);
  if (!raw) {
    throw new Error(
      "encyclopedia_index_not_loaded: run generate:encyclopedia-index before build so eastern-mythology-encyclopedia can read encyclopedia data."
    );
  }
  indexCache = JSON.parse(raw) as EncyclopediaIndexRoot;
  return indexCache;
}

function loadEntryByPath(relPath: string): EncyclopediaEntryRecord | null {
  if (entryCache.has(relPath)) return entryCache.get(relPath) ?? null;

  const normalized = relPath.replace(/^\/+/, "");
  const publicSiteDataPath = normalized.startsWith("data/")
    ? path.join(process.cwd(), "public", "__site_data__", normalized.slice("data/".length))
    : path.join(process.cwd(), "public", "__site_data__", normalized);
  const candidates = [
    path.join(process.cwd(), "data", normalized),
    publicSiteDataPath,
    path.join(process.cwd(), "public", normalized),
    path.join(process.cwd(), normalized)
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as EncyclopediaEntryRecord;
        entryCache.set(relPath, parsed);
        return parsed;
      }
    } catch {
      // continue
    }
  }

  entryCache.set(relPath, null);
  return null;
}

function normalizeLookupKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getEncyclopediaVolumes(): EncyclopediaVolume[] {
  return loadIndexRoot().volumes;
}

export function getEncyclopediaVolume(novelId: string): EncyclopediaVolume | null {
  return getEncyclopediaVolumes().find((item) => item.novelId === novelId) ?? null;
}

export function getEncyclopediaVolumeIds(): string[] {
  return getEncyclopediaVolumes().map((item) => item.novelId);
}

export function getEncyclopediaEntrySummary(
  novelId: string,
  slug: string
): EncyclopediaEntrySummary | null {
  const volume = getEncyclopediaVolume(novelId);
  if (!volume) return null;
  return volume.entries.find((entry) => entry.slug === slug) ?? null;
}

export function getEncyclopediaEntry(
  novelId: string,
  slug: string
): EncyclopediaEntryRecord | null {
  const summary = getEncyclopediaEntrySummary(novelId, slug);
  if (!summary) return null;
  return loadEntryByPath(summary.jsonPath);
}

export function getAllEncyclopediaEntryParams(): Array<{ novelId: string; chapterNo: string }> {
  return getEncyclopediaVolumes().flatMap((volume) =>
    volume.entries.map((entry) => ({
      novelId: volume.novelId,
      chapterNo: entry.slug
    }))
  );
}

export function resolveEncyclopediaRelationTarget(
  target: string
): { categorySlug: string; novelId: string; slug: string; titleEn: string } | null {
  const normalizedTarget = normalizeLookupKey(target);
  if (!normalizedTarget) return null;

  for (const volume of getEncyclopediaVolumes()) {
    for (const entry of volume.entries) {
      const candidates = [entry.titleEn, entry.titleCn, entry.slug];
      if (candidates.some((value) => normalizeLookupKey(value) === normalizedTarget)) {
        return {
          categorySlug: volume.categorySlug,
          novelId: volume.novelId,
          slug: entry.slug,
          titleEn: entry.titleEn
        };
      }
    }
  }

  return null;
}
