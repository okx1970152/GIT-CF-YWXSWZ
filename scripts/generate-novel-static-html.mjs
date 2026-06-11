import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const publicRoot = path.join(workspaceRoot, "public");
const assetsRoot = path.join(publicRoot, "__novel_static_assets__");
const categoryRoot = path.join(publicRoot, "category");
const novelsRoot = path.join(publicRoot, "novels");
const contentIndexPath = path.join(dataRoot, "content-index.json");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://wx.0o0o.mom").replace(/\/+$/, "");
const SITE_NAME = "Novel Portal";
const CATEGORY_NAV = [
  { slug: "xiuxian", label: "XiuXian" },
  { slug: "wuxia", label: "WuXia" },
  { slug: "xuanhuan", label: "XuanHuan" },
  { slug: "ranking", label: "Ranking" },
  { slug: "eastern-mythology-encyclopedia", label: "Eastern Mythology Encyclopedia" }
];
const CONTENT_CATEGORIES = new Set(["xiuxian", "wuxia", "xuanhuan", "ranking", "hot-essays"]);

function log(message) {
  process.stdout.write(`[novel-static] ${message}\n`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
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

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function trimDescription(value, maxLength = 180) {
  const compact = compactText(value);
  if (!compact) return "";
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function absoluteUrl(relPath) {
  return relPath.startsWith("/") ? `${SITE_URL}${relPath}` : `${SITE_URL}/${relPath}`;
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

function pathToHref(filePath) {
  return filePath.endsWith("/") ? filePath : `${filePath}/`;
}

function getCategoryLabel(slug) {
  const found = CATEGORY_NAV.find((item) => item.slug === slug);
  return found?.label ?? slug.replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function looksLikeMostlyCjk(input) {
  if (!String(input ?? "").trim()) return false;
  const cjk = (String(input).match(/[\u3400-\u9fff]/g) || []).length;
  return cjk >= Math.max(1, Math.floor(String(input).length / 3));
}

function getDisplayNovelTitle(novel) {
  const titleEn = String(novel.frontmatter?.title_en ?? "").trim();
  if (titleEn) return titleEn;
  const title = String(novel.frontmatter?.title ?? "").trim();
  if (title && !looksLikeMostlyCjk(title)) return title;
  return String(novel.novelId ?? "")
    .split("-")
    .filter(Boolean)
    .map((item) => item[0].toUpperCase() + item.slice(1))
    .join(" ");
}

function getNovelSummary(novel) {
  const summary = String(novel.frontmatter?.summary ?? "").trim();
  if (summary) return summary;
  const desc = String(novel.frontmatter?.desc ?? "").trim();
  if (desc) return desc;
  return `${getDisplayNovelTitle(novel)} is an ongoing web novel.`;
}

function mergeNovelTags(novel) {
  const raw = [...(Array.isArray(novel.frontmatter?.tags) ? novel.frontmatter.tags : []), ...(Array.isArray(novel.metaNovel?.tags) ? novel.metaNovel.tags : [])];
  const seen = new Set();
  const output = [];
  for (const item of raw) {
    const value = String(item ?? "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function effectiveRanking(novel) {
  const metaRanking = novel.metaNovel?.ranking;
  if (typeof metaRanking === "number" && Number.isFinite(metaRanking) && metaRanking > 0) return metaRanking;
  const infoRanking = novel.frontmatter?.ranking;
  if (typeof infoRanking === "number" && Number.isFinite(infoRanking)) return infoRanking;
  return 0;
}

function sortByRankingThenUpdated(novels) {
  return [...novels].sort((a, b) => {
    const rankGap = effectiveRanking(b) - effectiveRanking(a);
    if (rankGap !== 0) return rankGap;
    return new Date(String(b.frontmatter?.updated_at ?? "")).getTime() - new Date(String(a.frontmatter?.updated_at ?? "")).getTime();
  });
}

function splitParagraphs(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderMarkdownLite(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let paragraph = [];
  let listItems = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(`<p>${paragraph.map((line) => escapeHtml(line)).join("<br />")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(4, headingMatch[1].length + 1);
      parts.push(`<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^\-\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1].trim());
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return parts.join("\n");
}

function readMarkdownBody(filePath) {
  if (!fs.existsSync(filePath)) return "";
  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  return parsed.content.trim();
}

function readChapterMeta(categorySlug, novelId, chapterNo) {
  const metaPath = path.join(workspaceRoot, "novels", categorySlug, novelId, "meta", `${chapterNo}.json`);
  return readJson(metaPath, {}) || {};
}

function readAnnotationBody(categorySlug, novelId, fileName) {
  const annotationPath = path.join(workspaceRoot, "novels", categorySlug, novelId, "annotations", fileName);
  return readMarkdownBody(annotationPath);
}

function readChapterBody(categorySlug, novelId, fileName) {
  const chapterPath = path.join(workspaceRoot, "novels", categorySlug, novelId, "chapters", fileName);
  return readMarkdownBody(chapterPath);
}

function buildChapterGroups(chapters) {
  const parsed = chapters
    .map((chapter) => ({ ...chapter, numeric: Number.parseInt(chapter.chapterNo, 10) }))
    .filter((item) => Number.isFinite(item.numeric))
    .sort((a, b) => a.numeric - b.numeric);

  if (!parsed.length) return [];

  const groups = [];
  const maxNo = parsed[parsed.length - 1].numeric;
  for (let start = 1; start <= maxNo; start += 100) {
    const end = Math.min(start + 99, maxNo);
    const items = parsed.filter((item) => item.numeric >= start && item.numeric <= end);
    if (!items.length) continue;
    groups.push({
      key: `${start}-${end}`,
      label: `${String(start).padStart(4, "0")}-${String(end).padStart(4, "0")}`,
      items
    });
  }
  return groups;
}

function renderSiteHeader(activeSlug) {
  const nav = CATEGORY_NAV.map((item) => {
    const className = item.slug === activeSlug ? "site-pill site-pill--active" : "site-pill";
    return `<a class="${className}" href="${item.slug === "eastern-mythology-encyclopedia" ? "/category/eastern-mythology-encyclopedia/" : `/category/${item.slug}/`}">${escapeHtml(item.label)}</a>`;
  }).join("\n");

  return `<header class="site-header">
  <div class="site-header__inner">
    <div class="site-header__stack">
      <div class="site-header__tools">
        <a class="site-home" href="/">Novel Portal</a>
      </div>
      <nav class="site-header__categories" aria-label="Category navigation">${nav}</nav>
    </div>
  </div>
</header>`;
}

function renderDocument({ title, description, canonicalPath, body, jsonLd = [] }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(absoluteUrl(canonicalPath))}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(absoluteUrl(canonicalPath))}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <link rel="stylesheet" href="/__novel_static_assets__/novel-static.css" />
    ${jsonLd.map((item, index) => `<script type="application/ld+json" id="ld-json-${index + 1}">${escapeJsonForScript(item)}</script>`).join("\n")}
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderNovelCard(novel) {
  const href = pathToHref(`/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(novel.novelId)}`);
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = trimDescription(getNovelSummary(novel), 260);
  const author = String(novel.frontmatter?.author ?? "Unknown").trim() || "Unknown";
  const status = String(novel.frontmatter?.status ?? "Unknown").trim() || "Unknown";
  const category = String(novel.frontmatter?.category ?? getCategoryLabel(novel.categorySlug)).trim();
  const chapters = Number(novel.metaNovel?.chapter_count || novel.frontmatter?.total_chapters || novel.chapters?.length || 0);

  return `<a class="novel-card" href="${href}">
  <p class="novel-card__eyebrow">${escapeHtml(category)}</p>
  <h2 class="novel-card__title">${escapeHtml(displayTitle)}</h2>
  <div class="novel-card__meta">
    <span><strong>Author</strong>${escapeHtml(author)}</span>
    <span><strong>Status</strong>${escapeHtml(status)}</span>
    <span><strong>Chapters</strong>${escapeHtml(String(chapters))}</span>
    <span><strong>Updated</strong>${escapeHtml(String(novel.frontmatter?.updated_at ?? novel.metaNovel?.updated_at ?? "Unknown"))}</span>
  </div>
  <p class="novel-card__summary">${escapeHtml(summary)}</p>
  <span class="novel-card__cta">Open directory -></span>
</a>`;
}

function renderCategoryPage(categorySlug, novels, allNovels) {
  const label = getCategoryLabel(categorySlug);
  const isRanking = categorySlug === "ranking";
  const pool = isRanking ? allNovels : novels;
  const sorted = sortByRankingThenUpdated(pool);
  const latest = [...pool]
    .sort((a, b) => new Date(String(b.frontmatter?.updated_at ?? "")).getTime() - new Date(String(a.frontmatter?.updated_at ?? "")).getTime())
    .slice(0, 12);
  const featuredPool = isRanking ? sorted : sortByRankingThenUpdated(pool.filter((item) => item.frontmatter?.hot || item.frontmatter?.featured).length ? pool.filter((item) => item.frontmatter?.hot || item.frontmatter?.featured) : pool).slice(0, 12);
  const description = isRanking
    ? `Browse all English novels on ${SITE_NAME} sorted by editorial ranking and latest updates.`
    : `Browse English ${label} novels, directories, and chapter links on ${SITE_NAME}.`;
  const title = isRanking ? `Site Ranking & Leaderboard - ${SITE_NAME}` : `${label} Novels - ${SITE_NAME}`;
  const cards = sorted.length
    ? sorted.map((novel) => renderNovelCard(novel)).join("\n")
    : `<p class="empty-note">No novels in this category yet.</p>`;

  const body = `${renderSiteHeader(categorySlug)}
<main class="shell">
  <section class="hero-card">
    <p class="hero-card__eyebrow">${escapeHtml(isRanking ? "Site Ranking" : label)}</p>
    <h1 class="hero-card__title">${escapeHtml(isRanking ? "Site Ranking & Leaderboard" : `${label} Novels`)}</h1>
    <p class="hero-card__summary">${escapeHtml(description)}</p>
    <div class="hero-card__stats">
      <span><strong>Visible Novels</strong>${escapeHtml(String(sorted.length))}</span>
      <span><strong>Category</strong>${escapeHtml(label)}</span>
      <span><strong>Serving Mode</strong>Static HTML</span>
    </div>
  </section>

  <section class="section-card">
    <div class="section-card__top">
      <h2>${escapeHtml(isRanking ? "Top ranked novels" : `Popular in ${label}`)}</h2>
      <p>Each card opens a static directory page with crawlable chapter links.</p>
    </div>
    <div class="novel-grid">
      ${(featuredPool.length ? featuredPool : sorted.slice(0, 12)).map((novel) => renderNovelCard(novel)).join("\n")}
    </div>
  </section>

  <section class="section-card">
    <div class="section-card__top">
      <h2>${escapeHtml(isRanking ? "Recently updated" : `Latest in ${label}`)}</h2>
      <p>Freshly updated directories, sorted by source metadata timestamps.</p>
    </div>
    <div class="novel-grid">
      ${(latest.length ? latest : sorted.slice(0, 12)).map((novel) => renderNovelCard(novel)).join("\n")}
    </div>
  </section>

  <section class="section-card">
    <div class="section-card__top">
      <h2>${escapeHtml(isRanking ? "All novels by rank" : `All ${label} novels`)}</h2>
      <p>Static category shelf published directly to Cloudflare assets.</p>
    </div>
    <div class="novel-grid">${cards}</div>
  </section>
</main>`;

  return renderDocument({
    title,
    description,
    canonicalPath: `/category/${categorySlug}/`,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: isRanking ? "Site Ranking & Leaderboard" : `${label} Novels`,
        url: absoluteUrl(`/category/${categorySlug}/`)
      }
    ]
  });
}

function renderDirectoryPage(novel) {
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const description = trimDescription(String(novel.metaNovel?.meta_description || novel.metaNovel?.summary || summary), 190);
  const tags = mergeNovelTags(novel);
  const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
  const groups = buildChapterGroups(chapters);
  const firstChapter = chapters[0] ?? null;
  const latestChapter = chapters[chapters.length - 1] ?? null;
  const hrefBase = `/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(novel.novelId)}/`;
  const title = String(novel.metaNovel?.seo_title || `${displayTitle} - Directory`).trim();
  const chapterGroupsMarkup = groups.length
    ? groups
        .map(
          (group) => `<section class="chapter-group">
  <h3>${escapeHtml(group.label)}</h3>
  <div class="chapter-links">
    ${group.items
      .map(
        (chapter) => `<a class="chapter-link" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(chapter.chapterNo)}`)}">
      <span class="chapter-link__title">${escapeHtml(chapter.chapterNo)} - ${escapeHtml(chapter.title)}</span>
      <span class="chapter-link__meta">${chapter.wordCount ? `${Number(chapter.wordCount).toLocaleString("en-US")} words` : "Read chapter"}</span>
    </a>`
      )
      .join("\n")}
  </div>
</section>`
        )
        .join("\n")
    : `<p class="empty-note">No chapters yet.</p>`;

  const body = `${renderSiteHeader(novel.categorySlug)}
<main class="shell">
  <nav class="breadcrumbs">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/category/${encodePathSegment(novel.categorySlug)}/">${escapeHtml(getCategoryLabel(novel.categorySlug))}</a>
    <span>/</span>
    <span>${escapeHtml(displayTitle)}</span>
  </nav>

  <section class="hero-card">
    <p class="hero-card__eyebrow">${escapeHtml(String(novel.frontmatter?.category ?? getCategoryLabel(novel.categorySlug)))}</p>
    <h1 class="hero-card__title">${escapeHtml(displayTitle)}</h1>
    <p class="hero-card__summary">${escapeHtml(summary)}</p>
    <div class="hero-card__stats">
      <span><strong>Author</strong>${escapeHtml(String(novel.frontmatter?.author ?? "Unknown"))}</span>
      <span><strong>Status</strong>${escapeHtml(String(novel.frontmatter?.status ?? "Unknown"))}</span>
      <span><strong>Total Chapters</strong>${escapeHtml(String(novel.frontmatter?.total_chapters ?? chapters.length))}</span>
      <span><strong>Updated</strong>${escapeHtml(String(novel.frontmatter?.updated_at ?? novel.metaNovel?.updated_at ?? "Unknown"))}</span>
    </div>
    ${tags.length ? `<div class="tag-row">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    <div class="action-row">
      ${firstChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(firstChapter.chapterNo)}`)}">Start reading</a>` : ""}
      ${latestChapter ? `<a class="action-btn action-btn--secondary" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(latestChapter.chapterNo)}`)}">Latest chapter</a>` : ""}
    </div>
  </section>

  <section class="section-card">
    <div class="section-card__top">
      <h2>Chapter Directory</h2>
      <p>Static chapter links grouped into scrollable ranges for Cloudflare asset delivery.</p>
    </div>
    <div class="chapter-groups">${chapterGroupsMarkup}</div>
  </section>
</main>`;

  return renderDocument({
    title,
    description,
    canonicalPath: hrefBase,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Book",
        name: displayTitle,
        url: absoluteUrl(hrefBase)
      }
    ]
  });
}

function renderChapterPage(novel, chapter, chapterHtml, guideHtml, chapterMeta, prevChapter, nextChapter) {
  const displayTitle = getDisplayNovelTitle(novel);
  const chapterTitle = String(chapterMeta.chapter_title_en || chapter.title || "").trim() || String(chapter.title || "");
  const basePath = `/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(novel.novelId)}/`;
  const chapterPath = `${basePath}chapters/${encodePathSegment(chapter.chapterNo)}/`;
  const description = trimDescription(String(chapterMeta.chapter_meta_description || getNovelSummary(novel)), 180);
  const title = String(chapterMeta.chapter_seo_title || `${chapter.title} - ${displayTitle} - Reading Mode`).trim();

  const body = `${renderSiteHeader(novel.categorySlug)}
<main class="shell reading-shell">
  <nav class="breadcrumbs">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/category/${encodePathSegment(novel.categorySlug)}/">${escapeHtml(getCategoryLabel(novel.categorySlug))}</a>
    <span>/</span>
    <a href="${pathToHref(basePath)}">${escapeHtml(displayTitle)}</a>
    <span>/</span>
    <span>${escapeHtml(chapterTitle)}</span>
  </nav>

  <div class="reading-grid">
    <article class="reading-card">
      <header class="reading-card__header">
        <p class="reading-card__eyebrow">${escapeHtml(displayTitle)}</p>
        <h1>${escapeHtml(chapterTitle)}</h1>
        <div class="reading-card__meta">
          <span><strong>Chapter</strong>${escapeHtml(chapter.chapterNo)}</span>
          ${chapter.wordCount ? `<span><strong>Words</strong>${escapeHtml(Number(chapter.wordCount).toLocaleString("en-US"))}</span>` : ""}
          <span><strong>Updated</strong>${escapeHtml(String(chapter.updatedAt || chapter.publishedAt || chapterMeta.updated_at || "Unknown"))}</span>
        </div>
      </header>
      <div class="reading-prose">${chapterHtml}</div>
      <nav class="chapter-nav">
        ${prevChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${basePath}chapters/${encodePathSegment(prevChapter.chapterNo)}`)}">Previous Chapter</a>` : `<span class="action-btn action-btn--disabled">Previous Chapter</span>`}
        <a class="action-btn action-btn--secondary" href="${pathToHref(basePath)}">Directory</a>
        ${nextChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${basePath}chapters/${encodePathSegment(nextChapter.chapterNo)}`)}">Next Chapter</a>` : `<span class="action-btn action-btn--disabled">Next Chapter</span>`}
      </nav>
    </article>

    <aside class="guide-card">
      <h2>Essential Guide</h2>
      <div class="guide-card__body">${guideHtml || "<p>No annotation yet.</p>"}</div>
      ${(Array.isArray(chapterMeta.chapter_keywords) && chapterMeta.chapter_keywords.length) || (Array.isArray(chapterMeta.guide_tags) && chapterMeta.guide_tags.length)
        ? `<div class="tag-row">${[...(Array.isArray(chapterMeta.chapter_keywords) ? chapterMeta.chapter_keywords : []), ...(Array.isArray(chapterMeta.guide_tags) ? chapterMeta.guide_tags : [])]
            .filter((item, index, array) => String(item ?? "").trim() && array.findIndex((entry) => String(entry).toLowerCase() === String(item).toLowerCase()) === index)
            .map((tag) => `<span class="tag">${escapeHtml(String(tag))}</span>`)
            .join("")}</div>`
        : ""}
    </aside>
  </div>
</main>`;

  return renderDocument({
    title,
    description,
    canonicalPath: chapterPath,
    body,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: chapterTitle,
        url: absoluteUrl(chapterPath),
        isPartOf: {
          "@type": "Book",
          name: displayTitle,
          url: absoluteUrl(basePath)
        }
      }
    ]
  });
}

function buildStyles() {
  return `
    :root{
      --bg:#edf4eb;
      --surface:#f8fcf7;
      --card:#ffffff;
      --line:#d5e6d3;
      --deep:#203326;
      --soft:#536a59;
      --muted:#78907d;
      --accent:#07c160;
      --accent-deep:#05944a;
      --accent-soft:#dff7e8;
      --shadow:0 18px 42px rgba(36,58,43,.08);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      background:
        radial-gradient(circle at top left, rgba(7,193,96,.08), transparent 22rem),
        linear-gradient(180deg,#f6fbf4 0%,var(--bg) 100%);
      color:var(--deep);
      font-family:Georgia,"Times New Roman",serif;
    }
    a{color:inherit;text-decoration:none}
    .site-header{
      position:sticky;
      top:0;
      z-index:20;
      border-bottom:1px solid var(--line);
      background:rgba(248,252,247,.96);
      backdrop-filter:blur(10px);
    }
    .site-header__inner{max-width:1400px;margin:0 auto;padding:16px 18px}
    .site-header__stack{display:flex;flex-direction:column;gap:12px}
    .site-header__tools,.site-header__categories{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
    .site-header__categories{padding-top:6px;border-top:1px solid var(--line)}
    .site-home,.site-pill{
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--line);border-radius:999px;background:var(--surface);
      padding:8px 14px;font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft);
      transition:background-color .18s ease,border-color .18s ease,color .18s ease,transform .18s ease;
    }
    .site-home{border-radius:14px}
    .site-pill--active,.site-home:hover,.site-pill:hover{
      background:var(--accent-soft);border-color:#9cd8b5;color:var(--deep);transform:translateY(-1px);
    }
    .site-pill--active{background:var(--accent);border-color:var(--accent);color:#fff}
    .shell{max-width:1400px;margin:0 auto;padding:24px 18px 72px}
    .breadcrumbs{
      display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      margin-bottom:18px;color:var(--muted);font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;
    }
    .breadcrumbs a{color:var(--accent-deep)}
    .hero-card,.section-card,.reading-card,.guide-card{
      border:1px solid var(--line);border-radius:28px;background:rgba(255,255,255,.96);
      box-shadow:var(--shadow);
    }
    .hero-card{padding:30px 26px}
    .section-card,.reading-card,.guide-card{padding:24px 22px}
    .hero-card__eyebrow,.novel-card__eyebrow,.reading-card__eyebrow{
      margin:0;color:var(--muted);font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;
    }
    .hero-card__title{margin:10px 0 0;font-size:clamp(2rem,4vw,3.4rem);line-height:1.05;letter-spacing:-.03em}
    .hero-card__summary{margin:14px 0 0;max-width:980px;font-size:1.08rem;line-height:1.9;color:var(--soft)}
    .hero-card__stats,.novel-card__meta,.reading-card__meta{
      display:grid;gap:12px;margin-top:20px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
      color:var(--soft);font:500 14px/1.6 ui-sans-serif,system-ui,sans-serif;
    }
    .hero-card__stats strong,.novel-card__meta strong,.reading-card__meta strong{display:block;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.1em}
    .tag-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
    .tag{
      display:inline-flex;align-items:center;justify-content:center;
      border:1px solid var(--line);border-radius:999px;background:var(--surface);
      padding:8px 12px;font:600 13px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft);
    }
    .action-row,.chapter-nav{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
    .action-btn{
      display:inline-flex;align-items:center;justify-content:center;
      min-height:44px;border-radius:14px;padding:11px 16px;font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;
    }
    .action-btn--primary{background:var(--accent);color:#fff}
    .action-btn--secondary{border:1px solid var(--line);background:var(--surface);color:var(--deep)}
    .action-btn--disabled{border:1px dashed #c4d4c3;background:#eef3ed;color:#90a092}
    .section-card{margin-top:24px}
    .section-card__top{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
    .section-card__top h2,.guide-card h2{margin:0;font-size:1.6rem;line-height:1.2}
    .section-card__top p{margin:0;color:var(--soft);font-size:1rem;line-height:1.7}
    .novel-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
    .novel-card{
      display:flex;flex-direction:column;gap:14px;min-height:320px;
      border:1px solid var(--line);border-radius:24px;background:var(--card);padding:22px;
      box-shadow:0 14px 32px rgba(36,58,43,.06);
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
    }
    .novel-card:hover{transform:translateY(-2px);border-color:#9cd8b5;box-shadow:0 20px 40px rgba(7,193,96,.12)}
    .novel-card__title{margin:0;font-size:1.55rem;line-height:1.2}
    .novel-card__summary{margin:0;color:var(--soft);line-height:1.85;flex:1}
    .novel-card__cta{color:var(--accent-deep);font:700 13px/1.2 ui-sans-serif,system-ui,sans-serif}
    .chapter-groups{display:grid;gap:18px}
    .chapter-group{
      border:1px solid var(--line);border-radius:22px;background:var(--surface);padding:18px;
    }
    .chapter-group h3{margin:0 0 14px;font-size:1.25rem}
    .chapter-links{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .chapter-link{
      display:flex;flex-direction:column;gap:8px;
      border:1px solid var(--line);border-radius:18px;background:#fff;padding:14px 15px;
      transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease;
    }
    .chapter-link:hover{transform:translateY(-1px);border-color:#9cd8b5;box-shadow:0 12px 24px rgba(7,193,96,.1)}
    .chapter-link__title{font-weight:700;line-height:1.55}
    .chapter-link__meta{color:var(--muted);font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif}
    .reading-grid{
      display:grid;gap:24px;grid-template-columns:minmax(0,1.7fr) minmax(300px,360px);
      align-items:start;
    }
    .reading-card__header h1{margin:10px 0 0;font-size:clamp(2rem,3vw,2.7rem);line-height:1.08}
    .reading-prose{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
    .reading-prose h2,.reading-prose h3,.guide-card__body h2,.guide-card__body h3{margin:1.4em 0 .6em;line-height:1.25}
    .reading-prose p,.guide-card__body p{margin:1em 0;color:var(--soft);font-size:1.04rem;line-height:1.95}
    .reading-prose ul,.guide-card__body ul{margin:1em 0;padding-left:1.3rem;color:var(--soft)}
    .reading-prose li,.guide-card__body li{margin:.55em 0;line-height:1.8}
    .guide-card__body{margin-top:16px}
    .empty-note{
      margin:0;border:1px dashed var(--line);border-radius:18px;background:var(--surface);
      padding:18px;text-align:center;color:var(--soft)
    }
    @media (max-width: 980px){
      .reading-grid{grid-template-columns:1fr}
    }
  `;
}

function loadContentIndex() {
  const root = readJson(contentIndexPath, { categories: [] });
  const categories = Array.isArray(root?.categories) ? root.categories : [];
  const mapped = categories
    .filter((category) => CONTENT_CATEGORIES.has(String(category.slug || "")))
    .map((category) => ({
      slug: String(category.slug),
      novels: Array.isArray(category.novels) ? category.novels : []
    }));
  return {
    categories: mapped,
    novels: mapped.flatMap((category) => category.novels)
  };
}

function main() {
  const { categories, novels } = loadContentIndex();
  ensureDir(assetsRoot);
  writeText(path.join(assetsRoot, "novel-static.css"), buildStyles());

  let chapterPageCount = 0;
  let novelPageCount = 0;
  let categoryPageCount = 0;

  for (const category of categories) {
    const html = renderCategoryPage(category.slug, category.novels, novels);
    writeText(path.join(categoryRoot, category.slug, "index.html"), html);
    categoryPageCount += 1;
  }

  if (!categories.find((item) => item.slug === "ranking")) {
    writeText(path.join(categoryRoot, "ranking", "index.html"), renderCategoryPage("ranking", [], novels));
    categoryPageCount += 1;
  }

  for (const novel of novels) {
    writeText(path.join(novelsRoot, novel.categorySlug, novel.novelId, "index.html"), renderDirectoryPage(novel));
    novelPageCount += 1;

    const chapters = Array.isArray(novel.chapters) ? novel.chapters : [];
    for (let index = 0; index < chapters.length; index += 1) {
      const chapter = chapters[index];
      const prevChapter = index > 0 ? chapters[index - 1] : null;
      const nextChapter = index < chapters.length - 1 ? chapters[index + 1] : null;
      const chapterMeta = readChapterMeta(novel.categorySlug, novel.novelId, chapter.chapterNo);
      const annotationFileName = novel.annotationsByChapterNo?.[chapter.chapterNo]?.fileName || `${chapter.chapterNo}.md`;
      const chapterBody = readChapterBody(novel.categorySlug, novel.novelId, chapter.fileName);
      const guideBody = readAnnotationBody(novel.categorySlug, novel.novelId, annotationFileName);
      const chapterHtml = renderMarkdownLite(chapterBody);
      const guideHtml = renderMarkdownLite(guideBody || "*No annotation yet.*");
      writeText(
        path.join(novelsRoot, novel.categorySlug, novel.novelId, "chapters", chapter.chapterNo, "index.html"),
        renderChapterPage(novel, chapter, chapterHtml, guideHtml, chapterMeta, prevChapter, nextChapter)
      );
      chapterPageCount += 1;
    }
  }

  log(`generated static novel html: categories=${categoryPageCount}, novels=${novelPageCount}, chapters=${chapterPageCount}`);
}

main();
