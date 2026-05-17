import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const publicRoot = path.join(workspaceRoot, "public");
const categoryOutRoot = path.join(publicRoot, "category", "eastern-mythology-encyclopedia");
const novelsOutRoot = path.join(publicRoot, "novels", "eastern-mythology-encyclopedia");
const assetsOutRoot = path.join(publicRoot, "__encyclopedia_assets__");
const indexPath = path.join(dataRoot, "encyclopedia-index.json");
const localEncyclopediaSourceRoot = path.join(workspaceRoot, "novels", "eastern-mythology-encyclopedia");
const fallbackEncyclopediaSourceRoot = path.join(
  workspaceRoot,
  "..",
  "小说素材爬取",
  "7-最终发布结果",
  "novels",
  "eastern-mythology-encyclopedia"
);

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://wx.0o0o.mom").replace(/\/+$/, "");
const SITE_NAME = "Novel Portal";
const NAV_CATEGORIES = [
  { slug: "xiuxian", label: "XiuXian" },
  { slug: "wuxia", label: "WuXia" },
  { slug: "xuanhuan", label: "XuanHuan" },
  { slug: "ranking", label: "Ranking" },
  { slug: "eastern-mythology-encyclopedia", label: "Eastern Mythology Encyclopedia" }
];
const SHARE_PLATFORMS = [
  { name: "X", icon: "/LOGO/x.png" },
  { name: "Facebook", icon: "/LOGO/facebook.png" },
  { name: "Telegram", icon: "/LOGO/telegram.png" },
  { name: "Reddit", icon: "/LOGO/reddit.png" }
];

function log(message) {
  process.stdout.write(`[encyclopedia-static] ${message}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function copyBinaryFile(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function wipeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  ensureDir(dirPath);
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

function absoluteUrl(relPath) {
  return relPath.startsWith("/") ? `${SITE_URL}${relPath}` : `${SITE_URL}/${relPath}`;
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function trimDescription(value, maxLength = 180) {
  const compact = compactText(value);
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function normalizeLookupKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9\u3400-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function splitParagraphs(text) {
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderParagraphBlocks(text) {
  return splitParagraphs(text)
    .map(
      (paragraph) =>
        `<p class="prose-block">${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`
    )
    .join("\n");
}

function hasUsableEncyclopediaSourceRoot(candidateRoot) {
  if (!candidateRoot || !fs.existsSync(candidateRoot)) return false;
  return ["xian", "shen", "fo", "yao", "mo", "gui", "ren", "dijie", "famen", "qiwu"].every((volumeKey) => {
    const volumeDir = path.join(candidateRoot, volumeKey);
    const infoPath = path.join(volumeDir, "info", "index.md");
    const metaPath = path.join(volumeDir, "meta", "novel.json");
    return fs.existsSync(volumeDir) && fs.existsSync(infoPath) && fs.existsSync(metaPath);
  });
}

function resolveEncyclopediaSourceRoot() {
  if (hasUsableEncyclopediaSourceRoot(localEncyclopediaSourceRoot)) return localEncyclopediaSourceRoot;
  if (hasUsableEncyclopediaSourceRoot(fallbackEncyclopediaSourceRoot)) return fallbackEncyclopediaSourceRoot;
  return null;
}

function renderTextList(items) {
  return items
    .map((text) => renderParagraphBlocks(text))
    .filter(Boolean)
    .join("\n");
}

function renderJsonLd(nodes) {
  return nodes
    .filter(Boolean)
    .map(
      (node, index) =>
        `<script type="application/ld+json" id="ld-json-${index + 1}">${escapeJsonForScript(node)}</script>`
    )
    .join("\n");
}

function encyclopediaHubPath() {
  return "/category/eastern-mythology-encyclopedia/";
}

function volumePath(volume) {
  return `/novels/eastern-mythology-encyclopedia/${encodePathSegment(volume.novelId)}/`;
}

function entryPath(volume, entry) {
  return `${volumePath(volume)}chapters/${encodePathSegment(entry.slug)}/`;
}

function entryImagePublicPath(volume, entrySummary) {
  return `${volumePath(volume)}images/${encodePathSegment(entrySummary.chapterNo)}.webp`;
}

function resolveEntryImageSourcePath(volume, entrySummary, sourceRoot) {
  if (!sourceRoot) return null;
  const chapterNo = getString(entrySummary.chapterNo);
  if (!chapterNo || !getString(volume.volumeKey)) return null;
  const candidatePath = path.join(sourceRoot, volume.volumeKey, "images", `${chapterNo}.webp`);
  return fs.existsSync(candidatePath) ? candidatePath : null;
}

function copyOptionalEntryImage(volume, entrySummary, sourceRoot) {
  const sourcePath = resolveEntryImageSourcePath(volume, entrySummary, sourceRoot);
  if (!sourcePath) return null;
  const outputPath = path.join(novelsOutRoot, volume.novelId, "images", `${entrySummary.chapterNo}.webp`);
  copyBinaryFile(sourcePath, outputPath);
  return entryImagePublicPath(volume, entrySummary);
}

function sharedStyles() {
  return `
    :root{
      --bg:#e8f3e8;
      --surface:#f5faf4;
      --card:#f9fcf8;
      --line:#cfe3cf;
      --deep:#243a2b;
      --soft:#4d6654;
      --muted:#718575;
      --accent:#07c160;
      --accent-deep:#05944a;
      --accent-soft:#dff7e8;
      --shadow:0 18px 42px rgba(36,58,43,.08);
    }
    *{box-sizing:border-box}
    html{color-scheme:light}
    body{
      margin:0;
      min-height:100vh;
      color:var(--deep);
      background:
        radial-gradient(circle at top left, rgba(7,193,96,.08), transparent 24rem),
        radial-gradient(circle at top right, rgba(159,215,176,.18), transparent 22rem),
        linear-gradient(180deg,#f1f8ef 0%,var(--bg) 100%);
      font-family:Georgia,"Times New Roman",serif;
    }
    a{color:inherit;text-decoration:none}
    .site-header{
      position:sticky;top:0;z-index:30;
      border-bottom:1px solid var(--line);
      background:rgba(245,250,244,.95);
      backdrop-filter:blur(10px)
    }
    .site-header__inner{max-width:1400px;margin:0 auto;padding:16px 18px}
    .site-header__stack{display:flex;flex-direction:column;gap:12px}
    .site-header__categories{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding-bottom:12px;border-bottom:1px solid var(--line)}
    .site-header__tools{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .site-pill,.site-pill--active,.site-home,.site-search button,.site-ads,.meta-grid,.tag,.eyebrow,.chip{
      font-family:ui-sans-serif,system-ui,sans-serif
    }
    .site-pill,.site-home{
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--line);border-radius:999px;background:var(--surface);
      padding:8px 13px;font-size:14px;font-weight:600;color:var(--soft);
      transition:background-color .18s ease,color .18s ease,border-color .18s ease,transform .18s ease
    }
    .site-pill:hover,.site-home:hover{background:#ddeedd;color:var(--deep);border-color:#b8d6bc}
    .site-pill--active{
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--accent);border-radius:999px;background:var(--accent);
      padding:8px 13px;font-size:14px;font-weight:700;color:#fff;
      box-shadow:0 1px 0 0 var(--surface)
    }
    .site-home{border-radius:12px}
    .site-search{
      display:flex;gap:8px;min-width:min(100%,360px)
    }
    .site-search input{
      flex:1;min-width:180px;border:1px solid var(--line);border-radius:12px;
      padding:10px 12px;background:var(--surface);color:var(--deep);
      font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif
    }
    .site-search button,.site-ads{
      border:none;border-radius:12px;background:var(--accent);padding:10px 14px;
      font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:#fff;
      box-shadow:0 2px 10px rgba(7,193,96,.18);
      transition:background-color .18s ease,transform .18s ease,box-shadow .18s ease
    }
    .site-search button:hover,.site-ads:hover{background:#06a552;transform:translateY(-1px);box-shadow:0 8px 18px rgba(7,193,96,.22)}
    .shell{max-width:1400px;margin:0 auto;padding:24px 18px 72px}
    .hero,.section-card,.entry-card,.term-card,.rail-card{
      border:1px solid var(--line);border-radius:28px;background:rgba(249,252,248,.94);
      box-shadow:var(--shadow)
    }
    .hero{padding:34px 28px}
    .section-card,.rail-card{padding:24px 22px}
    .entry-card,.term-card{padding:20px 20px}
    .eyebrow{
      color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase
    }
    .title{margin:14px 0 0;font-size:clamp(2.2rem,4vw,3.7rem);line-height:1.04;letter-spacing:-.03em}
    .subtitle{margin:12px 0 0;font-size:1.18rem;line-height:1.8;color:var(--soft)}
    .subhead{margin:8px 0 0;font-size:1.2rem;color:var(--soft)}
    .section-title{margin:0;font-size:1.7rem;line-height:1.2}
    .meta-grid{
      display:grid;gap:14px;margin-top:22px;
      grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
      color:var(--soft);font-size:14px
    }
    .meta-grid strong{display:block;margin-bottom:4px;color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}
    .grid{display:grid;gap:18px}
    .grid--volumes{grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:22px}
    .grid--entries{margin-top:22px}
    .grid--reading{
      display:grid;
      grid-template-columns:minmax(0,780px) minmax(280px,340px);
      justify-content:center;
      align-items:start;
      gap:20px;
      margin-top:24px
    }
    .volume-card,.entry-link,.relation-link{
      display:block;border:1px solid var(--line);border-radius:24px;background:var(--card);padding:22px;box-shadow:0 12px 28px rgba(36,58,43,.06);
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease
    }
    .volume-card:hover,.entry-link:hover,.relation-link:hover{
      transform:translateY(-2px);border-color:var(--accent);box-shadow:0 18px 36px rgba(7,193,96,.12)
    }
    .card-title{margin:10px 0 0;font-size:1.7rem;line-height:1.2}
    .card-title--small{margin:0;font-size:1.45rem;line-height:1.25}
    .card-copy{margin:14px 0 0;font-size:1rem;line-height:1.8;color:var(--soft)}
    .card-meta{margin-top:16px;color:var(--muted);font-size:13px}
    .stack{
      display:flex;
      flex-direction:column;
      gap:20px;
      align-self:start
    }
    .prose-block{margin:0;font-size:1.03rem;line-height:1.95;color:var(--soft)}
    .prose-group{display:grid;gap:18px}
    .tag-row,.chip-row,.share-row{display:flex;flex-wrap:wrap;gap:10px}
    .tag,.chip{
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--line);border-radius:999px;background:var(--card);
      padding:9px 13px;font-size:13px;font-weight:600;color:var(--soft)
    }
    .share-row{margin-top:18px}
    .share-button{
      display:inline-flex;align-items:center;gap:8px;
      border:1px solid var(--line);border-radius:999px;background:var(--card);
      padding:9px 12px;font:700 13px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep);
      transition:background-color .18s ease,border-color .18s ease,transform .18s ease
    }
    .share-button:hover{background:var(--accent-soft);border-color:#9cd8b5;transform:translateY(-1px)}
    .share-button img{width:16px;height:16px;object-fit:contain}
    .breadcrumbs{
      display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted)
    }
    .breadcrumbs a{color:var(--accent-deep)}
    .hub-shell{
      max-width:1240px;
      padding-top:28px
    }
    .hub-section{
      display:grid;
      gap:22px
    }
    .hub-top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      flex-wrap:wrap
    }
    .hub-title-group{min-width:0}
    .hub-kicker{
      margin:0;
      color:var(--muted);
      font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.18em;
      text-transform:uppercase
    }
    .hub-title{
      margin:8px 0 0;
      font-size:clamp(1.9rem,3vw,2.55rem);
      line-height:1.08;
      letter-spacing:-.03em
    }
    .hub-subtitle{
      margin:10px 0 0;
      max-width:780px;
      color:var(--soft);
      font-size:1rem;
      line-height:1.8
    }
    .pagination-mini{
      display:flex;
      align-items:center;
      gap:10px
    }
    .page-btn{
      border:1px solid var(--line);
      border-radius:12px;
      background:rgba(255,255,255,.92);
      padding:9px 14px;
      color:var(--soft);
      font:700 13px/1 ui-sans-serif,system-ui,sans-serif;
      box-shadow:0 6px 16px rgba(36,58,43,.05)
    }
    .page-btn[disabled]{
      opacity:.78;
      cursor:not-allowed
    }
    .hub-grid{
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
      gap:24px
    }
    .hub-card{
      display:flex;
      flex-direction:column;
      min-height:420px;
      border:1px solid var(--line);
      border-radius:24px;
      background:rgba(255,255,255,.96);
      padding:24px;
      box-shadow:0 16px 34px rgba(36,58,43,.06);
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease
    }
    .hub-card:hover{
      transform:translateY(-2px);
      border-color:#9cd8b5;
      box-shadow:0 22px 40px rgba(7,193,96,.12)
    }
    .hub-card__title{
      margin:0;
      font-size:2rem;
      line-height:1.15;
      text-align:center;
      letter-spacing:-.03em
    }
    .hub-card__subtitle{
      margin:12px 0 0;
      text-align:center;
      color:var(--soft);
      font-size:1.08rem
    }
    .hub-card__meta{
      display:grid;
      gap:8px;
      margin-top:22px;
      color:var(--soft);
      font:500 14px/1.5 ui-sans-serif,system-ui,sans-serif
    }
    .hub-card__meta-row{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px 18px
    }
    .hub-card__meta p{
      margin:0;
      display:flex;
      justify-content:space-between;
      gap:8px
    }
    .hub-card__meta span{
      color:var(--muted);
      font-weight:700
    }
    .hub-card__summary{
      margin:18px 0 0;
      color:var(--soft);
      font-size:15px;
      line-height:1.8;
      overflow:hidden;
      display:-webkit-box;
      -webkit-line-clamp:7;
      -webkit-box-orient:vertical
    }
    .hub-card__footer{
      margin-top:auto;
      padding-top:14px;
      border-top:1px solid rgba(207,227,207,.9);
      display:grid;
      gap:10px
    }
    .hub-card__share{
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      flex-wrap:wrap
    }
    .hub-card__share-label{
      color:var(--muted);
      font:700 12px/1 ui-sans-serif,system-ui,sans-serif
    }
    .hub-card__share .share-button{
      min-width:0;
      min-height:34px;
      padding:8px 10px
    }
    .hub-card__share .share-button span{display:none}
    .hub-card__hint{
      color:#8a9890;
      font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;
      text-align:center
    }
    .entry-shell{
      max-width:1280px;
      padding-top:24px
    }
    .entry-layout{
      display:grid;
      grid-template-columns:minmax(0,1.68fr) minmax(300px,360px);
      align-items:start;
      gap:24px
    }
    .entry-main-card{
      border:1px solid var(--line);
      border-radius:28px;
      background:rgba(255,255,255,.96);
      padding:30px 30px 26px;
      box-shadow:var(--shadow)
    }
    .entry-header{
      display:grid;
      gap:12px
    }
    .entry-header__kicker{
      margin:0;
      color:var(--muted);
      font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.18em;
      text-transform:uppercase
    }
    .entry-header__title{
      margin:0;
      font-size:clamp(2rem,3.6vw,3rem);
      line-height:1.06;
      letter-spacing:-.03em
    }
    .entry-header__subtitle{
      margin:0;
      color:var(--soft);
      font-size:1.16rem
    }
    .entry-header__meta{
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      margin-top:2px
    }
    .entry-header__meta-chip{
      display:inline-flex;
      align-items:center;
      gap:6px;
      border:1px solid var(--line);
      border-radius:999px;
      background:var(--surface);
      padding:8px 12px;
      color:var(--soft);
      font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .entry-header__meta-chip strong{
      color:var(--muted);
      font-weight:700
    }
    .entry-header__hook{
      margin:2px 0 0;
      color:var(--soft);
      font-size:1.07rem;
      line-height:1.86
    }
    .entry-visual-toggle{
      margin-top:18px;
      border:1px solid var(--line);
      border-radius:20px;
      background:rgba(249,252,248,.97);
      box-shadow:0 12px 28px rgba(36,58,43,.05);
      overflow:hidden
    }
    .entry-visual-toggle[open]{
      border-color:#9cd8b5;
      box-shadow:0 16px 32px rgba(7,193,96,.08)
    }
    .entry-visual-toggle__summary{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      min-height:44px;
      padding:10px 16px;
      list-style:none;
      cursor:pointer;
      color:var(--accent-deep);
      background:linear-gradient(180deg, rgba(223,247,232,.96) 0%, rgba(239,249,242,.96) 100%);
      font:700 14px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .entry-visual-toggle__summary::-webkit-details-marker{display:none}
    .entry-visual-toggle__summary-text{
      min-width:0
    }
    .entry-visual-toggle__summary-icon{
      flex:0 0 auto;
      font-size:12px;
      transition:transform .18s ease
    }
    .entry-visual-toggle[open] .entry-visual-toggle__summary-icon{
      transform:rotate(180deg)
    }
    .entry-visual-figure{
      margin:0;
      padding:12px;
      background:rgba(255,255,255,.92)
    }
    .entry-visual-figure img{
      display:block;
      width:100%;
      height:auto;
      max-height:520px;
      object-fit:cover;
      border-radius:16px;
      background:#eef7f0
    }
    .entry-visual-figure figcaption{
      margin-top:10px;
      color:var(--muted);
      font:600 12px/1.6 ui-sans-serif,system-ui,sans-serif;
      text-align:center
    }
    .entry-body{
      margin-top:24px;
      padding-top:22px;
      border-top:1px solid rgba(207,227,207,.85)
    }
    .entry-body .prose-group{gap:20px}
    .entry-body .prose-block{
      font-size:1.06rem;
      line-height:1.95;
      color:var(--deep)
    }
    .entry-subsection{
      margin-top:24px;
      border:1px solid var(--line);
      border-radius:22px;
      background:rgba(249,252,248,.95);
      padding:20px 20px 18px;
      box-shadow:0 12px 28px rgba(36,58,43,.05)
    }
    .entry-subsection .section-title{
      font-size:1.24rem
    }
    .entry-subsection .entry-side-stack,
    .entry-subsection .chip-row,
    .entry-subsection .prose-group{
      margin-top:14px
    }
    .entry-nav{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:12px;
      margin-top:28px;
      padding-top:18px;
      border-top:1px solid rgba(207,227,207,.9)
    }
    .entry-nav__item{
      display:flex;
      min-height:74px;
      flex-direction:column;
      justify-content:center;
      border:1px solid var(--line);
      border-radius:18px;
      background:var(--surface);
      padding:14px 16px;
      transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease
    }
    a.entry-nav__item:hover{
      transform:translateY(-1px);
      border-color:#9cd8b5;
      box-shadow:0 14px 28px rgba(7,193,96,.1)
    }
    .entry-nav__item strong{
      display:block;
      color:var(--muted);
      font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.14em;
      text-transform:uppercase
    }
    .entry-nav__item span{
      display:block;
      margin-top:8px;
      color:var(--soft);
      font-size:.98rem;
      line-height:1.55
    }
    .entry-nav__item--center{
      align-items:center;
      text-align:center
    }
    .entry-nav__item--center span{
      color:var(--accent-deep);
      font-weight:700
    }
    .entry-nav__item--top span{
      color:var(--accent-deep);
      font-weight:700
    }
    .entry-sidebar{
      display:grid;
      gap:18px;
      align-content:start;
      position:sticky;
      top:88px
    }
    .entry-side-card{
      border:1px solid var(--line);
      border-radius:22px;
      background:rgba(249,252,248,.95);
      padding:18px 18px 17px;
      box-shadow:0 12px 28px rgba(36,58,43,.06)
    }
    .entry-side-card .section-title{
      font-size:1.18rem
    }
    .entry-side-card .prose-group{
      gap:16px
    }
    .entry-side-card .prose-block{
      font-size:.98rem;
      line-height:1.82
    }
    .entry-side-stack{
      display:grid;
      gap:14px;
      margin-top:14px
    }
    .volume-shell{padding-top:18px}
    .volume-breadcrumbs{margin-bottom:14px}
    .volume-info-card,
    .entries-card{
      border:1px solid var(--line);
      border-radius:28px;
      background:rgba(255,255,255,.94);
      box-shadow:var(--shadow)
    }
    .volume-info-card{
      display:grid;
      grid-template-columns:minmax(0,1.7fr) minmax(260px,.95fr);
      gap:28px;
      padding:28px
    }
    .volume-main{min-width:0}
    .volume-kicker{
      color:var(--muted);
      font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.18em;
      text-transform:uppercase
    }
    .volume-title{
      margin:12px 0 0;
      font-size:clamp(2.1rem,4vw,3.15rem);
      line-height:1.06;
      letter-spacing:-.03em
    }
    .volume-subtitle{
      margin:10px 0 0;
      font-size:1.22rem;
      color:var(--soft)
    }
    .volume-description{
      display:grid;
      gap:14px;
      margin-top:18px
    }
    .volume-description p{
      margin:0;
      font-size:1.03rem;
      line-height:1.88;
      color:var(--soft)
    }
    .volume-tags{margin-top:22px}
    .volume-actions{
      display:flex;
      flex-wrap:wrap;
      gap:12px;
      margin-top:24px
    }
    .volume-action{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:44px;
      border-radius:14px;
      padding:0 18px;
      font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;
      transition:background-color .18s ease,border-color .18s ease,transform .18s ease,box-shadow .18s ease
    }
    .volume-action:hover{transform:translateY(-1px)}
    .volume-action--primary{
      border:1px solid var(--accent);
      background:var(--accent);
      color:#fff;
      box-shadow:0 8px 18px rgba(7,193,96,.16)
    }
    .volume-action--primary:hover{background:#06a552}
    .volume-action--secondary{
      border:1px solid var(--line);
      background:var(--surface);
      color:var(--deep)
    }
    .volume-action--secondary:hover{
      border-color:#9cd8b5;
      background:#eef7f0
    }
    .volume-sidebar{
      display:flex;
      flex-direction:column;
      gap:18px;
      min-width:0;
      padding-left:24px;
      border-left:1px solid rgba(207,227,207,.9)
    }
    .volume-meta-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:14px 16px
    }
    .volume-meta-item{
      min-width:0;
      border:1px solid var(--line);
      border-radius:18px;
      background:var(--surface);
      padding:14px 14px 13px
    }
    .volume-meta-item strong{
      display:block;
      margin-bottom:6px;
      color:var(--muted);
      font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.14em;
      text-transform:uppercase
    }
    .volume-meta-item span{
      display:block;
      color:var(--deep);
      font:600 14px/1.6 ui-sans-serif,system-ui,sans-serif;
      overflow-wrap:anywhere
    }
    .volume-share{margin-top:auto}
    .volume-share .share-row{margin-top:10px}
    .volume-share .share-button{
      min-height:38px;
      padding:8px 11px;
      font-size:12px
    }
    .entries-card{
      margin-top:26px;
      padding:24px 22px
    }
    .entries-layout{
      display:grid;
      grid-template-columns:minmax(0,1fr) 292px;
      gap:22px;
      align-items:start;
      margin-top:18px
    }
    .entries-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      flex-wrap:wrap
    }
    .entries-caption{
      color:var(--text-soft, var(--soft));
      font:500 14px/1.7 ui-sans-serif,system-ui,sans-serif
    }
    .entries-list{
      display:grid;
      gap:12px;
      margin-top:18px
    }
    .entries-stack{
      display:grid;
      gap:22px
    }
    .range-group{
      border:1px solid var(--line);
      border-radius:24px;
      background:rgba(247,251,246,.96);
      padding:18px 18px 16px;
      box-shadow:0 10px 24px rgba(36,58,43,.05)
    }
    .range-group__eyebrow{
      margin:0;
      color:var(--muted);
      font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.14em;
      text-transform:uppercase
    }
    .range-group__title{
      margin:6px 0 0;
      font-size:1.18rem;
      line-height:1.2
    }
    .range-subgroup{
      margin-top:16px;
      border:1px solid rgba(7,193,96,.32);
      border-radius:22px;
      background:rgba(242,251,245,.98);
      padding:14px 14px 12px
    }
    .range-subgroup__top{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      flex-wrap:wrap
    }
    .range-subgroup__chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border-radius:999px;
      background:var(--accent);
      padding:7px 14px;
      color:#fff;
      font:700 13px/1 ui-sans-serif,system-ui,sans-serif
    }
    .range-subgroup__count{
      color:var(--muted);
      font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .range-subgroup__grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:12px;
      margin-top:12px
    }
    .directory-entry{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:14px;
      border:1px solid var(--line);
      border-radius:18px;
      background:#fff;
      padding:14px 16px;
      box-shadow:0 8px 18px rgba(36,58,43,.04);
      transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease
    }
    .directory-entry:hover{
      transform:translateY(-1px);
      border-color:#9cd8b5;
      box-shadow:0 14px 26px rgba(7,193,96,.09)
    }
    .directory-entry__main{
      min-width:0
    }
    .directory-entry__title{
      margin:0;
      font-size:1.02rem;
      line-height:1.45;
      color:var(--deep)
    }
    .directory-entry__subtitle{
      margin:6px 0 0;
      color:var(--soft);
      font:500 .9rem/1.45 ui-sans-serif,system-ui,sans-serif
    }
    .directory-entry__meta{
      margin-top:8px;
      color:var(--muted);
      font:600 12px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .directory-entry__cta{
      flex:0 0 auto;
      align-self:center;
      color:var(--accent-deep);
      font:700 14px/1.3 ui-sans-serif,system-ui,sans-serif;
      white-space:nowrap
    }
    .volume-directory-sidebar{
      position:sticky;
      top:88px;
      border:1px solid var(--line);
      border-radius:24px;
      background:rgba(249,252,248,.97);
      padding:16px;
      box-shadow:0 12px 28px rgba(36,58,43,.06)
    }
    .volume-jump-form{
      display:grid;
      gap:10px;
      padding-bottom:16px;
      border-bottom:1px solid rgba(207,227,207,.9)
    }
    .volume-jump-form label{
      color:var(--muted);
      font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif
    }
    .volume-jump-form__row{
      display:flex;
      gap:10px
    }
    .volume-jump-form input{
      flex:1;
      min-width:0;
      border:1px solid var(--line);
      border-radius:12px;
      background:#fff;
      padding:10px 12px;
      color:var(--deep);
      font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif
    }
    .volume-jump-form button,
    .volume-sidebar-top{
      border:none;
      border-radius:12px;
      background:var(--accent);
      padding:10px 14px;
      color:#fff;
      font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;
      cursor:pointer;
      transition:background-color .18s ease,transform .18s ease
    }
    .volume-jump-form button:hover,
    .volume-sidebar-top:hover{
      background:#06a552;
      transform:translateY(-1px)
    }
    .volume-range-nav{
      display:grid;
      gap:12px;
      margin-top:16px
    }
    .volume-range-card{
      border:1px solid var(--line);
      border-radius:18px;
      background:var(--surface);
      padding:10px
    }
    .volume-range-card[open]{
      border-color:#9cd8b5;
      background:#f2fbf5
    }
    .volume-range-summary{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      list-style:none;
      cursor:pointer;
      border-radius:12px;
      padding:10px 12px;
      color:var(--deep);
      font:700 14px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .volume-range-card[open] .volume-range-summary{
      background:var(--accent);
      color:#fff
    }
    .volume-range-summary::-webkit-details-marker{display:none}
    .volume-range-arrow{
      font-size:12px;
      transition:transform .18s ease
    }
    .volume-range-card[open] .volume-range-arrow{transform:rotate(0deg)}
    .volume-range-card:not([open]) .volume-range-arrow{transform:rotate(-90deg)}
    .volume-subrange-links{
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:10px;
      padding:0 2px 2px
    }
    .volume-subrange-link{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:1px solid var(--line);
      border-radius:999px;
      background:#fff;
      padding:7px 11px;
      color:var(--soft);
      font:700 12px/1 ui-sans-serif,system-ui,sans-serif;
      transition:border-color .18s ease,background-color .18s ease,color .18s ease
    }
    .volume-subrange-link:hover{
      border-color:#9cd8b5;
      background:#eef7f0;
      color:var(--accent-deep)
    }
    .volume-sidebar-actions{
      margin-top:16px;
      padding-top:16px;
      border-top:1px solid rgba(207,227,207,.9)
    }
    .volume-sidebar-top{
      display:block;
      width:100%;
      text-align:center
    }
    .entry-row{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:18px;
      border:1px solid var(--line);
      border-radius:20px;
      background:var(--card);
      padding:18px 18px 16px;
      box-shadow:0 10px 24px rgba(36,58,43,.05);
      transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease,background-color .18s ease
    }
    .entry-row:hover{
      transform:translateY(-1px);
      border-color:#9cd8b5;
      background:#fcfffd;
      box-shadow:0 16px 30px rgba(36,58,43,.08)
    }
    .entry-row__main{min-width:0}
    .entry-row__eyebrow{
      color:var(--muted);
      font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.14em;
      text-transform:uppercase
    }
    .entry-row__title{
      margin:8px 0 0;
      font-size:1.45rem;
      line-height:1.18
    }
    .entry-row__subtitle{
      margin:8px 0 0;
      font-size:.98rem;
      color:var(--soft)
    }
    .entry-row__hook{
      margin:12px 0 0;
      font-size:1rem;
      line-height:1.78;
      color:var(--soft)
    }
    .entry-row__meta{
      flex:0 0 210px;
      display:grid;
      justify-items:end;
      gap:10px;
      text-align:right
    }
    .entry-row__meta-top{
      color:var(--muted);
      font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;
      letter-spacing:.14em;
      text-transform:uppercase
    }
    .entry-row__meta-link{
      color:var(--accent-deep);
      font:700 14px/1.3 ui-sans-serif,system-ui,sans-serif
    }
    .entry-row__meta-link::after{content:" ->"}
    .entry-row__meta-date{
      color:var(--muted);
      font:500 12px/1.5 ui-sans-serif,system-ui,sans-serif
    }
    .sidebar{
      display:grid;
      gap:18px;
      align-content:start
    }
    .sidebar .rail-card{padding:18px 18px}
    .sidebar .section-title{font-size:1.28rem}
    .sidebar .prose-block{font-size:1rem;line-height:1.82}
    .nav-section{padding:18px 20px}
    .nav-section .section-title{font-size:1.12rem}
    .faq-item,.lore-item{
      border:1px solid var(--line);border-radius:18px;background:var(--card);padding:16px
    }
    .faq-question,.lore-label{
      margin:0;font:700 14px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--deep)
    }
    .faq-answer,.lore-copy{
      margin:8px 0 0;font-size:.98rem;line-height:1.8;color:var(--soft)
    }
    .nav-row{
      display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))
    }
    .nav-box{
      min-height:72px;border:1px solid var(--line);border-radius:18px;background:var(--card);padding:14px 16px
    }
    .nav-box strong{display:block;font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .nav-box span{display:block;margin-top:8px;color:var(--soft);font-size:.98rem;line-height:1.55}
    .nav-box--center{display:flex;align-items:center;justify-content:center;text-align:center}
    .nav-box--center span{margin-top:0;font-weight:600}
    .empty-note{
      border:1px dashed var(--line);border-radius:20px;background:rgba(245,250,244,.88);padding:20px;
      color:var(--muted);font:500 14px/1.8 ui-sans-serif,system-ui,sans-serif
    }
    .footer{
      margin-top:40px;padding-top:22px;border-top:1px solid rgba(113,133,117,.24);
      color:var(--muted);font:500 14px/1.7 ui-sans-serif,system-ui,sans-serif
    }
    @media (max-width: 1280px){
      .hub-grid{
        grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
        gap:20px
      }
      .hub-card{
        min-height:396px;
        padding:22px
      }
      .grid--reading{
        grid-template-columns:minmax(0,1fr) minmax(250px,300px);
        gap:18px
      }
      .sidebar .rail-card{padding:16px}
      .sidebar .section-title{font-size:1.18rem}
      .entry-layout{
        grid-template-columns:minmax(0,1fr) 320px;
        gap:20px
      }
      .entry-main-card{padding:26px 24px 24px}
      .entry-visual-figure img{max-height:460px}
      .entry-subsection{padding:18px 18px 16px}
      .entry-sidebar{top:80px}
      .entries-layout{
        grid-template-columns:minmax(0,1fr) 270px;
        gap:18px
      }
      .volume-info-card{
        grid-template-columns:minmax(0,1.45fr) minmax(240px,.95fr);
        gap:22px
      }
      .volume-sidebar{padding-left:20px}
      .entry-row__meta{flex-basis:185px}
    }
    @media (max-width: 1023px){
      .hub-shell{padding-top:24px}
      .hub-top{align-items:flex-start}
      .pagination-mini{width:100%;justify-content:flex-end}
      .hub-grid{grid-template-columns:1fr 1fr}
      .entry-layout{grid-template-columns:1fr}
      .entry-sidebar{
        position:static;
        top:auto
      }
      .entries-layout{grid-template-columns:1fr}
      .volume-directory-sidebar{
        position:static;
        top:auto
      }
      .range-subgroup__grid{grid-template-columns:1fr}
      .grid--reading{grid-template-columns:1fr}
      .volume-info-card{
        grid-template-columns:1fr;
        gap:22px
      }
      .volume-sidebar{
        padding-left:0;
        padding-top:18px;
        border-left:none;
        border-top:1px solid rgba(207,227,207,.9)
      }
      .entry-row{
        flex-direction:column;
        align-items:stretch
      }
      .entry-row__meta{
        flex-basis:auto;
        justify-items:start;
        text-align:left
      }
    }
    @media (max-width: 700px){
      .site-header__inner{padding:14px}
      .site-search{min-width:100%}
      .shell{padding:20px 14px 56px}
      .hub-grid{grid-template-columns:1fr}
      .hub-card{
        min-height:auto;
        padding:20px
      }
      .hub-card__title{font-size:1.75rem}
      .hub-card__meta-row{grid-template-columns:1fr}
      .pagination-mini{justify-content:flex-start}
      .entry-main-card{padding:22px 18px 20px}
      .entry-visual-toggle__summary{
        min-height:40px;
        padding:9px 12px;
        font-size:13px
      }
      .entry-visual-figure{padding:10px}
      .entry-visual-figure img{
        max-height:320px;
        border-radius:14px
      }
      .entry-subsection{padding:18px 16px 16px}
      .entry-header__title{font-size:1.85rem}
      .entry-nav{grid-template-columns:1fr}
      .entry-side-card{padding:18px 16px}
      .entries-card{padding:20px 16px}
      .range-group{padding:16px 14px 14px}
      .range-subgroup{padding:12px 12px 10px}
      .directory-entry{padding:13px 14px}
      .volume-jump-form__row{flex-direction:column}
      .hero{padding:24px 18px}
      .section-card,.entry-card,.term-card,.rail-card{padding:20px 18px}
      .volume-info-card,
      .entries-card{padding:20px 18px}
      .volume-title{font-size:2rem}
      .volume-meta-grid{grid-template-columns:1fr}
      .nav-row{grid-template-columns:1fr}
      .nav-section{padding:16px}
    }
  `;
}

function sharedClientScript() {
  return `
    (() => {
      const shareButtons = document.querySelectorAll("[data-share-platform]");
      for (const button of shareButtons) {
        button.addEventListener("click", () => {
          const url = button.getAttribute("data-share-url") || location.href;
          const platform = button.getAttribute("data-share-platform") || "";
          const text = button.getAttribute("data-share-title") || document.title;
          const encodedUrl = encodeURIComponent(url);
          const encodedText = encodeURIComponent(text);
          const destinations = {
            X: "https://twitter.com/intent/tweet?url=" + encodedUrl + "&text=" + encodedText,
            Facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl,
            Telegram: "https://t.me/share/url?url=" + encodedUrl + "&text=" + encodedText,
            Reddit: "https://www.reddit.com/submit?url=" + encodedUrl + "&title=" + encodedText
          };
          const target = destinations[platform];
          if (target) window.open(target, "_blank", "noopener,noreferrer,width=720,height=640");
        });
      }

      const jumpForms = document.querySelectorAll("[data-volume-jump-form]");
      for (const form of jumpForms) {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          const input = form.querySelector("input[name='entry']");
          if (!(input instanceof HTMLInputElement)) return;
          const raw = input.value.trim().toLowerCase();
          if (!raw) return;
          const normalized = raw.replace(/^0+/, "") || "0";
          const anchors = document.querySelectorAll("[data-entry-anchor]");
          let target = null;
          for (const anchor of anchors) {
            const entryNo = (anchor.getAttribute("data-entry-no") || "").replace(/^0+/, "") || "0";
            const entryText = (anchor.getAttribute("data-entry-text") || "").toLowerCase();
            if (entryNo === normalized || entryText.includes(raw)) {
              target = anchor;
              break;
            }
          }
          if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            history.replaceState(null, "", "#" + (target.id || "volume-directory"));
          }
        });
      }
    })();
  `;
}

function renderSiteHeader(activeSlug) {
  const categoryLinks = NAV_CATEGORIES.map((item) => {
    const className = item.slug === activeSlug ? "site-pill--active" : "site-pill";
    return `<a class="${className}" href="/category/${encodePathSegment(item.slug)}">${escapeHtml(item.label)}</a>`;
  }).join("\n");

  return `<header class="site-header">
  <div class="site-header__inner">
    <div class="site-header__stack">
      <nav class="site-header__categories" aria-label="Categories">
        ${categoryLinks}
        <a class="site-pill" href="/wiki/">XiuXian Wiki</a>
      </nav>
      <div class="site-header__tools">
        <a class="site-home" href="/">Home</a>
        <form class="site-search" action="/search" method="get">
          <input name="q" type="search" placeholder="Search site..." aria-label="Search site" autocomplete="off" />
          <button type="submit">Search</button>
        </form>
        <button class="site-ads" type="button">Close Ads</button>
      </div>
    </div>
  </div>
</header>`;
}

function renderShareBar(relPath, title) {
  return `<div class="share-row">
    ${SHARE_PLATFORMS.map(
      (item) =>
        `<button class="share-button" type="button" data-share-platform="${escapeHtml(
          item.name
        )}" data-share-url="${escapeHtml(absoluteUrl(relPath))}" data-share-title="${escapeHtml(title)}">
          <img src="${escapeHtml(item.icon)}" alt="" loading="lazy" width="16" height="16" />
          <span>${escapeHtml(item.name)}</span>
        </button>`
    ).join("\n")}
  </div>`;
}

function renderCompactShareBar(relPath, title) {
  return `<div class="hub-card__share">
    <span class="hub-card__share-label">Share to</span>
    ${SHARE_PLATFORMS.map(
      (item) =>
        `<button class="share-button" type="button" data-share-platform="${escapeHtml(
          item.name
        )}" data-share-url="${escapeHtml(absoluteUrl(relPath))}" data-share-title="${escapeHtml(title)}" aria-label="Share to ${escapeHtml(
          item.name
        )}">
          <img src="${escapeHtml(item.icon)}" alt="" loading="lazy" width="16" height="16" />
          <span>${escapeHtml(item.name)}</span>
        </button>`
    ).join("\n")}
  </div>`;
}

function renderDocument({ title, description, canonicalPath, body, jsonLd = [] }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl(canonicalPath))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl(canonicalPath))}" />
    <link rel="stylesheet" href="/__encyclopedia_assets__/encyclopedia.css" />
    ${renderJsonLd(jsonLd)}
  </head>
  <body>
    ${body}
    <script src="/__encyclopedia_assets__/encyclopedia.js" defer></script>
  </body>
</html>`;
}

function buildRelationLookup(volumes) {
  const lookup = new Map();
  for (const volume of volumes) {
    for (const entry of volume.entries ?? []) {
      const keys = [entry.slug, entry.titleEn, entry.titleCn];
      for (const key of keys) {
        const normalized = normalizeLookupKey(key);
        if (!normalized || lookup.has(normalized)) continue;
        lookup.set(normalized, { volume, entry });
      }
    }
  }
  return lookup;
}

function renderVolumeCards(volumes) {
  return volumes
    .map(
      (volume) => `<a class="volume-card" href="${volumePath(volume)}">
  <p class="eyebrow">Eastern Mythology Encyclopedia</p>
  <h2 class="card-title">${escapeHtml(volume.titleEn)}</h2>
  <p class="subhead">${escapeHtml(volume.title)}</p>
  <p class="card-copy">${escapeHtml(volume.summary)}</p>
  <div class="meta-grid">
    <div><strong>Author</strong>${escapeHtml(volume.author)}</div>
    <div><strong>Status</strong>${escapeHtml(volume.status)}</div>
    <div><strong>Entries</strong>${escapeHtml(String(volume.totalChapters))}</div>
    <div><strong>Updated</strong>${escapeHtml(volume.updatedAt)}</div>
  </div>
</a>`
    )
    .join("\n");
}

function renderHubCards(volumes) {
  return volumes
    .map((volume) => {
      return `<a class="hub-card" href="${volumePath(volume)}">
  <h2 class="hub-card__title">${escapeHtml(volume.titleEn)}</h2>
  <p class="hub-card__subtitle">${escapeHtml(volume.title)}</p>
  <div class="hub-card__meta">
    <div class="hub-card__meta-row">
      <p><span>Author</span>${escapeHtml(volume.author)}</p>
      <p><span>Category</span>Encyclopedia</p>
    </div>
    <div class="hub-card__meta-row">
      <p><span>Status</span>${escapeHtml(volume.status)}</p>
      <p><span>Entries</span>${escapeHtml(String(volume.totalChapters))}</p>
    </div>
  </div>
  <p class="hub-card__summary">${escapeHtml(volume.summary)}</p>
  <div class="hub-card__footer">
    ${renderCompactShareBar(volumePath(volume), volume.titleEn)}
    <div class="hub-card__hint">Click anywhere to open the volume directory</div>
  </div>
</a>`;
    })
    .join("\n");
}

function getChapterOrder(entry) {
  const raw = getString(entry.chapterNo);
  const match = raw.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

function padRangeNumber(value) {
  return String(value).padStart(4, "0");
}

function buildVolumeRangeGroups(entries, majorSize = 100, minorSize = 10) {
  const sorted = [...(entries ?? [])].sort((a, b) => getChapterOrder(a) - getChapterOrder(b));
  const majorMap = new Map();

  for (const entry of sorted) {
    const order = getChapterOrder(entry);
    if (!Number.isFinite(order)) continue;
    const majorStart = Math.floor((order - 1) / majorSize) * majorSize + 1;
    const majorEnd = majorStart + majorSize - 1;
    const minorStart = Math.floor((order - 1) / minorSize) * minorSize + 1;
    const minorEnd = minorStart + minorSize - 1;
    const majorKey = `${majorStart}-${majorEnd}`;
    if (!majorMap.has(majorKey)) {
      majorMap.set(majorKey, {
        majorStart,
        majorEnd,
        label: `${padRangeNumber(majorStart)}-${padRangeNumber(majorEnd)}`,
        anchor: `group-${padRangeNumber(majorStart)}-${padRangeNumber(majorEnd)}`,
        minorMap: new Map()
      });
    }
    const majorGroup = majorMap.get(majorKey);
    const minorKey = `${minorStart}-${minorEnd}`;
    if (!majorGroup.minorMap.has(minorKey)) {
      majorGroup.minorMap.set(minorKey, {
        minorStart,
        minorEnd,
        label: `${minorStart}-${minorEnd}`,
        anchor: `range-${padRangeNumber(minorStart)}-${padRangeNumber(minorEnd)}`,
        entries: []
      });
    }
    majorGroup.minorMap.get(minorKey).entries.push(entry);
  }

  return [...majorMap.values()].map((group) => ({
    ...group,
    minors: [...group.minorMap.values()]
  }));
}

function renderEntryLinks(volume) {
  return (volume.entries ?? [])
    .map(
      (entry) => `<a class="entry-link" href="${entryPath(volume, entry)}">
  <div class="eyebrow">Entry ${escapeHtml(entry.chapterNo)}</div>
  <h2 class="card-title--small">${escapeHtml(entry.titleEn)}</h2>
  <p class="subhead">${escapeHtml(entry.titleCn)}</p>
  <p class="card-copy">${escapeHtml(entry.hook)}</p>
</a>`
    )
    .join("\n");
}

function renderRelationLinks(relationEntries, relationLookup) {
  const cards = relationEntries
    .map((item) => {
      const target = getString(item.target);
      if (!target) return "";
      const relationType = getString(item.relation_type);
      const resolved = relationLookup.get(normalizeLookupKey(target));
      const content = `<strong>${escapeHtml(target)}</strong>${
        relationType ? `<span>${escapeHtml(relationType)}</span>` : ""
      }`;
      if (!resolved) {
        return `<div class="relation-link">${content}</div>`;
      }
      return `<a class="relation-link" href="${entryPath(resolved.volume, resolved.entry)}">${content}</a>`;
    })
    .filter(Boolean)
    .join("\n");

  return cards || `<div class="empty-note">No related entries were linked for this page yet.</div>`;
}

function renderFaq(faqEntries) {
  if (!faqEntries.length) return `<div class="empty-note">No FAQ items were included for this entry.</div>`;
  return faqEntries
    .map(
      (item) => `<div class="faq-item">
  <h3 class="faq-question">${escapeHtml(getString(item.question))}</h3>
  <p class="faq-answer">${escapeHtml(getString(item.answer))}</p>
</div>`
    )
    .join("\n");
}

function renderLore(loreEntries) {
  if (!loreEntries.length) return `<div class="empty-note">No lore glossary items were attached to this entry.</div>`;
  return loreEntries
    .map(
      (item) => `<div class="lore-item">
  <h3 class="lore-label">${escapeHtml(getString(item.surface_form))}</h3>
  <p class="lore-copy">${escapeHtml(getString(item.description))}</p>
</div>`
    )
    .join("\n");
}

function buildBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

function buildHubPageJsonLd(volumes) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Eastern Mythology Encyclopedia",
    description:
      "Browse the ten mythic volumes of the Eastern Mythology Encyclopedia, from immortals and gods to demons, ghosts, realms, arts, and relics.",
    url: absoluteUrl(encyclopediaHubPath()),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/")
    },
    hasPart: volumes.map((volume, index) => ({
      "@type": "Book",
      position: index + 1,
      name: volume.titleEn,
      url: absoluteUrl(volumePath(volume))
    }))
  };
}

function buildVolumeJsonLd(volume) {
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: volume.titleEn,
    alternateName: volume.title,
    author: volume.author,
    description: volume.metaDescription || volume.summary,
    url: absoluteUrl(volumePath(volume)),
    numberOfPages: volume.totalChapters,
    isPartOf: {
      "@type": "CollectionPage",
      name: "Eastern Mythology Encyclopedia",
      url: absoluteUrl(encyclopediaHubPath())
    }
  };
}

function buildEntryJsonLd(volume, entrySummary, entry) {
  const meta = getRecord(entry.meta);
  const seo = getRecord(entry.seo);
  const titleEn = getString(meta.title_en) || entrySummary.titleEn;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: titleEn,
    alternativeHeadline: getString(meta.title_cn) || entrySummary.titleCn,
    description: getString(seo.meta_description) || entrySummary.hook,
    url: absoluteUrl(entryPath(volume, entrySummary)),
    isPartOf: {
      "@type": "Book",
      name: volume.titleEn,
      url: absoluteUrl(volumePath(volume))
    },
    author: {
      "@type": "Person",
      name: volume.author
    }
  };
}

function renderHubPage(volumes) {
  const description =
    "Browse the ten mythic volumes of the Eastern Mythology Encyclopedia, from immortals and gods to demons, ghosts, realms, arts, and relics.";
  const body = `${renderSiteHeader("eastern-mythology-encyclopedia")}
<main class="shell hub-shell">
  <section class="hub-section">
    <div class="hub-top">
      <div class="hub-title-group">
        <p class="hub-kicker">Eastern Mythology Encyclopedia</p>
        <h1 class="hub-title">Eastern Mythology Encyclopedia</h1>
        <p class="hub-subtitle">Ten mythic volumes. Ten doors into an older cosmology. Open any card to enter a volume directory and read its entries like chapters.</p>
      </div>
      <div class="pagination-mini" aria-label="Volume pagination">
        <button class="page-btn" type="button" disabled>Prev</button>
        <button class="page-btn" type="button" disabled>Next</button>
      </div>
    </div>
    <div class="hub-grid">${renderHubCards(volumes)}</div>
  </section>
  <footer class="footer">Static encyclopedia pages generated at build time from local JSON content.</footer>
</main>`;

  return renderDocument({
    title: "Eastern Mythology Encyclopedia - Novel Portal",
    description,
    canonicalPath: encyclopediaHubPath(),
    body,
    jsonLd: [buildHubPageJsonLd(volumes)]
  });
}

function renderVolumePage(volume) {
  const description = trimDescription(volume.metaDescription || volume.summary, 180);
  const detailParagraphs = splitParagraphs(volume.desc || volume.summary);
  const detailPreview = detailParagraphs.slice(0, 2);
  const firstEntry = volume.entries?.[0] ?? null;
  const latestEntry = volume.entries?.[volume.entries.length - 1] ?? null;
  const startHref = firstEntry ? entryPath(volume, firstEntry) : volumePath(volume);
  const latestHref = latestEntry ? entryPath(volume, latestEntry) : volumePath(volume);
  const rangeGroups = buildVolumeRangeGroups(volume.entries ?? []);
  const entriesMarkup = rangeGroups
    .map(
      (group) => `<section class="range-group" id="${group.anchor}">
  <p class="range-group__eyebrow">Entry Range</p>
  <h3 class="range-group__title">${group.label}</h3>
  ${group.minors
    .map(
      (minor) => `<section class="range-subgroup" id="${minor.anchor}">
    <div class="range-subgroup__top">
      <span class="range-subgroup__chip">${minor.label}</span>
      <span class="range-subgroup__count">${minor.entries.length} entries</span>
    </div>
    <div class="range-subgroup__grid">
      ${minor.entries
        .map(
          (entry) => `<a class="directory-entry" href="${entryPath(volume, entry)}" id="entry-${escapeHtml(
            entry.chapterNo
          )}" data-entry-anchor data-entry-no="${escapeHtml(entry.chapterNo)}" data-entry-text="${escapeHtml(
            `${entry.titleEn} ${entry.titleCn} ${entry.chapterNo}`
          )}">
        <div class="directory-entry__main">
          <h4 class="directory-entry__title">${escapeHtml(entry.titleEn)}</h4>
          ${entry.titleCn ? `<p class="directory-entry__subtitle">${escapeHtml(entry.titleCn)}</p>` : ""}
          <div class="directory-entry__meta">Entry ${escapeHtml(entry.chapterNo)}</div>
        </div>
        <span class="directory-entry__cta">Read -></span>
      </a>`
        )
        .join("\n")}
    </div>
  </section>`
    )
    .join("\n")}
</section>`
    )
    .join("\n");
  const sidebarMarkup = rangeGroups
    .map(
      (group, index) => `<details class="volume-range-card"${index === 0 ? " open" : ""}>
  <summary class="volume-range-summary">
    <span>${group.label}</span>
    <span class="volume-range-arrow">v</span>
  </summary>
  <div class="volume-subrange-links">
    ${group.minors
      .map((minor, minorIndex) => `<a class="volume-subrange-link" href="#${minor.anchor}">${minor.label}</a>`)
      .join("\n")}
  </div>
</details>`
    )
    .join("\n");
  const body = `${renderSiteHeader("eastern-mythology-encyclopedia")}
<main class="shell volume-shell" id="volume-directory">
  <nav class="breadcrumbs volume-breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="${encyclopediaHubPath()}">Eastern Mythology Encyclopedia</a>
      <span>/</span>
      <span>${escapeHtml(volume.titleEn)}</span>
  </nav>
  <section class="volume-info-card">
    <div class="volume-main">
      <p class="volume-kicker">Eastern Mythology Encyclopedia</p>
      <h1 class="volume-title">${escapeHtml(volume.titleEn)}</h1>
      <p class="volume-subtitle">${escapeHtml(volume.title)}</p>
      <div class="volume-description">
        <p>${escapeHtml(volume.summary)}</p>
        ${detailPreview
          .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
          .join("\n")}
      </div>
      ${volume.tags?.length ? `<div class="tag-row volume-tags">${volume.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="volume-actions">
        <a class="volume-action volume-action--primary" href="${startHref}">Start reading</a>
        <a class="volume-action volume-action--secondary" href="${latestHref}">Latest entry</a>
      </div>
    </div>
    <aside class="volume-sidebar">
      <div class="volume-meta-grid">
        <div class="volume-meta-item"><strong>Author</strong><span>${escapeHtml(volume.author)}</span></div>
        <div class="volume-meta-item"><strong>Status</strong><span>${escapeHtml(volume.status)}</span></div>
        <div class="volume-meta-item"><strong>Category</strong><span>Eastern Mythology Encyclopedia</span></div>
        <div class="volume-meta-item"><strong>Total Entries</strong><span>${escapeHtml(String(volume.totalChapters))}</span></div>
        <div class="volume-meta-item"><strong>Updated</strong><span>${escapeHtml(volume.updatedAt)}</span></div>
        <div class="volume-meta-item"><strong>Directory</strong><span>${escapeHtml(volume.titleEn)}</span></div>
      </div>
      <div class="volume-share">
        <strong class="volume-kicker" style="display:block;letter-spacing:.14em">Share to</strong>
        ${renderShareBar(volumePath(volume), volume.titleEn)}
      </div>
    </aside>
  </section>
  <section class="entries-card">
    <div class="entries-header">
      <h2 class="section-title">Entries</h2>
      <p class="entries-caption">Use the compact directory below to scan this volume quickly. Each link opens the full entry page.</p>
    </div>
    <div class="entries-layout">
      <div class="entries-stack">
        ${entriesMarkup}
      </div>
      <aside class="volume-directory-sidebar">
        <form class="volume-jump-form" data-volume-jump-form>
          <label for="volume-entry-jump">Jump to entry</label>
          <div class="volume-jump-form__row">
            <input id="volume-entry-jump" name="entry" type="search" placeholder="For example 0007" autocomplete="off" />
            <button type="submit">Go</button>
          </div>
        </form>
        <div class="volume-range-nav">
          ${sidebarMarkup}
        </div>
        <div class="volume-sidebar-actions">
          <a class="volume-sidebar-top" href="#volume-directory">Back to Top</a>
        </div>
      </aside>
    </div>
  </section>
  <footer class="footer"><a href="${encyclopediaHubPath()}">Back to the encyclopedia hub</a></footer>
</main>`;

  return renderDocument({
    title: volume.seoTitle || `${volume.titleEn} - Eastern Mythology Encyclopedia`,
    description,
    canonicalPath: volumePath(volume),
    body,
    jsonLd: [
      buildVolumeJsonLd(volume),
      buildBreadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Eastern Mythology Encyclopedia", path: encyclopediaHubPath() },
        { name: volume.titleEn, path: volumePath(volume) }
      ])
    ]
  });
}

function renderEntryPage(volume, entrySummary, entry, relationLookup, prevEntry, nextEntry, entryImagePath = null) {
  const meta = getRecord(entry.meta);
  const seo = getRecord(entry.seo);
  const entryPayload = getRecord(entry.entry);
  const titleEn = getString(meta.title_en) || entrySummary.titleEn;
  const titleCn = getString(meta.title_cn) || entrySummary.titleCn;
  const entryType = getString(meta.entry_type_label);
  const updatedAt = getString(meta.updated_at) || entrySummary.updatedAt;
  const hook = getString(entryPayload.hook) || entrySummary.hook;
  const bodySections = Object.keys(getRecord(entryPayload.body))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => getString(getRecord(entryPayload.body)[key]))
    .filter(Boolean);
  const guideSections = Object.keys(getRecord(entryPayload.guide))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((key) => getString(getRecord(entryPayload.guide)[key]))
    .filter(Boolean);
  const faqEntries = getArray(entry.faq_entries).map(getRecord);
  const loreEntries = getArray(entry.lore_entries).map(getRecord);
  const relationEntries = getArray(entry.relation_entries).map(getRecord);
  const description = trimDescription(getString(seo.meta_description) || hook, 180);
  const imageDisclosureMarkup = entryImagePath
    ? `<details class="entry-visual-toggle">
  <summary class="entry-visual-toggle__summary">
    <span class="entry-visual-toggle__summary-text">Click to View ${escapeHtml(titleEn)} Reference Image</span>
    <span class="entry-visual-toggle__summary-icon">v</span>
  </summary>
  <figure class="entry-visual-figure">
    <img src="${escapeHtml(entryImagePath)}" alt="${escapeHtml(`${titleEn} reference illustration`)}" loading="lazy" decoding="async" />
    <figcaption>${escapeHtml(`${titleEn} · Eastern Mythology Encyclopedia`)}</figcaption>
  </figure>
</details>`
    : "";
  const navigationMarkup = `<nav class="entry-nav" aria-label="Entry navigation">
        <a class="entry-nav__item entry-nav__item--top entry-nav__item--center" href="#entry-top"><strong>Top</strong><span>Back to Top</span></a>
        ${
          prevEntry
            ? `<a class="entry-nav__item" href="${entryPath(volume, prevEntry)}"><strong>Previous</strong><span>${escapeHtml(prevEntry.titleEn)}</span></a>`
            : `<div class="entry-nav__item"><strong>Previous</strong><span>Beginning of this volume.</span></div>`
        }
        <a class="entry-nav__item entry-nav__item--center" href="${volumePath(volume)}"><strong>Directory</strong><span>Back to Volume</span></a>
        ${
          nextEntry
            ? `<a class="entry-nav__item" href="${entryPath(volume, nextEntry)}"><strong>Next</strong><span>${escapeHtml(nextEntry.titleEn)}</span></a>`
            : `<div class="entry-nav__item"><strong>Next</strong><span>End of this volume.</span></div>`
        }
      </nav>`;

  const body = `${renderSiteHeader("eastern-mythology-encyclopedia")}
<main class="shell entry-shell" id="entry-top">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a>
    <span>/</span>
    <a href="${encyclopediaHubPath()}">Eastern Mythology Encyclopedia</a>
    <span>/</span>
    <a href="${volumePath(volume)}">${escapeHtml(volume.titleEn)}</a>
    <span>/</span>
    <span>${escapeHtml(titleEn)}</span>
  </nav>
  ${imageDisclosureMarkup}
  <section class="entry-layout" style="margin-top:16px">
    <article class="entry-main-card">
      <header class="entry-header">
        <p class="entry-header__kicker">Eastern Mythology Encyclopedia</p>
        <h1 class="entry-header__title">${escapeHtml(titleEn)}</h1>
        <p class="entry-header__subtitle">${escapeHtml(titleCn)}</p>
        <div class="entry-header__meta">
          <span class="entry-header__meta-chip"><strong>Entry</strong>${escapeHtml(entrySummary.chapterNo)}</span>
          ${entryType ? `<span class="entry-header__meta-chip"><strong>Type</strong>${escapeHtml(entryType)}</span>` : ""}
          <span class="entry-header__meta-chip"><strong>Volume</strong>${escapeHtml(volume.titleEn)}</span>
          ${updatedAt ? `<span class="entry-header__meta-chip"><strong>Updated</strong>${escapeHtml(updatedAt)}</span>` : ""}
        </div>
        ${hook ? `<p class="entry-header__hook">${escapeHtml(hook)}</p>` : ""}
      </header>
      <div class="entry-body">
        <div class="prose-group">${renderTextList(bodySections)}</div>
      </div>
      ${navigationMarkup}
      <section class="entry-subsection">
        <h2 class="section-title">Lore Notes</h2>
        <div class="entry-side-stack">${renderLore(loreEntries)}</div>
      </section>
      <section class="entry-subsection">
        <h2 class="section-title">FAQ</h2>
        <div class="entry-side-stack">${renderFaq(faqEntries)}</div>
      </section>
      ${navigationMarkup}
    </article>
    <aside class="entry-sidebar">
      <section class="entry-side-card">
        <h2 class="section-title">Entry Guide</h2>
        <div class="prose-group" style="margin-top:14px">${guideSections.length ? renderTextList(guideSections) : `<div class="empty-note">No guide sections were included for this entry.</div>`}</div>
      </section>
      <section class="entry-side-card">
        <h2 class="section-title">Related Entries</h2>
        <div class="entry-side-stack">${renderRelationLinks(relationEntries, relationLookup)}</div>
      </section>
      ${
        getArray(seo.tags).length
          ? `<section class="entry-side-card">
        <h2 class="section-title">Tags</h2>
        <div class="chip-row" style="margin-top:16px">${getArray(seo.tags)
          .map((tag) => `<span class="chip">${escapeHtml(String(tag))}</span>`)
          .join("")}</div>
      </section>`
          : ""
      }
    </aside>
  </section>
  <footer class="footer"><a href="${volumePath(volume)}">Back to ${escapeHtml(volume.titleEn)}</a></footer>
</main>`;

  return renderDocument({
    title: getString(seo.og_title) || `${titleEn} - ${volume.titleEn}`,
    description,
    canonicalPath: entryPath(volume, entrySummary),
    body,
    jsonLd: [
      buildEntryJsonLd(volume, entrySummary, entry),
      buildBreadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Eastern Mythology Encyclopedia", path: encyclopediaHubPath() },
        { name: volume.titleEn, path: volumePath(volume) },
        { name: titleEn, path: entryPath(volume, entrySummary) }
      ])
    ]
  });
}

function loadVolumes() {
  const root = readJson(indexPath, { volumes: [] });
  return getArray(root.volumes).map((item) => getRecord(item));
}

function main() {
  const volumes = loadVolumes();
  const relationLookup = buildRelationLookup(volumes);
  const encyclopediaSourceRoot = resolveEncyclopediaSourceRoot();

  wipeDir(categoryOutRoot);
  wipeDir(novelsOutRoot);
  ensureDir(assetsOutRoot);
  writeText(path.join(assetsOutRoot, "encyclopedia.css"), sharedStyles());
  writeText(path.join(assetsOutRoot, "encyclopedia.js"), sharedClientScript());

  writeText(path.join(categoryOutRoot, "index.html"), renderHubPage(volumes));

  let entryPageCount = 0;
  for (const volume of volumes) {
    writeText(path.join(novelsOutRoot, volume.novelId, "index.html"), renderVolumePage(volume));

    for (let index = 0; index < volume.entries.length; index += 1) {
      const entrySummary = volume.entries[index];
      const entry = readJson(path.join(workspaceRoot, entrySummary.jsonPath), {});
      const prevEntry = index > 0 ? volume.entries[index - 1] : null;
      const nextEntry = index < volume.entries.length - 1 ? volume.entries[index + 1] : null;
      const entryImagePath = copyOptionalEntryImage(volume, entrySummary, encyclopediaSourceRoot);
      writeText(
        path.join(novelsOutRoot, volume.novelId, "chapters", entrySummary.slug, "index.html"),
        renderEntryPage(volume, entrySummary, entry, relationLookup, prevEntry, nextEntry, entryImagePath)
      );
      entryPageCount += 1;
    }

    log(`rendered volume: ${volume.novelId}, entries=${volume.entries.length}`);
  }

  log(`generated static encyclopedia html: volumes=${volumes.length}, entryPages=${entryPageCount}`);
}

main();
