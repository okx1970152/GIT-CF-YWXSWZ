import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const targets = [
  path.join(projectRoot, "public", "__encyclopedia_assets__"),
  path.join(projectRoot, "public", "category"),
  path.join(projectRoot, "public", "novels")
];

for (const target of targets) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`removed ${path.relative(projectRoot, target)}`);
}
