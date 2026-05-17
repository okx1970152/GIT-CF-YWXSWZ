import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const diagnosticsDir = path.join(workspaceRoot, "diagnostics");
const reportJsonPath = path.join(diagnosticsDir, "content-diagnose.json");
const reportTxtPath = path.join(diagnosticsDir, "content-diagnose.txt");
const ENCYCLOPEDIA_CATEGORY_SLUG = "eastern-mythology-encyclopedia";

function log(message) {
  process.stdout.write(`[diag] ${message}\n`);
}

function safeListDirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function safeListFiles(dirPath, suffix = "") {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isFile() && (!suffix || d.name.endsWith(suffix)))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
}

function validateNovelInfoFrontmatter(frontmatter) {
  const errors = [];
  const requiredString = ["title", "category", "novel_id", "status", "updated_at"];
  for (const key of requiredString) {
    if (typeof frontmatter[key] !== "string" || frontmatter[key].trim() === "") {
      errors.push(`missing_or_invalid_${key}`);
    }
  }
  const summary = typeof frontmatter.summary === "string" ? frontmatter.summary.trim() : "";
  const desc = typeof frontmatter.desc === "string" ? frontmatter.desc.trim() : "";
  if (!summary && !desc) {
    errors.push("missing_summary_and_desc");
  }
  if (typeof frontmatter.total_chapters !== "number") {
    errors.push("missing_or_invalid_total_chapters");
  }
  if (frontmatter.tags !== undefined && !Array.isArray(frontmatter.tags)) {
    errors.push("invalid_tags_type");
  }
  return errors;
}

function validateEncyclopediaEntryPayload(payload) {
  const errors = [];
  const meta = typeof payload?.meta === "object" && payload.meta !== null ? payload.meta : {};
  const titleEn = typeof meta.title_en === "string" ? meta.title_en.trim() : "";
  const slug = typeof meta.english_slug === "string" ? meta.english_slug.trim() : "";

  if (!titleEn) errors.push("missing_meta.title_en");
  if (!slug) errors.push("missing_meta.english_slug");

  return errors;
}

function buildReport() {
  const report = {
    env: {
      cwd: workspaceRoot,
      novelsRoot,
    },
    summary: {
      categories: 0,
      novels: 0,
      validNovels: 0,
      invalidNovels: 0,
      missingInfo: 0,
      missingChapters: 0,
      missingAnnotations: 0,
      missingMetaNovel: 0,
      schemaErrors: 0,
    },
    categories: [],
    errors: [],
  };

  const categories = safeListDirs(novelsRoot);
  report.summary.categories = categories.length;

  for (const category of categories) {
    const categoryPath = path.join(novelsRoot, category);
    const novels = safeListDirs(categoryPath);
    const categoryEntry = { category, novels: [] };

    for (const novel of novels) {
      report.summary.novels += 1;

      const basePath = path.join(categoryPath, novel);
      const infoPath = path.join(basePath, "info", "index.md");
      const chaptersPath = path.join(basePath, "chapters");
      const annotationsPath = path.join(basePath, "annotations");
      const metaNovelPath = path.join(basePath, "meta", "novel.json");
      const isEncyclopedia = category === ENCYCLOPEDIA_CATEGORY_SLUG;

      const chapterFiles = safeListFiles(chaptersPath, ".md");
      const annotationFiles = safeListFiles(annotationsPath, ".md");
      const encyclopediaEntryFiles = isEncyclopedia ? safeListFiles(basePath, ".json") : [];

      const entry = {
        category,
        novel,
        basePath,
        hasInfo: fs.existsSync(infoPath),
        hasMetaNovel: fs.existsSync(metaNovelPath),
        chapterCount: chapterFiles.length,
        annotationCount: annotationFiles.length,
        encyclopediaEntryCount: encyclopediaEntryFiles.length,
        chapterMetaCount: 0,
        schemaErrors: [],
        fileErrors: [],
      };

      if (!entry.hasInfo) {
        report.summary.missingInfo += 1;
        report.summary.invalidNovels += 1;
        report.errors.push(`[schema] ${category}/${novel} missing info/index.md`);
      } else {
        try {
          const raw = fs.readFileSync(infoPath, "utf8");
          const { data } = matter(raw);
          const schemaErrors = validateNovelInfoFrontmatter(data);
          entry.schemaErrors = schemaErrors;
          if (schemaErrors.length) {
            report.summary.schemaErrors += schemaErrors.length;
            report.summary.invalidNovels += 1;
            report.errors.push(`[schema] ${category}/${novel} ${schemaErrors.join(",")}`);
          }
        } catch (err) {
          report.summary.schemaErrors += 1;
          report.summary.invalidNovels += 1;
          report.errors.push(`[schema] ${category}/${novel} parse_error: ${String(err)}`);
        }
      }

      if (!entry.hasMetaNovel) {
        report.summary.missingMetaNovel += 1;
        report.summary.invalidNovels += 1;
        report.errors.push(`[files] ${category}/${novel} missing meta/novel.json`);
      }

      if (isEncyclopedia) {
        if (entry.encyclopediaEntryCount === 0) {
          report.summary.invalidNovels += 1;
          report.errors.push(`[files] ${category}/${novel} missing encyclopedia entry *.json`);
        }

        for (const fileName of encyclopediaEntryFiles) {
          const filePath = path.join(basePath, fileName);
          let payload;

          try {
            payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
          } catch (err) {
            entry.fileErrors.push(`invalid_encyclopedia_entry_json:${fileName}:${String(err)}`);
            continue;
          }

          const payloadErrors = validateEncyclopediaEntryPayload(payload);
          if (payloadErrors.length) {
            entry.fileErrors.push(
              `invalid_encyclopedia_entry:${fileName}:${payloadErrors.join(",")}`
            );
          }
        }
      } else {
        if (entry.chapterCount === 0) {
          report.summary.missingChapters += 1;
          report.summary.invalidNovels += 1;
          report.errors.push(`[files] ${category}/${novel} missing chapters/*.md`);
        }
        if (entry.annotationCount === 0) {
          report.summary.missingAnnotations += 1;
          report.summary.invalidNovels += 1;
          report.errors.push(`[files] ${category}/${novel} missing annotations/*.md`);
        }

        const chapterNoSet = new Set();
        for (const fileName of chapterFiles) {
          const m = fileName.match(/^(\d{4})-[A-Za-z0-9-]+\.md$/);
          if (!m) {
            entry.fileErrors.push(`invalid_chapter_file:${fileName}`);
            continue;
          }
          chapterNoSet.add(m[1]);
        }

        const annotationNoSet = new Set();
        for (const fileName of annotationFiles) {
          let m = fileName.match(/^(\d{4})\.md$/);
          if (!m) m = fileName.match(/^(\d{4})-[A-Za-z0-9-]+-guide\.md$/);
          if (!m) {
            entry.fileErrors.push(`invalid_annotation_file:${fileName}`);
            continue;
          }
          annotationNoSet.add(m[1]);
        }

        const chapterMetaFiles = safeListFiles(path.join(basePath, "meta"), ".json").filter(
          (name) => name !== "novel.json"
        );
        const chapterMetaNoSet = new Set();
        for (const fileName of chapterMetaFiles) {
          let m = fileName.match(/^(\d{4})\.json$/);
          if (!m) m = fileName.match(/^(\d{4})-[A-Za-z0-9-]+\.json$/);
          if (!m) {
            entry.fileErrors.push(`invalid_chapter_meta_file:${fileName}`);
            continue;
          }
          chapterMetaNoSet.add(m[1]);
        }
        entry.chapterMetaCount = chapterMetaNoSet.size;

        for (const chapterNo of chapterNoSet) {
          if (!annotationNoSet.has(chapterNo)) {
            entry.fileErrors.push(`missing_annotation_for_chapter:${chapterNo}`);
          }
          if (!chapterMetaNoSet.has(chapterNo)) {
            entry.fileErrors.push(`missing_meta_for_chapter:${chapterNo}`);
          }
        }
      }

      if (entry.fileErrors.length) {
        report.summary.schemaErrors += entry.fileErrors.length;
        report.summary.invalidNovels += 1;
        report.errors.push(`[files] ${category}/${novel} ${entry.fileErrors.join(",")}`);
      }

      if (
        entry.hasInfo &&
        entry.hasMetaNovel &&
        entry.schemaErrors.length === 0 &&
        entry.fileErrors.length === 0 &&
        (isEncyclopedia
          ? entry.encyclopediaEntryCount > 0
          : entry.chapterCount > 0 && entry.annotationCount > 0)
      ) {
        report.summary.validNovels += 1;
      }

      categoryEntry.novels.push(entry);
    }

    report.categories.push(categoryEntry);
  }

  return report;
}

function writeReport(report) {
  fs.mkdirSync(diagnosticsDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");

  const lines = [];
  lines.push("[diag][env]");
  lines.push(`cwd=${report.env.cwd}`);
  lines.push(`novelsRoot=${report.env.novelsRoot}`);
  lines.push("");
  lines.push("[diag][summary]");
  for (const [key, value] of Object.entries(report.summary)) {
    lines.push(`${key}=${value}`);
  }
  lines.push("");
  lines.push("[diag][errors]");
  if (report.errors.length === 0) {
    lines.push("none");
  } else {
    lines.push(...report.errors);
  }

  fs.writeFileSync(reportTxtPath, lines.join("\n") + "\n", "utf8");
}

try {
  const report = buildReport();
  writeReport(report);
  log(`[env] cwd=${report.env.cwd}`);
  log(`[env] novelsRoot=${report.env.novelsRoot}`);
  log(
    `[summary] valid_novels=${report.summary.validNovels} invalid_novels=${report.summary.invalidNovels} schema_errors=${report.summary.schemaErrors}`
  );
  log(`[summary] report_json=${reportJsonPath}`);
  log(`[summary] report_txt=${reportTxtPath}`);

  if (report.summary.validNovels === 0 || report.summary.invalidNovels > 0) {
    log("[error] diagnosis failed: invalid content directories detected; check diagnostics report.");
    process.exit(1);
  }
} catch (err) {
  log(`[error] diagnose_content_exception=${String(err?.message || err)}`);
  if (err?.stack) log(`[error] stack=${err.stack}`);
  process.exit(1);
}
