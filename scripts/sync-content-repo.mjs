import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const workspaceRoot = process.cwd();
const targetNovelsDir = path.join(workspaceRoot, "novels");

const contentRepo = process.env.CONTENT_REPO || "okx1970152/GIT-CF-YWXS";
const contentRepoRef = process.env.CONTENT_REPO_REF || "main";
const contentRepoToken = process.env.CONTENT_REPO_TOKEN || "";
const contentRepoNovelsPath = process.env.CONTENT_REPO_NOVELS_PATH || "novels";

function log(message) {
  process.stdout.write(`[sync-content] ${message}\n`);
}

function run(command, cwd) {
  execSync(command, {
    cwd,
    stdio: "inherit"
  });
}

function copyDirRecursive(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
      continue;
    }
    fs.copyFileSync(srcPath, dstPath);
  }
}

function clearDirectory(directory) {
  if (!fs.existsSync(directory)) return;
  for (const name of fs.readdirSync(directory)) {
    fs.rmSync(path.join(directory, name), { recursive: true, force: true });
  }
}

function hasLocalNovels() {
  return fs.existsSync(targetNovelsDir) && fs.readdirSync(targetNovelsDir).length > 0;
}

function printDirectoryDiagnostics(rootDir) {
  log(`[diag][env] cwd=${workspaceRoot}`);
  log(`[diag][env] targetNovelsDir=${targetNovelsDir}`);
  log(`[diag][env] contentRepoNovelsPath=${contentRepoNovelsPath}`);
  if (!fs.existsSync(rootDir)) {
    log(`[diag][sync] novels root missing: ${rootDir}`);
    return;
  }
  const categories = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));
  log(`[diag][sync] categories=${categories.join(",") || "none"}`);
  for (const category of categories) {
    const categoryDir = path.join(rootDir, category);
    const novels = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));
    log(`[diag][sync] ${category} novels=${novels.length}`);
    if (novels.length > 0) {
      const n = novels[0];
      const base = path.join(categoryDir, n);
      log(
        `[diag][sync] sample=${category}/${n} info=${fs.existsSync(path.join(base, "info", "index.md"))} chapters=${fs.existsSync(path.join(base, "chapters"))} annotations=${fs.existsSync(path.join(base, "annotations"))} metaNovel=${fs.existsSync(path.join(base, "meta", "novel.json"))}`
      );
    }
  }
}

function countValidNovels(rootDir) {
  if (!fs.existsSync(rootDir)) return 0;
  let count = 0;
  const categories = fs.readdirSync(rootDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const cat of categories) {
    const catDir = path.join(rootDir, cat.name);
    const novels = fs.readdirSync(catDir, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const novel of novels) {
      const infoPath = path.join(catDir, novel.name, "info", "index.md");
      if (fs.existsSync(infoPath)) count += 1;
    }
  }
  return count;
}

if (!contentRepoToken) {
  if (hasLocalNovels()) {
    log("未提供 CONTENT_REPO_TOKEN，使用本地 novels 目录继续构建。");
    printDirectoryDiagnostics(targetNovelsDir);
    process.exit(0);
  }
  log("错误：未提供 CONTENT_REPO_TOKEN，且本地 novels 目录为空。");
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novel-content-"));
const tempRepoDir = path.join(tempRoot, "repo");

try {
  const remoteUrl = `https://x-access-token:${contentRepoToken}@github.com/${contentRepo}.git`;
  log(`开始拉取内容仓 ${contentRepo}@${contentRepoRef} ...`);

  run(`git clone --depth=1 --filter=blob:none --no-checkout --branch "${contentRepoRef}" "${remoteUrl}" "${tempRepoDir}"`);
  run(`git sparse-checkout init --cone`, tempRepoDir);
  run(`git sparse-checkout set "${contentRepoNovelsPath}"`, tempRepoDir);
  run(`git checkout`, tempRepoDir);

  const fetchedNovelsDir = path.join(tempRepoDir, contentRepoNovelsPath);
  if (!fs.existsSync(fetchedNovelsDir)) {
    log(`错误：内容仓中未找到目录 ${contentRepoNovelsPath}`);
    process.exit(1);
  }

  fs.mkdirSync(targetNovelsDir, { recursive: true });
  clearDirectory(targetNovelsDir);
  copyDirRecursive(fetchedNovelsDir, targetNovelsDir);
  printDirectoryDiagnostics(targetNovelsDir);

  const novelCount = countValidNovels(targetNovelsDir);
  log(`内容同步完成：novels 已更新，检测到 ${novelCount} 部有效小说。`);
  if (novelCount === 0) {
    log("错误：同步后未检测到有效小说（缺少 info/index.md），中止构建。");
    process.exit(1);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
