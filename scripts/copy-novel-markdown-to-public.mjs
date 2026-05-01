import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const novelsRoot = path.join(workspaceRoot, "novels");
const outRoot = path.join(workspaceRoot, "public", "__novel_md__");

function log(message) {
  process.stdout.write(`[copy-novel-md] ${message}\n`);
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function walkCopyMd(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, name);
    const st = fs.statSync(srcPath);
    if (st.isDirectory()) {
      n += walkCopyMd(srcPath, path.join(dstDir, name));
      continue;
    }
    if (!name.endsWith(".md")) continue;
    copyFile(srcPath, path.join(dstDir, name));
    n += 1;
  }
  return n;
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
    const base = path.join(catPath, novel.name);
    const ch = path.join(base, "chapters");
    const an = path.join(base, "annotations");
    const dstBase = path.join(outRoot, category.name, novel.name);
    total += walkCopyMd(ch, path.join(dstBase, "chapters"));
    total += walkCopyMd(an, path.join(dstBase, "annotations"));
  }
}

log(`done: copied ${total} markdown files -> public/__novel_md__/`);
