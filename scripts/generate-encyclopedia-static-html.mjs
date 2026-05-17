import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const publicRoot = path.join(workspaceRoot, "public");
const categoryOutRoot = path.join(publicRoot, "category", "eastern-mythology-encyclopedia");
const novelsOutRoot = path.join(publicRoot, "novels", "eastern-mythology-encyclopedia");
const assetsOutRoot = path.join(publicRoot, "__encyclopedia_assets__");
const indexPath = path.join(dataRoot, "encyclopedia-index.json");

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
    .grid--reading{grid-template-columns:minmax(0,920px) minmax(320px,420px);gap:24px;margin-top:24px}
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
    .stack{display:grid;gap:22px}
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
    .sidebar{display:grid;gap:22px}
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
      display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))
    }
    .nav-box{
      min-height:92px;border:1px solid var(--line);border-radius:20px;background:var(--card);padding:16px
    }
    .nav-box strong{display:block;font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
    .nav-box span{display:block;margin-top:8px;color:var(--soft);font-size:.98rem;line-height:1.55}
    .nav-box--center{display:flex;align-items:center;justify-content:center;text-align:center}
    .empty-note{
      border:1px dashed var(--line);border-radius:20px;background:rgba(245,250,244,.88);padding:20px;
      color:var(--muted);font:500 14px/1.8 ui-sans-serif,system-ui,sans-serif
    }
    .footer{
      margin-top:40px;padding-top:22px;border-top:1px solid rgba(113,133,117,.24);
      color:var(--muted);font:500 14px/1.7 ui-sans-serif,system-ui,sans-serif
    }
    @media (max-width: 1023px){
      .grid--reading{grid-template-columns:1fr}
    }
    @media (max-width: 700px){
      .site-header__inner{padding:14px}
      .site-search{min-width:100%}
      .shell{padding:20px 14px 56px}
      .hero{padding:24px 18px}
      .section-card,.entry-card,.term-card,.rail-card{padding:20px 18px}
      .nav-row{grid-template-columns:1fr}
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
<main class="shell">
  <section class="hero">
    <p class="eyebrow">Eastern Mythology Encyclopedia</p>
    <h1 class="title">Eastern Mythology Encyclopedia</h1>
    <p class="subtitle">Ten mythic volumes. Ten doors into an older cosmology. Read them like books and open each entry like a full chapter of lore.</p>
    ${renderShareBar(encyclopediaHubPath(), "Eastern Mythology Encyclopedia")}
  </section>
  <section class="section-card" style="margin-top:24px">
    <h2 class="section-title">The Ten Volumes</h2>
    <div class="grid grid--volumes">${renderVolumeCards(volumes)}</div>
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
  const body = `${renderSiteHeader("eastern-mythology-encyclopedia")}
<main class="shell">
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="${encyclopediaHubPath()}">Eastern Mythology Encyclopedia</a>
      <span>/</span>
      <span>${escapeHtml(volume.titleEn)}</span>
    </nav>
    <p class="eyebrow">Eastern Mythology Encyclopedia</p>
    <h1 class="title">${escapeHtml(volume.titleEn)}</h1>
    <p class="subhead">${escapeHtml(volume.title)}</p>
    <p class="subtitle">${escapeHtml(volume.summary)}</p>
    <div class="meta-grid">
      <div><strong>Author</strong>${escapeHtml(volume.author)}</div>
      <div><strong>Status</strong>${escapeHtml(volume.status)}</div>
      <div><strong>Entries</strong>${escapeHtml(String(volume.totalChapters))}</div>
      <div><strong>Updated</strong>${escapeHtml(volume.updatedAt)}</div>
    </div>
    ${volume.tags?.length ? `<div class="tag-row" style="margin-top:18px">${volume.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    ${renderShareBar(volumePath(volume), volume.titleEn)}
  </section>
  <section class="section-card" style="margin-top:24px">
    <h2 class="section-title">Volume Overview</h2>
    <div class="prose-group" style="margin-top:16px">${renderParagraphBlocks(volume.desc || volume.summary)}</div>
  </section>
  <section class="section-card" style="margin-top:24px">
    <h2 class="section-title">Entries</h2>
    <div class="grid grid--entries">${renderEntryLinks(volume)}</div>
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

function renderEntryPage(volume, entrySummary, entry, relationLookup, prevEntry, nextEntry) {
  const meta = getRecord(entry.meta);
  const seo = getRecord(entry.seo);
  const entryPayload = getRecord(entry.entry);
  const titleEn = getString(meta.title_en) || entrySummary.titleEn;
  const titleCn = getString(meta.title_cn) || entrySummary.titleCn;
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

  const body = `${renderSiteHeader("eastern-mythology-encyclopedia")}
<main class="shell">
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <span>/</span>
      <a href="${encyclopediaHubPath()}">Eastern Mythology Encyclopedia</a>
      <span>/</span>
      <a href="${volumePath(volume)}">${escapeHtml(volume.titleEn)}</a>
      <span>/</span>
      <span>${escapeHtml(titleEn)}</span>
    </nav>
    <p class="eyebrow">Eastern Mythology Encyclopedia</p>
    <h1 class="title">${escapeHtml(titleEn)}</h1>
    <p class="subhead">${escapeHtml(titleCn)}</p>
    ${hook ? `<p class="subtitle">${escapeHtml(hook)}</p>` : ""}
    ${renderShareBar(entryPath(volume, entrySummary), titleEn)}
  </section>
  <section class="grid grid--reading">
    <article class="stack">
      <section class="section-card">
        <h2 class="section-title">Entry</h2>
        <div class="prose-group" style="margin-top:16px">${renderTextList(bodySections)}</div>
      </section>
      <section class="section-card">
        <h2 class="section-title">Navigation</h2>
        <div class="nav-row" style="margin-top:16px">
          ${
            prevEntry
              ? `<a class="nav-box" href="${entryPath(volume, prevEntry)}"><strong>Previous</strong><span>${escapeHtml(prevEntry.titleEn)}</span></a>`
              : `<div class="nav-box"><strong>Previous</strong><span>Beginning of this volume.</span></div>`
          }
          <a class="nav-box nav-box--center" href="${volumePath(volume)}"><span>Back to Volume Directory</span></a>
          ${
            nextEntry
              ? `<a class="nav-box" href="${entryPath(volume, nextEntry)}"><strong>Next</strong><span>${escapeHtml(nextEntry.titleEn)}</span></a>`
              : `<div class="nav-box"><strong>Next</strong><span>End of this volume.</span></div>`
          }
        </div>
      </section>
    </article>
    <aside class="sidebar">
      <section class="rail-card">
        <h2 class="section-title">Guide</h2>
        <div class="prose-group" style="margin-top:16px">${guideSections.length ? renderTextList(guideSections) : `<div class="empty-note">No guide sections were included for this entry.</div>`}</div>
      </section>
      <section class="rail-card">
        <h2 class="section-title">FAQ</h2>
        <div class="stack" style="margin-top:16px">${renderFaq(faqEntries)}</div>
      </section>
      <section class="rail-card">
        <h2 class="section-title">Lore</h2>
        <div class="stack" style="margin-top:16px">${renderLore(loreEntries)}</div>
      </section>
      <section class="rail-card">
        <h2 class="section-title">Related Entries</h2>
        <div class="stack" style="margin-top:16px">${renderRelationLinks(relationEntries, relationLookup)}</div>
      </section>
      ${
        getArray(seo.tags).length
          ? `<section class="rail-card">
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
      writeText(
        path.join(novelsOutRoot, volume.novelId, "chapters", entrySummary.slug, "index.html"),
        renderEntryPage(volume, entrySummary, entry, relationLookup, prevEntry, nextEntry)
      );
      entryPageCount += 1;
    }

    log(`rendered volume: ${volume.novelId}, entries=${volume.entries.length}`);
  }

  log(`generated static encyclopedia html: volumes=${volumes.length}, entryPages=${entryPageCount}`);
}

main();
