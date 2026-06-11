import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const nextAppRoot = path.join(workspaceRoot, ".next", "server", "app");
const openNextAssetsRoot = path.join(workspaceRoot, ".open-next", "assets");
const publicRoot = path.join(workspaceRoot, "public");

const CATEGORY_SLUGS = ["xiuxian", "wuxia", "xuanhuan", "ranking"];
const NOVEL_CATEGORY_SLUGS = ["xiuxian", "wuxia", "xuanhuan"];

function log(message) {
  process.stdout.write(`[publish-built-static] ${message}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeStaticHtmlFromBuilt(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function listDirectories(rootPath) {
  if (!fs.existsSync(rootPath)) return [];
  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function listChapterHtmlFiles(rootPath) {
  if (!fs.existsSync(rootPath)) return [];
  return fs
    .readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => entry.name);
}

function resolveOutputRoot() {
  if (fs.existsSync(openNextAssetsRoot)) return openNextAssetsRoot;
  return publicRoot;
}

function main() {
  const outputRoot = resolveOutputRoot();
  let categoryCount = 0;
  let directoryCount = 0;
  let chapterCount = 0;

  for (const slug of CATEGORY_SLUGS) {
    const sourcePath = path.join(nextAppRoot, "category", `${slug}.html`);
    const targetPath = path.join(outputRoot, "category", slug, "index.html");
    if (writeStaticHtmlFromBuilt(sourcePath, targetPath)) {
      categoryCount += 1;
    } else {
      log(`missing category html: ${sourcePath}`);
    }
  }

  for (const categorySlug of NOVEL_CATEGORY_SLUGS) {
    const categoryRoot = path.join(nextAppRoot, "novels", categorySlug);
    for (const novelId of listDirectories(categoryRoot)) {
      const sourcePath = path.join(categoryRoot, `${novelId}.html`);
      const targetPath = path.join(outputRoot, "novels", categorySlug, novelId, "index.html");
      if (writeStaticHtmlFromBuilt(sourcePath, targetPath)) {
        directoryCount += 1;
      } else {
        log(`missing directory html: ${sourcePath}`);
      }

      const builtChaptersRoot = path.join(categoryRoot, novelId, "chapters");
      for (const chapterFile of listChapterHtmlFiles(builtChaptersRoot)) {
        const chapterNo = chapterFile.replace(/\.html$/i, "");
        const chapterSourcePath = path.join(builtChaptersRoot, chapterFile);
        const chapterTargetPath = path.join(
          outputRoot,
          "novels",
          categorySlug,
          novelId,
          "chapters",
          chapterNo,
          "index.html"
        );
        if (writeStaticHtmlFromBuilt(chapterSourcePath, chapterTargetPath)) {
          chapterCount += 1;
        }
      }
    }
  }

  log(`published built novel static html: categories=${categoryCount}, directories=${directoryCount}, chapters=${chapterCount}, output=${outputRoot}`);
}

main();
