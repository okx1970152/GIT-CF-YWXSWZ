/**
 * 将构建生成的索引 JSON 复制到 public，随 ASSETS 发布；Worker 上无 Node fs 可读 data/ 时，
 * 由 instrumentation 通过 ASSETS.fetch 预载到内存（见 lib/content/content-index.ts / wiki-index.ts）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "__site_data__");
const wikiSrcDir = path.join(root, "data", "wiki");
const wikiOutDir = path.join(outDir, "wiki");
const encyclopediaSrcDir = path.join(root, "data", "encyclopedia");
const encyclopediaOutDir = path.join(outDir, "encyclopedia");

fs.mkdirSync(outDir, { recursive: true });

const rootFiles = ["content-index.json", "wiki-manifest.json", "encyclopedia-index.json"];

for (const name of rootFiles) {
  const src = path.join(root, "data", name);
  const dst = path.join(outDir, name);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-site-index] skip missing: ${src}`);
    continue;
  }
  fs.copyFileSync(src, dst);
  console.log(`[copy-site-index] ${name} -> public/__site_data__/`);
}

if (fs.existsSync(wikiSrcDir)) {
  if (fs.existsSync(wikiOutDir)) {
    fs.rmSync(wikiOutDir, { recursive: true, force: true });
  }
  fs.cpSync(wikiSrcDir, wikiOutDir, { recursive: true });
  console.log(`[copy-site-index] data/wiki/ -> public/__site_data__/wiki/`);
} else {
  console.warn(`[copy-site-index] skip missing wiki dir: ${wikiSrcDir}`);
}

if (fs.existsSync(encyclopediaSrcDir)) {
  if (fs.existsSync(encyclopediaOutDir)) {
    fs.rmSync(encyclopediaOutDir, { recursive: true, force: true });
  }
  fs.cpSync(encyclopediaSrcDir, encyclopediaOutDir, { recursive: true });
  console.log(`[copy-site-index] data/encyclopedia/ -> public/__site_data__/encyclopedia/`);
} else {
  console.warn(`[copy-site-index] skip missing encyclopedia dir: ${encyclopediaSrcDir}`);
}
