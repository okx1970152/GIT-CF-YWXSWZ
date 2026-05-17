import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const manifestPath = path.join(workspaceRoot, "data", "wiki-manifest.json");
const shardsRoot = path.join(workspaceRoot, "data", "wiki", "novels");
const encyclopediaIndexPath = path.join(workspaceRoot, "data", "encyclopedia-index.json");
const ENCYCLOPEDIA_CATEGORY_SLUG = "eastern-mythology-encyclopedia";

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

function readText(filePath) {
  try {
    if (!fs.existsSync(filePath)) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function getRecord(value) {
  return typeof value === "object" && value !== null ? value : {};
}

function getString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function trimPreview(value, maxLength = 320) {
  const compact = compactText(value);
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function fullParagraph(sectionText) {
  const first = String(sectionText ?? "").split(/\r?\n\r?\n/)[0] ?? "";
  return compactText(first);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function longestSurface(surfaces) {
  const items = [...surfaces].filter(isNonEmptyString);
  if (items.length === 0) return "";
  return items.reduce((best, current) => (current.length > best.length ? current : best), items[0]);
}

function normalizeLookupKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAnnotationSections(markdown) {
  const raw = String(markdown ?? "");
  if (!raw.trim()) return { byHeading: new Map(), byAnchorId: new Map() };

  const withoutFrontmatter = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const chunks = withoutFrontmatter.split(/\r?\n##\s+/);
  const byHeading = new Map();
  const byAnchorId = new Map();

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = index === 0 ? chunks[index] : `## ${chunks[index]}`;
    const match = /^##\s+(.+?)(?:\s+\{#([a-z0-9-]+)\})?\r?\n([\s\S]*)$/i.exec(chunk.trim());
    if (!match) continue;

    const heading = compactText(match[1]);
    const anchorId = compactText(match[2]);
    const body = match[3].trim();
    if (!heading || !body) continue;

    byHeading.set(heading, body);
    if (anchorId) byAnchorId.set(anchorId, body);
  }

  return { byHeading, byAnchorId };
}

function splitMarkdownBullets(sectionText) {
  return String(sectionText ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

function chooseFirstNonEmpty(values) {
  for (const value of values) {
    if (compactText(value)) return compactText(value);
  }
  return "";
}

function splitSectionParagraphs(sectionText) {
  return String(sectionText ?? "")
    .split(/\r?\n\r?\n/)
    .map((part) => compactText(part))
    .filter(Boolean);
}

function getObjectStringValues(record) {
  const valueRecord = getRecord(record);
  return Object.keys(valueRecord)
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => compactText(valueRecord[key]))
    .filter(Boolean);
}

function findMatchingQuickQA(termKeys, annotation) {
  const quickQA = annotation?.byHeading?.get("Quick Q&A") ?? "";
  if (!compactText(quickQA)) return "";

  const paragraphs = splitSectionParagraphs(quickQA);
  for (const paragraph of paragraphs) {
    const normalized = normalizeLookupKey(paragraph);
    if (termKeys.some((key) => key && normalized.includes(key))) {
      return paragraph;
    }
  }

  const full = compactText(quickQA);
  const normalizedFull = normalizeLookupKey(full);
  if (termKeys.some((key) => key && normalizedFull.includes(key))) {
    return full;
  }

  return "";
}

function buildStoryContext(annotation) {
  return chooseFirstNonEmpty([
    fullParagraph(annotation?.byHeading?.get("Chapter Overview") ?? ""),
    compactText(splitMarkdownBullets(annotation?.byHeading?.get("Key Plot Points") ?? "").slice(0, 3).join(" ")),
    ""
  ]);
}

function buildWhyItMatters(annotation) {
  return chooseFirstNonEmpty([
    fullParagraph(annotation?.byHeading?.get("Reading Guide") ?? ""),
    fullParagraph(annotation?.byHeading?.get("Cultural / Xianxia Notes") ?? ""),
    ""
  ]);
}

function deriveFallbackDefinition(termId, chapterNos, chapterMetaLookup, chapterAnnotationLookup) {
  for (const chapterNo of chapterNos) {
    const annotation = chapterAnnotationLookup.get(chapterNo);
    const anchorBody = annotation?.byAnchorId?.get(termId);
    if (compactText(anchorBody)) return fullParagraph(anchorBody);

    const cultural = annotation?.byHeading?.get("Cultural / Xianxia Notes");
    if (compactText(cultural)) return fullParagraph(cultural);

    const overview = annotation?.byHeading?.get("Chapter Overview");
    if (compactText(overview)) return fullParagraph(overview);

    const meta = chapterMetaLookup.get(chapterNo);
    if (compactText(meta?.metaDescription)) return trimPreview(meta.metaDescription, 240);
  }

  return "";
}

function dedupeStrings(values, limit = 8) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const compact = compactText(value);
    if (!compact) continue;
    const key = compact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(compact);
    if (output.length >= limit) break;
  }

  return output;
}

function isDirectoryLike(rootPath, dirent) {
  if (dirent?.isDirectory?.()) return true;
  try {
    return fs.statSync(path.join(rootPath, dirent.name)).isDirectory();
  } catch {
    return false;
  }
}

function buildEncyclopediaEntryLookup(volumes) {
  const lookup = new Map();
  for (const volume of volumes) {
    for (const entry of getArray(volume?.entries)) {
      const candidates = [entry?.slug, entry?.titleEn, entry?.titleCn];
      for (const candidate of candidates) {
        const key = normalizeLookupKey(candidate);
        if (!key || lookup.has(key)) continue;
        lookup.set(key, {
          novelId: compactText(volume?.novelId),
          entryId: compactText(entry?.slug)
        });
      }
    }
  }
  return lookup;
}

function buildEncyclopediaWikiShards(manifestNovels) {
  const encyclopediaIndex = readJson(encyclopediaIndexPath);
  const volumes = getArray(encyclopediaIndex?.volumes).filter(
    (volume) =>
      compactText(volume?.categorySlug) === ENCYCLOPEDIA_CATEGORY_SLUG && compactText(volume?.novelId)
  );
  if (volumes.length === 0) {
    return { shardCount: 0, termCount: 0 };
  }

  const relationLookup = buildEncyclopediaEntryLookup(volumes);
  let shardCount = 0;
  let termCount = 0;

  for (const volume of volumes) {
    const novelId = compactText(volume.novelId);
    const categorySlug = compactText(volume.categorySlug);
    const entries = {};

    log(`processing ${categorySlug}/${novelId} (encyclopedia)`);

    for (const entrySummary of getArray(volume.entries)) {
      const slug = compactText(entrySummary?.slug);
      if (!slug) continue;

      const payload = readJson(path.join(workspaceRoot, compactText(entrySummary?.jsonPath)), {});
      const meta = getRecord(payload?.meta);
      const entry = getRecord(payload?.entry);
      const seo = getRecord(payload?.seo);
      const loreEntries = getArray(payload?.lore_entries).map((item) => getRecord(item));
      const faqEntries = getArray(payload?.faq_entries).map((item) => getRecord(item));
      const relationEntries = getArray(payload?.relation_entries).map((item) => getRecord(item));
      const bodySections = getObjectStringValues(entry.body);
      const guideSections = getObjectStringValues(entry.guide);
      const hook = getString(entry.hook) || compactText(entrySummary?.hook);
      const displayTitle =
        getString(meta.title_en) || compactText(entrySummary?.titleEn) || compactText(entrySummary?.titleCn) || slug;
      const displayTitleCn = getString(meta.title_cn) || compactText(entrySummary?.titleCn);
      const loreDescriptions = loreEntries.map((item) => getString(item.description)).filter(Boolean);
      const faqAnswers = faqEntries.map((item) => getString(item.answer)).filter(Boolean);
      const definition = chooseFirstNonEmpty([
        bodySections[0] ? trimPreview(bodySections[0], 420) : "",
        hook,
        loreDescriptions[0] || ""
      ]);
      if (!definition) continue;

      const relatedTermIds = relationEntries
        .map((item) => relationLookup.get(normalizeLookupKey(getString(item.target)))?.entryId || "")
        .filter((id) => id && id !== slug)
        .slice(0, 8);

      const typeHints = dedupeStrings([
        ...getArray(seo.tags).map((item) => compactText(item)),
        ...getArray(seo.keywords).map((item) => compactText(item))
      ]);
      const guideTags = dedupeStrings(
        loreEntries.map((item) => getString(item.surface_form)).filter(Boolean),
        6
      );

      entries[slug] = {
        id: slug,
        displayTitle,
        surfaces: dedupeStrings([displayTitle, displayTitleCn, slug], 16),
        definition,
        chapterNos: [slug],
        firstChapterNo: slug,
        heroQA: hook,
        storyContext: chooseFirstNonEmpty([guideSections[0] || "", bodySections[1] || "", hook]),
        whyItMatters: chooseFirstNonEmpty([guideSections[1] || "", faqAnswers[0] || "", bodySections[0] || ""]),
        quickFacts: {
          typeHints,
          guideTags,
          firstChapterTitle: displayTitle,
          referenceCount: 1
        },
        chapterRefs: [
          {
            chapterNo: slug,
            title: displayTitle,
            metaDescription: chooseFirstNonEmpty([hook, definition, guideSections[0] || ""])
          }
        ],
        relatedTermIds
      };
    }

    const termIds = Object.keys(entries).sort((a, b) => a.localeCompare(b));
    if (termIds.length === 0) {
      log(`skipped ${categorySlug}/${novelId}: no encyclopedia-derived terms`);
      continue;
    }

    manifestNovels[novelId] = {
      categorySlug,
      termIds
    };

    const shard = {
      novelId,
      categorySlug,
      entries
    };

    const shardFile = path.join(shardsRoot, `${novelId}.json`);
    fs.writeFileSync(shardFile, JSON.stringify(shard) + "\n", "utf8");
    shardCount += 1;
    termCount += termIds.length;
    log(`enriched ${categorySlug}/${novelId}: terms=${termIds.length}, shard=${shardFile}`);
  }

  return { shardCount, termCount };
}

function buildWikiShardsFromDisk() {
  const manifestNovels = {};

  if (!fs.existsSync(novelsRoot)) {
    return {
      manifest: {
        version: 3,
        generatedAt: new Date().toISOString(),
        novels: manifestNovels
      },
      shardCount: 0,
      termCount: 0
    };
  }

  if (fs.existsSync(shardsRoot)) {
    fs.rmSync(shardsRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(shardsRoot, { recursive: true });

  let shardCount = 0;
  let totalTerms = 0;

  for (const categoryEntry of fs.readdirSync(novelsRoot, { withFileTypes: true })) {
    if (!isDirectoryLike(novelsRoot, categoryEntry)) continue;
    const categorySlug = categoryEntry.name;
    const categoryPath = path.join(novelsRoot, categorySlug);

    for (const novelEntry of fs.readdirSync(categoryPath, { withFileTypes: true })) {
      if (!isDirectoryLike(categoryPath, novelEntry)) continue;
      const novelId = novelEntry.name;
      const novelRoot = path.join(categoryPath, novelId);
      const metaDir = path.join(novelRoot, "meta");
      const annotationDir = path.join(novelRoot, "annotations");
      if (!fs.existsSync(metaDir)) continue;

      log(`processing ${categorySlug}/${novelId}`);

      const byId = new Map();
      const chapterMetaLookup = new Map();
      const chapterAnnotationLookup = new Map();

      for (const fileName of fs.readdirSync(metaDir)) {
        if (!fileName.endsWith(".json") || fileName === "novel.json") continue;

        const chapterNo = fileName.slice(0, 4);
        const full = readJson(path.join(metaDir, fileName));
        if (!full) continue;

        chapterMetaLookup.set(chapterNo, {
          chapterNo,
          title: compactText(full.chapter_title_en || full.chapter_slug || `Chapter ${chapterNo}`),
          metaDescription: compactText(
            full.chapter_meta_description || full.og_description || full.twitter_description || ""
          ),
          keywords: Array.isArray(full.chapter_keywords)
            ? full.chapter_keywords.map((item) => compactText(item)).filter(Boolean)
            : [],
          guideTags: Array.isArray(full.guide_tags)
            ? full.guide_tags.map((item) => compactText(item)).filter(Boolean)
            : [],
          loreAnchorIds: Array.isArray(full.lore_anchors)
            ? full.lore_anchors.map((anchor) => compactText(anchor?.id)).filter(Boolean)
            : []
        });

        const anchors = full.lore_anchors;
        if (!Array.isArray(anchors)) continue;

        for (const anchor of anchors) {
          const id = compactText(anchor?.id);
          if (!id) continue;

          const rawDefinition = typeof anchor?.definition === "string" ? anchor.definition.trim() : "";
          const surfaces = Array.isArray(anchor?.surfaces)
            ? anchor.surfaces.map((item) => compactText(item)).filter(Boolean)
            : [];

          let bucket = byId.get(id);
          if (!bucket) {
            bucket = { definition: "", surfaces: new Set(), chapters: new Set() };
            byId.set(id, bucket);
          }

          bucket.chapters.add(chapterNo);
          for (const surface of surfaces) bucket.surfaces.add(surface);

          if (rawDefinition.length > bucket.definition.length) {
            bucket.definition = rawDefinition;
          }
        }
      }

      if (fs.existsSync(annotationDir)) {
        for (const fileName of fs.readdirSync(annotationDir)) {
          if (!fileName.endsWith(".md")) continue;
          const chapterNo = fileName.slice(0, 4);
          chapterAnnotationLookup.set(chapterNo, parseAnnotationSections(readText(path.join(annotationDir, fileName))));
        }
      }

      const surfaceToId = new Map();
      for (const [id, aggregate] of byId) {
        const displayTitle = longestSurface(aggregate.surfaces) || id;
        for (const surface of [...aggregate.surfaces, displayTitle, id]) {
          const key = normalizeLookupKey(surface);
          if (!key || surfaceToId.has(key)) continue;
          surfaceToId.set(key, id);
        }
      }

      const entries = {};

      for (const [id, aggregate] of byId) {
        if (compactText(aggregate.definition)) continue;
        const chapterNos = [...aggregate.chapters].sort((a, b) => a.localeCompare(b));
        aggregate.definition = deriveFallbackDefinition(id, chapterNos, chapterMetaLookup, chapterAnnotationLookup);
      }

      for (const [id, aggregate] of byId) {
        const definition = compactText(aggregate.definition);
        if (!definition) continue;

        const displayTitle = longestSurface(aggregate.surfaces) || id;
        const chapterNos = [...aggregate.chapters].sort((a, b) => a.localeCompare(b));
        const chapterRefs = chapterNos
          .map((chapterNo) => {
            const meta = chapterMetaLookup.get(chapterNo);
            const annotation = chapterAnnotationLookup.get(chapterNo);
            return {
              chapterNo,
              title: compactText(meta?.title || `Chapter ${chapterNo}`),
              metaDescription: chooseFirstNonEmpty([
                compactText(meta?.metaDescription || ""),
                fullParagraph(annotation?.byAnchorId?.get(id) ?? ""),
                fullParagraph(annotation?.byHeading?.get("Chapter Overview") ?? "")
              ])
            };
          })
          .filter((item) => compactText(item.title));

        const firstChapterNo = chapterNos[0] || "";
        const relatedIds = new Set();
        const typeHints = [];
        const guideTags = [];
        const heroQACandidates = [];
        const storyContextCandidates = [];
        const whyCandidates = [];
        const termKeys = dedupeStrings([id, displayTitle, ...aggregate.surfaces], 16).map((value) =>
          normalizeLookupKey(value)
        );

        for (const chapterNo of chapterNos.slice(0, 5)) {
          const meta = chapterMetaLookup.get(chapterNo);
          const annotation = chapterAnnotationLookup.get(chapterNo);

          if (meta) {
            for (const anchorId of meta.loreAnchorIds) {
              if (anchorId && anchorId !== id) relatedIds.add(anchorId);
            }

            for (const keyword of meta.keywords) {
              typeHints.push(keyword);
              const keywordId = surfaceToId.get(normalizeLookupKey(keyword));
              if (keywordId && keywordId !== id) relatedIds.add(keywordId);
            }

            for (const guideTag of meta.guideTags) {
              guideTags.push(guideTag);
              const guideTagId = surfaceToId.get(normalizeLookupKey(guideTag));
              if (guideTagId && guideTagId !== id) relatedIds.add(guideTagId);
            }
          }

          const heroQA = findMatchingQuickQA(termKeys, annotation);
          if (heroQA) heroQACandidates.push(heroQA);

          const storyContext = buildStoryContext(annotation);
          if (storyContext) storyContextCandidates.push(storyContext);

          const whyItMatters = buildWhyItMatters(annotation);
          if (whyItMatters) whyCandidates.push(whyItMatters);
        }

        entries[id] = {
          id,
          displayTitle,
          surfaces: [...aggregate.surfaces].sort((a, b) => a.localeCompare(b)),
          definition,
          chapterNos,
          firstChapterNo,
          heroQA: heroQACandidates.find(Boolean) ?? "",
          storyContext: storyContextCandidates.find(Boolean) ?? "",
          whyItMatters: whyCandidates.find(Boolean) ?? "",
          quickFacts: {
            typeHints: dedupeStrings(typeHints, 6),
            guideTags: dedupeStrings(guideTags, 6),
            firstChapterTitle: chapterRefs[0]?.title || "",
            referenceCount: chapterRefs.length
          },
          chapterRefs: chapterRefs.slice(0, 6),
          relatedTermIds: [...relatedIds].filter((relatedId) => relatedId && byId.has(relatedId)).slice(0, 8)
        };
      }

      const termIds = Object.keys(entries).sort((a, b) => a.localeCompare(b));
      if (termIds.length === 0) {
        log(`skipped ${categorySlug}/${novelId}: no enriched terms`);
        continue;
      }

      manifestNovels[novelId] = {
        categorySlug,
        termIds
      };

      const shard = {
        novelId,
        categorySlug,
        entries
      };

      const shardFile = path.join(shardsRoot, `${novelId}.json`);
      fs.writeFileSync(shardFile, JSON.stringify(shard) + "\n", "utf8");

      shardCount += 1;
      totalTerms += termIds.length;
      log(`enriched ${categorySlug}/${novelId}: terms=${termIds.length}, shard=${shardFile}`);
    }
  }

  const encyclopediaResult = buildEncyclopediaWikiShards(manifestNovels);

  const manifest = {
    version: 3,
    generatedAt: new Date().toISOString(),
    novels: manifestNovels
  };

  return {
    manifest,
    shardCount: shardCount + encyclopediaResult.shardCount,
    termCount: totalTerms + encyclopediaResult.termCount
  };
}

const { manifest, shardCount, termCount } = buildWikiShardsFromDisk();

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

log(
  `written: manifest v${manifest.version}, novels=${Object.keys(manifest.novels).length}, terms=${termCount}, shards=${shardCount}, manifest=${manifestPath}`
);
