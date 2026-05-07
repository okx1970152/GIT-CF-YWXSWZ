import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const publicRoot = path.join(workspaceRoot, "public");
const wikiOutRoot = path.join(publicRoot, "wiki");
const manifestPath = path.join(dataRoot, "wiki-manifest.json");
const shardRoot = path.join(dataRoot, "wiki", "novels");
const contentIndexPath = path.join(dataRoot, "content-index.json");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://wx.0o0o.mom").replace(/\/+$/, "");
const SITE_NAME = "Novel Portal";
const WIKI_NAV_LABEL = "XiuXian Wiki";
const WIKI_HUB_HEADING = "XiuXian Wiki - Cultivation Lore Glossary";
const WIKI_HUB_TAGLINE =
  "Your faithful guide into cultivation, longevity, and the true path toward immortal life.";
const WIKI_HUB_META_DESCRIPTION =
  "Cultivation lore glossary: in-world terms from xianxia novels, with definitions and links back to the chapters where they appear.";

function log(message) {
  process.stdout.write(`[wiki-static] ${message}\n`);
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

function absoluteUrl(relPath) {
  return relPath.startsWith("/") ? `${SITE_URL}${relPath}` : `${SITE_URL}/${relPath}`;
}

function normalizeDisplayTitle(novelId, frontmatter = {}) {
  const titleEn =
    typeof frontmatter.title_en === "string" && frontmatter.title_en.trim()
      ? frontmatter.title_en.trim()
      : "";
  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim() ? frontmatter.title.trim() : "";
  if (titleEn) return titleEn;
  if (title) return title;
  return novelId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSummary(frontmatter = {}) {
  const summary =
    typeof frontmatter.summary === "string" && frontmatter.summary.trim()
      ? frontmatter.summary.trim()
      : typeof frontmatter.desc === "string" && frontmatter.desc.trim()
        ? frontmatter.desc.trim()
        : "";
  return summary.replace(/\s+/g, " ").trim();
}

function normalizeDate(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return undefined;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0)).toISOString();
}

function trimDescription(value, maxLength = 180) {
  const compact = String(value ?? "").replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function baseStyles() {
  return `
    :root{
      --bg:#edf5e9;
      --surface:#f9fcf7;
      --card:#ffffff;
      --line:#cfe0ca;
      --deep:#23372b;
      --soft:#4e6655;
      --muted:#708172;
      --accent:#0fb85d;
      --accent-deep:#0c9a4e;
      --shadow:0 18px 44px rgba(35,55,43,.08);
      --radius:24px;
    }
    *{box-sizing:border-box}
    html{color-scheme:light}
    body{
      margin:0;
      font-family:Georgia,"Times New Roman",serif;
      color:var(--deep);
      background:
        radial-gradient(circle at top left, rgba(15,184,93,.08), transparent 22rem),
        linear-gradient(180deg, #f4fbf0 0%, var(--bg) 100%);
      min-height:100vh;
    }
    a{color:inherit;text-decoration:none}
    .shell{max-width:1120px;margin:0 auto;padding:28px 18px 72px}
    .pill{
      display:inline-flex;align-items:center;justify-content:center;
      padding:10px 18px;border-radius:999px;border:1px solid var(--line);
      background:rgba(255,255,255,.78);font:600 15px/1.2 ui-sans-serif,system-ui,sans-serif;
      box-shadow:0 8px 18px rgba(35,55,43,.06);
    }
    .hero{
      margin-top:22px;padding:34px 30px;border:1px solid rgba(207,224,202,.85);
      border-radius:32px;background:rgba(255,255,255,.72);backdrop-filter:blur(10px);
      box-shadow:var(--shadow);
    }
    .breadcrumbs{
      font:500 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted);
      display:flex;flex-wrap:wrap;gap:10px;align-items:center
    }
    .breadcrumbs a{color:var(--accent-deep)}
    .title{
      margin:18px 0 0;font-size:clamp(2.1rem,4vw,3.35rem);line-height:1.06;letter-spacing:-.03em
    }
    .tagline,.lede,.meta,.search-copy,.footer-copy{
      font-family:ui-sans-serif,system-ui,sans-serif;color:var(--soft)
    }
    .tagline{max-width:760px;margin:16px 0 0;font-size:1.05rem;line-height:1.75}
    .search-shell{
      display:grid;grid-template-columns:1fr auto;gap:12px;margin-top:28px
    }
    .search-shell input{
      border:1px solid var(--line);border-radius:16px;padding:14px 16px;background:#fff;
      font:500 15px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)
    }
    .button{
      display:inline-flex;align-items:center;justify-content:center;padding:14px 18px;border-radius:16px;
      background:var(--accent);color:#fff;font:700 15px/1.1 ui-sans-serif,system-ui,sans-serif;border:none
    }
    .stack{display:grid;gap:14px;margin-top:34px}
    .grid{display:grid;gap:14px;margin-top:34px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .card{
      display:block;border:1px solid var(--line);border-radius:24px;padding:18px 20px;background:var(--card);
      box-shadow:0 14px 30px rgba(35,55,43,.06);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease
    }
    .card:hover{transform:translateY(-2px);border-color:rgba(15,184,93,.42);box-shadow:0 20px 42px rgba(35,55,43,.1)}
    .card-title{font:700 1.08rem/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .card-copy{margin-top:9px;font:500 .94rem/1.7 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .card-meta{margin-top:12px;font:600 .85rem/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .definition{
      margin-top:28px;border:1px solid var(--line);border-radius:28px;padding:26px;background:var(--surface);box-shadow:var(--shadow)
    }
    .section-label{
      margin:0;font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--muted);
      letter-spacing:.16em;text-transform:uppercase
    }
    .prose{margin-top:16px;font-size:1.04rem;line-height:1.9;color:var(--soft)}
    .prose p{margin:0 0 1em}
    .chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
    .chip{
      display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:999px;
      border:1px solid var(--line);background:#fff;font:600 .9rem/1.1 ui-sans-serif,system-ui,sans-serif;color:var(--deep)
    }
    .section{margin-top:34px}
    .section h2{margin:0;font-size:1.45rem;line-height:1.2}
    .section p{margin:10px 0 0}
    .empty{
      margin-top:32px;padding:22px;border:1px dashed var(--line);border-radius:24px;background:rgba(255,255,255,.6);
      font:500 .98rem/1.7 ui-sans-serif,system-ui,sans-serif;color:var(--muted)
    }
    .footer{
      margin-top:42px;padding-top:22px;border-top:1px solid rgba(112,129,114,.18)
    }
    .footer-copy{font-size:.92rem;line-height:1.7}
    @media (max-width: 700px){
      .shell{padding:20px 14px 56px}
      .hero{padding:24px 18px}
      .search-shell{grid-template-columns:1fr}
      .definition{padding:22px 18px}
    }
  `;
}

function renderJsonLd(nodes) {
  const payload = Array.isArray(nodes) ? nodes : [nodes];
  return payload
    .filter(Boolean)
    .map((node) => `<script type="application/ld+json">${JSON.stringify(node)}</script>`)
    .join("\n");
}

function renderDocument({ title, description, canonicalPath, ogType = "website", body, jsonLd = [] }) {
  const canonicalUrl = absoluteUrl(canonicalPath);
  const ogTitle = `${title} - ${SITE_NAME}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="icon" href="/favicon.png" />
    <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <style>${baseStyles()}</style>
    ${renderJsonLd(jsonLd)}
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

function renderDefinitionParagraphs(definition) {
  const pieces = String(definition ?? "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return pieces.length
    ? pieces.map((part) => `<p>${escapeHtml(part)}</p>`).join("\n")
    : `<p>${escapeHtml(String(definition ?? "").trim())}</p>`;
}

function loadContentIndexLookup() {
  const contentIndex = readJson(contentIndexPath, { categories: [] });
  const novelLookup = new Map();
  for (const category of contentIndex.categories ?? []) {
    for (const novel of category.novels ?? []) {
      novelLookup.set(`${novel.categorySlug}/${novel.novelId}`, novel);
    }
  }
  return novelLookup;
}

function wikiHubJsonLd(novels) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: WIKI_HUB_HEADING,
    description: WIKI_HUB_META_DESCRIPTION,
    url: absoluteUrl("/wiki"),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/")
    },
    hasPart: novels.map((novel, index) => ({
      "@type": "CollectionPage",
      position: index + 1,
      name: novel.label,
      url: absoluteUrl(`/wiki/${encodePathSegment(novel.novelId)}`)
    }))
  };
}

function breadcrumbJsonLd(items) {
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

function termJsonLd({ entry, novelLabel, novelPath, termPath }) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.displayTitle,
    description: entry.definition,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${novelLabel} glossary`,
      url: absoluteUrl(novelPath)
    },
    url: absoluteUrl(termPath)
  };
}

function renderHubPage(novels) {
  const itemsHtml = novels.length
    ? novels
        .map(
          (novel) => `<a class="card" href="/wiki/${encodePathSegment(novel.novelId)}" data-label="${escapeHtml(
            novel.label.toLowerCase()
          )}">
  <div class="card-title">${escapeHtml(novel.label)}</div>
  <div class="card-copy">${escapeHtml(novel.summary || `Glossary hub for ${novel.label}.`)}</div>
  <div class="card-meta">${novel.termCount} terms</div>
</a>`
        )
        .join("\n")
    : `<div class="empty">No glossary entries yet. Run the wiki index pipeline after content sync to publish lore pages.</div>`;

  const body = `<main class="shell">
  <a class="pill" href="/">${escapeHtml(WIKI_NAV_LABEL)}</a>
  <section class="hero">
    <h1 class="title">${escapeHtml(WIKI_HUB_HEADING)}</h1>
    <p class="tagline">${escapeHtml(WIKI_HUB_TAGLINE)}</p>
    <div class="search-shell">
      <input id="wiki-search" type="search" placeholder="Search a novel glossary..." aria-label="Search wiki novels" />
      <button class="button" type="button" id="wiki-clear">Reset</button>
    </div>
    <p class="search-copy">Browse each novel glossary as a static SEO page, then jump into individual lore terms and source chapters.</p>
  </section>
  <section class="stack" id="wiki-list">${itemsHtml}</section>
  <footer class="footer">
    <p class="footer-copy">Static wiki pages are generated during deployment from your synced novel content, then served directly by Cloudflare assets.</p>
  </footer>
</main>
<script>
const input = document.getElementById('wiki-search');
const reset = document.getElementById('wiki-clear');
const cards = Array.from(document.querySelectorAll('#wiki-list [data-label]'));
function applyFilter() {
  const q = (input.value || '').trim().toLowerCase();
  for (const card of cards) {
    card.style.display = !q || card.dataset.label.includes(q) ? '' : 'none';
  }
}
input?.addEventListener('input', applyFilter);
reset?.addEventListener('click', () => { input.value = ''; applyFilter(); input.focus(); });
</script>`;

  return renderDocument({
    title: WIKI_HUB_HEADING,
    description: WIKI_HUB_META_DESCRIPTION,
    canonicalPath: "/wiki",
    body,
    jsonLd: [wikiHubJsonLd(novels)]
  });
}

function renderNovelHubPage(novel) {
  const pathName = `/wiki/${encodePathSegment(novel.novelId)}`;
  const description = trimDescription(
    novel.summary || `Glossary terms for ${novel.label}: cultivation lore, techniques, and world concepts with chapter links.`,
    170
  );
  const itemsHtml = novel.entries.length
    ? novel.entries
        .map(
          (entry) => `<a class="card" href="${pathName}/${encodePathSegment(entry.id)}">
  <div class="card-title">${escapeHtml(entry.displayTitle)}</div>
  <div class="card-copy">${escapeHtml(trimDescription(entry.definition, 150))}</div>
  <div class="card-meta">${entry.chapterNos.length} chapter references</div>
</a>`
        )
        .join("\n")
    : `<div class="empty">No glossary entries were available for this novel in the current wiki shard.</div>`;

  const body = `<main class="shell">
  <a class="pill" href="/wiki">${escapeHtml(WIKI_NAV_LABEL)}</a>
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/wiki">${escapeHtml(WIKI_NAV_LABEL)}</a>
      <span>/</span>
      <span>${escapeHtml(novel.label)}</span>
    </nav>
    <h1 class="title">${escapeHtml(novel.label)}</h1>
    <p class="tagline">${escapeHtml(
      novel.summary || `Term index for ${novel.label}, including cultivation lore, world concepts, and chapter-linked glossary entries.`
    )}</p>
    <p class="meta">${novel.termCount} terms in this glossary.</p>
  </section>
  <section class="grid">${itemsHtml}</section>
  <footer class="footer">
    <p class="footer-copy"><a href="/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(
      novel.novelId
    )}">Back to the novel directory</a></p>
  </footer>
</main>`;

  return renderDocument({
    title: `${novel.label} - ${WIKI_NAV_LABEL}`,
    description,
    canonicalPath: pathName,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `${novel.label} glossary`,
        description,
        url: absoluteUrl(pathName),
        isPartOf: {
          "@type": "CollectionPage",
          name: WIKI_HUB_HEADING,
          url: absoluteUrl("/wiki")
        }
      },
      breadcrumbJsonLd([
        { name: WIKI_NAV_LABEL, path: "/wiki" },
        { name: novel.label, path: pathName }
      ])
    ]
  });
}

function renderTermPage(novel, entry) {
  const novelPath = `/wiki/${encodePathSegment(novel.novelId)}`;
  const termPath = `${novelPath}/${encodePathSegment(entry.id)}`;
  const description = trimDescription(entry.definition, 170);
  const chapterLinks = entry.chapterNos.length
    ? entry.chapterNos
        .map((chapterNo) => {
          const href = `/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(
            novel.novelId
          )}/chapters/${encodePathSegment(chapterNo)}`;
          const n = Number.parseInt(chapterNo, 10);
          const label = Number.isFinite(n) ? `Chapter ${n}` : `Chapter ${chapterNo}`;
          return `<a class="chip" href="${href}">${escapeHtml(label)}</a>`;
        })
        .join("\n")
    : `<div class="empty">No chapter references were attached to this term in the current shard.</div>`;

  const body = `<main class="shell">
  <a class="pill" href="/wiki">${escapeHtml(WIKI_NAV_LABEL)}</a>
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/wiki">${escapeHtml(WIKI_NAV_LABEL)}</a>
      <span>/</span>
      <a href="${novelPath}">${escapeHtml(novel.label)}</a>
      <span>/</span>
      <span>${escapeHtml(entry.displayTitle)}</span>
    </nav>
    <h1 class="title">${escapeHtml(entry.displayTitle)}</h1>
    <p class="tagline">A static cultivation glossary entry for ${escapeHtml(novel.label)}.</p>
  </section>
  <article class="definition">
    <p class="section-label">Definition</p>
    <div class="prose">${renderDefinitionParagraphs(entry.definition)}</div>
  </article>
  <section class="section" aria-labelledby="appears-heading">
    <h2 id="appears-heading">Appears in chapters</h2>
    <p class="lede">Jump back into the novel from the exact chapter references used to build this glossary page.</p>
    <div class="chips">${chapterLinks}</div>
  </section>
  <section class="section" aria-labelledby="source-heading">
    <h2 id="source-heading">Source novel</h2>
    <p class="lede"><a href="/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(
      novel.novelId
    )}">${escapeHtml(novel.label)}</a></p>
  </section>
</main>`;

  return renderDocument({
    title: `${entry.displayTitle} - ${novel.label}`,
    description,
    canonicalPath: termPath,
    ogType: "article",
    body,
    jsonLd: [
      termJsonLd({ entry, novelLabel: novel.label, novelPath, termPath }),
      breadcrumbJsonLd([
        { name: WIKI_NAV_LABEL, path: "/wiki" },
        { name: novel.label, path: novelPath },
        { name: entry.displayTitle, path: termPath }
      ])
    ]
  });
}

function buildNovelRecords() {
  const manifest = readJson(manifestPath, { novels: {} });
  const contentLookup = loadContentIndexLookup();
  const novels = [];

  for (const [novelId, meta] of Object.entries(manifest.novels ?? {})) {
    const categorySlug = meta?.categorySlug;
    if (typeof categorySlug !== "string" || !categorySlug) continue;

    const shardPath = path.join(shardRoot, `${novelId}.json`);
    const shard = readJson(shardPath, null);
    if (!shard?.entries || typeof shard.entries !== "object") continue;

    const contentRecord = contentLookup.get(`${categorySlug}/${novelId}`) ?? null;
    const frontmatter = contentRecord?.frontmatter ?? {};
    const label = normalizeDisplayTitle(novelId, frontmatter);
    const summary = normalizeSummary(frontmatter);
    const updatedAt = normalizeDate(frontmatter.updated_at);
    const entries = Object.values(shard.entries)
      .filter((entry) => entry && typeof entry.id === "string" && typeof entry.definition === "string")
      .sort((a, b) => String(a.displayTitle || a.id).localeCompare(String(b.displayTitle || b.id), "en"));

    novels.push({
      novelId,
      categorySlug,
      label,
      summary,
      updatedAt,
      termCount: entries.length,
      entries
    });
  }

  novels.sort((a, b) => a.label.localeCompare(b.label, "en"));
  return novels;
}

function writeWikiPages() {
  const novels = buildNovelRecords();

  if (fs.existsSync(wikiOutRoot)) {
    fs.rmSync(wikiOutRoot, { recursive: true, force: true });
  }
  ensureDir(wikiOutRoot);

  writeText(path.join(wikiOutRoot, "index.html"), renderHubPage(novels));

  let termPageCount = 0;
  for (const novel of novels) {
    const novelDir = path.join(wikiOutRoot, novel.novelId);
    writeText(path.join(novelDir, "index.html"), renderNovelHubPage(novel));
    for (const entry of novel.entries) {
      writeText(path.join(novelDir, entry.id, "index.html"), renderTermPage(novel, entry));
      termPageCount += 1;
    }
  }

  return { novelCount: novels.length, termPageCount };
}

const { novelCount, termPageCount } = writeWikiPages();
log(`generated static wiki html: novels=${novelCount}, termPages=${termPageCount}, out=${wikiOutRoot}`);
