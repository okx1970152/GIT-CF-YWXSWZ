import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const outRoot = path.join(workspaceRoot, "public", "__novel_meta__");

function log(message) {
  process.stdout.write(`[copy-novel-meta] ${message}\n`);
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

if (!fs.existsSync(novelsRoot)) {
  log("skip: novels/ not found");
  process.exit(0);
}

if (fs.existsSync(outRoot)) {
  fs.rmSync(outRoot, { recursive: true, force: true });
}

let total = 0;
for (const category of fs.readdirSync(novelsRoot, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const catPath = path.join(novelsRoot, category.name);
  for (const novel of fs.readdirSync(catPath, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const metaDir = path.join(catPath, novel.name, "meta");
    if (!fs.existsSync(metaDir)) continue;
    const dstBase = path.join(outRoot, category.name, novel.name);
    for (const name of fs.readdirSync(metaDir)) {
      if (!name.endsWith(".json") || name === "novel.json") continue;
      copyFile(path.join(metaDir, name), path.join(dstBase, name));
      total += 1;
    }
  }
}

log(`done: copied ${total} meta json files -> public/__novel_meta__/`);
