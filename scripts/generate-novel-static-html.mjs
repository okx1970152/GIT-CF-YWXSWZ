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
const SITE_BRAND = "WX.0O0O.MOM";
const CONTACT_EMAIL = "WX@0O0O.MOM";
const FRIEND_LINKS = [
  { id: "x", label: "X", href: "https://x.com", icon: "/LOGO/x.png" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com", icon: "/LOGO/facebook.png" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com", icon: "/LOGO/instagram.png" },
  { id: "telegram", label: "Telegram", href: "https://telegram.org", icon: "/LOGO/telegram.png" },
  { id: "reddit", label: "Reddit", href: "https://www.reddit.com", icon: "/LOGO/reddit.png" },
  { id: "quora", label: "Quora", href: "https://www.quora.com", icon: "/LOGO/quora.png" },
  { id: "threads", label: "Threads", href: "https://www.threads.net", icon: "/LOGO/threads.png" },
  {
    id: "google",
    label: "Google",
    href: `https://www.google.com/search?q=${encodeURIComponent("site:wx.0o0o.mom")}`,
    icon: "/LOGO/google.png"
  },
  {
    id: "bing",
    label: "Bing",
    href: `https://www.bing.com/search?q=${encodeURIComponent("site:wx.0o0o.mom")}`,
    icon: "/LOGO/bing.png"
  }
];
const SHARE_TARGETS = [
  { id: "x", toastName: "X", title: "Share to X", icon: "/LOGO/x.png" },
  { id: "facebook", toastName: "Facebook", title: "Share to Facebook", icon: "/LOGO/facebook.png" },
  { id: "instagram", toastName: "Instagram", title: "Share to Instagram", icon: "/LOGO/instagram.png" },
  { id: "telegram", toastName: "Telegram", title: "Share to Telegram", icon: "/LOGO/telegram.png" },
  { id: "reddit", toastName: "Reddit", title: "Share to Reddit", icon: "/LOGO/reddit.png" },
  { id: "quora", toastName: "Quora", title: "Share to Quora", icon: "/LOGO/quora.png" },
  { id: "threads", toastName: "Threads", title: "Share to Threads", icon: "/LOGO/threads.png" }
];

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

function legalLead({ variant, categoryLabel, novelTitle }) {
  switch (variant) {
    case "category":
      return `All ${categoryLabel ?? "category"} novels featured on ${SITE_BRAND} are contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
    case "directory":
    case "reading":
      return `All chapter content for "${novelTitle ?? "this novel"}" on ${SITE_BRAND} is contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
    case "home":
    default:
      return `All novel works featured on ${SITE_BRAND} are contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
  }
}

function renderSiteFooter({ variant, categoryLabel, novelTitle }) {
  return `<footer class="site-footer">
  <div class="site-footer__inner">
    <h2 class="site-footer__heading">Friend links (see contact email in footer)</h2>
    <div class="site-footer__links-wrap">
      <div class="site-footer__links">
        ${FRIEND_LINKS.map((item) => `<a class="friend-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(item.label)}">
          <img src="${escapeHtml(item.icon)}" alt="" class="friend-link__icon" loading="lazy" />
          <span>${escapeHtml(item.label)}</span>
        </a>`).join("\n")}
      </div>
    </div>
    <div class="site-footer__legal">
      <p class="site-footer__copy">${escapeHtml(legalLead({ variant, categoryLabel, novelTitle }))}</p>
      <p class="site-footer__meta">
        <span>Copyright 2026 - ${SITE_BRAND}</span>
        <span class="site-footer__sep">|</span>
        <button type="button" class="site-footer__button" data-copy-email="${escapeHtml(CONTACT_EMAIL)}">Contact email: ${CONTACT_EMAIL}</button>
        <span class="site-footer__sep">|</span>
        <button type="button" class="site-footer__button" data-copy-email="${escapeHtml(CONTACT_EMAIL)}">Request author access</button>
        <span class="site-footer__sep">|</span>
        <span>Free online reading</span>
      </p>
    </div>
  </div>
</footer>`;
}

function renderShareBar({ shareUrl, shareTitle, variant = "default", showBookmark = true, className = "" }) {
  const compact = variant === "compact";
  return `<div class="share-bar ${compact ? "share-bar--compact" : ""} ${className}" role="group" aria-label="Share and bookmark" data-share-url="${escapeHtml(shareUrl)}" data-share-title="${escapeHtml(shareTitle)}">
    <span class="share-bar__label">Share to</span>
    <div class="share-bar__scroller">
      <ul class="share-bar__list">
        ${SHARE_TARGETS.map((item) => `<li class="share-bar__item">
          <button type="button" class="share-bar__button" title="${escapeHtml(item.title)}" aria-label="${escapeHtml(item.title)}" data-share-platform="${escapeHtml(item.toastName)}">
            <img src="${escapeHtml(item.icon)}" alt="" class="share-bar__icon" loading="lazy" />
          </button>
        </li>`).join("\n")}
        ${showBookmark ? `<li class="share-bar__item">
          <button type="button" class="share-bar__button share-bar__button--bookmark" title="Add to browser bookmarks" aria-label="Add to browser bookmarks" data-bookmark-url="${escapeHtml(shareUrl)}" data-bookmark-title="${escapeHtml(shareTitle)}">
            <span class="share-bar__star">★</span>
          </button>
        </li>` : ""}
      </ul>
    </div>
  </div>`;
}

function renderSideAdsShell(page, content) {
  return `<div class="side-ads-shell side-ads-shell--${escapeHtml(page)}">
    <div class="side-ads-shell__grid">
      <aside class="side-ads-shell__aside side-ads-shell__aside--left">
        <div class="side-ads-shell__stack">
          <div class="side-ad-placeholder">Ad Slot</div>
          <div class="side-ad-placeholder">Ad Slot</div>
          <div class="side-ad-placeholder">Ad Slot</div>
        </div>
      </aside>
      <div class="side-ads-shell__content">${content}</div>
      <aside class="side-ads-shell__aside side-ads-shell__aside--right">
        <div class="side-ads-shell__stack">
          <div class="side-ad-placeholder">Ad Slot</div>
          <div class="side-ad-placeholder">Ad Slot</div>
          <div class="side-ad-placeholder">Ad Slot</div>
        </div>
      </aside>
    </div>
  </div>`;
}

function renderRail(title, novels, railId, featuredLabel = null) {
  if (!novels.length) {
    return `<section class="section-rail"><p class="empty-note">No novels in this section yet.</p></section>`;
  }
  const first = novels[0];
  const rest = novels.slice(1);
  return `<section class="section-rail" aria-labelledby="${escapeHtml(railId)}-heading">
    <div class="section-rail__top">
      <h2 id="${escapeHtml(railId)}-heading" class="section-rail__title">${escapeHtml(title)}</h2>
      ${rest.length ? `<div class="section-rail__controls">
        <button type="button" class="section-rail__button" data-rail-prev="${escapeHtml(railId)}">Prev</button>
        <button type="button" class="section-rail__button" data-rail-next="${escapeHtml(railId)}">Next</button>
      </div>` : ""}
    </div>
    <div class="section-rail__layout">
      <div class="section-rail__featured">${renderNovelCard(first, { rail: true, featuredLabel })}</div>
      ${rest.length ? `<div class="section-rail__scroller" data-rail="${escapeHtml(railId)}">
        <div class="section-rail__track">
          ${rest.map((novel) => renderNovelCard(novel, { rail: true })).join("\n")}
        </div>
      </div>` : ""}
    </div>
  </section>`;
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
    <script defer src="/__novel_static_assets__/novel-static.js"></script>
    ${jsonLd.map((item, index) => `<script type="application/ld+json" id="ld-json-${index + 1}">${escapeJsonForScript(item)}</script>`).join("\n")}
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function renderNovelCard(novel, options = {}) {
  const href = pathToHref(`/novels/${encodePathSegment(novel.categorySlug)}/${encodePathSegment(novel.novelId)}`);
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const author = String(novel.frontmatter?.author ?? "Unknown").trim() || "Unknown";
  const status = String(novel.frontmatter?.status ?? "Unknown").trim() || "Unknown";
  const category = String(novel.frontmatter?.category ?? getCategoryLabel(novel.categorySlug)).trim();
  const chapters = Number(novel.metaNovel?.chapter_count || novel.frontmatter?.total_chapters || novel.chapters?.length || 0);
  const coverUrl = String(novel.frontmatter?.cover ?? "").trim();
  const shareUrl = absoluteUrl(href);
  const compactSummary = trimDescription(summary, options.rail ? 320 : 260);
  return `<div class="novel-card ${options.rail ? "novel-card--rail" : ""}">
  ${coverUrl ? `<a href="${href}" aria-hidden="true" tabindex="-1" class="novel-card__cover-wrap"><img src="${escapeHtml(coverUrl)}" alt="" class="novel-card__cover" loading="lazy" /></a>` : ""}
  <a class="novel-card__body" href="${href}" aria-label="Open directory: ${escapeHtml(displayTitle)}">
  ${options.featuredLabel ? `<p class="novel-card__featured-label">${escapeHtml(options.featuredLabel)}</p>` : ""}
  <p class="novel-card__eyebrow">${escapeHtml(category)}</p>
  <h2 class="novel-card__title">${escapeHtml(displayTitle)}</h2>
  <div class="novel-card__meta">
    <span><strong>Author</strong>${escapeHtml(author)}</span>
    <span><strong>Status</strong>${escapeHtml(status)}</span>
    <span><strong>Chapters</strong>${escapeHtml(String(chapters))}</span>
    <span><strong>Updated</strong>${escapeHtml(String(novel.frontmatter?.updated_at ?? novel.metaNovel?.updated_at ?? "Unknown"))}</span>
  </div>
  <p class="novel-card__summary">${escapeHtml(compactSummary)}</p>
  </a>
  <div class="novel-card__share">${renderShareBar({ shareUrl, shareTitle: displayTitle, variant: "compact", showBookmark: false, className: "novel-card__share-bar" })}</div>
  <a href="${href}" class="novel-card__hint">Click anywhere to read directory</a>
</div>`;
}

function renderCategoryPage(categorySlug, novels, allNovels) {
  const label = getCategoryLabel(categorySlug);
  const isRanking = categorySlug === "ranking";
  const pool = isRanking ? allNovels : novels;
  const sorted = sortByRankingThenUpdated(pool);
  const latest = [...pool]
    .sort((a, b) => new Date(String(b.frontmatter?.updated_at ?? "")).getTime() - new Date(String(a.frontmatter?.updated_at ?? "")).getTime())
    .slice(0, 12);
  const popularPool = isRanking
    ? sorted.slice(0, 12)
    : sortByRankingThenUpdated(
        pool.filter((item) => item.frontmatter?.hot || item.frontmatter?.featured).length
          ? pool.filter((item) => item.frontmatter?.hot || item.frontmatter?.featured)
          : pool
      ).slice(0, 12);
  const description = isRanking
    ? `Browse all English novels on ${SITE_NAME} sorted by editorial ranking across XiuXian, WuXia, XuanHuan, and more plus recently updated picks.`
    : `Browse English ${label} novels, with directories, synopses, and crawlable chapter links on ${SITE_NAME}.`;
  const title = isRanking ? `Site Ranking & Leaderboard - ${SITE_NAME}` : `${label} Novels - ${SITE_NAME}`;
  const cards = sorted.length
    ? sorted.map((novel) => renderNovelCard(novel)).join("\n")
    : `<p class="empty-note">No novels in this category yet.</p>`;

  const pageBody = `
  <div class="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6 category-static-shell">
    <section aria-label="${escapeHtml(label)} category semantic summary" class="sr-only">
      <h1>${escapeHtml(isRanking ? "Site ranking and leaderboard" : `${label} Novels`)}</h1>
      <p>${escapeHtml(
        isRanking
          ? "Top-ranked novels across every shelf, plus recently updated titles. Cards link to each novel's real category directory."
          : "Popular and recently updated novels in this shelf. Every card opens a crawlable novel directory with chapter links."
      )}</p>
    </section>
    <section class="category-rail-shell">
      ${renderRail(isRanking ? "Top ranked (site-wide)" : `Popular in ${label}`, popularPool.length ? popularPool : sorted.slice(0, 12), `${categorySlug}-popular`, isRanking ? "Top rank" : "Featured")}
      ${renderRail(isRanking ? "Recently updated (site-wide)" : `Latest in ${label}`, latest.length ? latest : sorted.slice(0, 12), `${categorySlug}-latest`, "Latest")}
    </section>
    <section class="category-grid-section" aria-labelledby="all-category-heading">
      <h2 id="all-category-heading" class="category-grid-section__title">${escapeHtml(isRanking ? "All novels by rank" : `All ${label} Novels`)}</h2>
      ${cards ? `<div class="novel-grid">${cards}</div>` : cards}
    </section>
  </div>`;

  const body = `${renderSiteHeader(categorySlug)}
${renderSideAdsShell("category", pageBody)}
${renderSiteFooter({ variant: "category", categoryLabel: label })}`;

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
  const heroUrl = String(novel.frontmatter?.hero ?? "").trim();
  const coverUrl = String(novel.frontmatter?.cover ?? "").trim();
  const shareUrl = absoluteUrl(hrefBase);
  const synopsisPreview = trimDescription(summary, 459);
  const chapterGroupsMarkup = groups.length
    ? groups
        .map(
          (group) => `<section class="chapter-group" id="chapter-range-${escapeHtml(group.label)}">
  <div class="chapter-group__top">
    <div>
      <p class="chapter-group__eyebrow">Chapter Range</p>
      <h3>${escapeHtml(group.label)}</h3>
    </div>
    <button type="button" class="chapter-group__focus" data-scroll-target="chapter-range-${escapeHtml(group.label)}">Focus</button>
  </div>
  <div class="chapter-links">
    ${group.items
      .map(
        (chapter) => `<a class="chapter-link" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(chapter.chapterNo)}`)}">
      <span class="chapter-link__main">
        <span class="chapter-link__title">${escapeHtml(chapter.chapterNo)} - ${escapeHtml(chapter.title)}</span>
        ${chapter.wordCount ? `<span class="chapter-link__meta">${Number(chapter.wordCount).toLocaleString("en-US")} words</span>` : ""}
      </span>
      <span class="chapter-link__cta">Read -&gt;</span>
    </a>`
      )
      .join("\n")}
  </div>
</section>`
        )
        .join("\n")
    : `<p class="empty-note">No chapters yet.</p>`;

  const directoryBody = `
<main class="directory-shell">
  <nav class="breadcrumbs">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/category/${encodePathSegment(novel.categorySlug)}/">${escapeHtml(getCategoryLabel(novel.categorySlug))}</a>
    <span>/</span>
    <span>${escapeHtml(displayTitle)}</span>
  </nav>

  ${heroUrl ? `<div class="directory-hero-banner" style="background-image:linear-gradient(120deg, rgba(243,246,241,0.85), rgba(236,253,245,0.75)), url('${escapeHtml(heroUrl)}')"></div>` : ""}
  <div class="directory-card">
    <div class="directory-card__stack">
      <h1 class="directory-card__title">${escapeHtml(displayTitle)}</h1>
      ${coverUrl ? `<div class="directory-card__cover-wrap"><img src="${escapeHtml(coverUrl)}" alt="" class="directory-card__cover" loading="lazy" /></div>` : ""}
      <div class="directory-card__grid">
        <div class="directory-card__synopsis">
          <div class="directory-synopsis" data-synopsis>
            <p class="directory-synopsis__text" data-synopsis-text>${escapeHtml(synopsisPreview)}</p>
            ${summary.trim().length > synopsisPreview.length ? `<button type="button" class="directory-synopsis__toggle" data-synopsis-toggle data-full="${escapeHtml(summary.trim())}" data-preview="${escapeHtml(synopsisPreview)}">Read more</button>` : ""}
          </div>
        </div>
        <dl class="directory-card__meta">
          <div><dt>Author</dt><dd>${escapeHtml(String(novel.frontmatter?.author ?? "Unknown"))}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(String(novel.frontmatter?.status ?? "Unknown"))}</dd></div>
          <div><dt>Category</dt><dd>${escapeHtml(String(novel.frontmatter?.category ?? getCategoryLabel(novel.categorySlug)))}</dd></div>
          <div><dt>Total chapters</dt><dd>${escapeHtml(String(novel.frontmatter?.total_chapters ?? chapters.length))}</dd></div>
          <div class="directory-card__meta-wide"><dt>Updated</dt><dd>${escapeHtml(String(novel.frontmatter?.updated_at ?? novel.metaNovel?.updated_at ?? "Unknown"))}</dd></div>
        </dl>
      </div>
      ${tags.length ? `<div class="directory-tags">${tags.map((tag) => `<a href="/search?q=${encodeURIComponent(tag)}" class="directory-tag">${escapeHtml(tag)}</a>`).join("")}</div>` : ""}
      <div class="directory-card__actions">
        <div class="action-row">
      ${firstChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(firstChapter.chapterNo)}`)}">Start reading</a>` : ""}
      ${latestChapter ? `<a class="action-btn action-btn--secondary" href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(latestChapter.chapterNo)}`)}">Latest chapter</a>` : ""}
        </div>
        ${renderShareBar({ shareUrl, shareTitle: displayTitle, className: "directory-share" })}
      </div>
    </div>
  </div>

  <section class="directory-chapters-section" aria-labelledby="chapter-list-heading">
    <h2 id="chapter-list-heading" class="directory-chapters-section__title">Chapters</h2>
    <div class="directory-chapters-layout">
      <div class="chapter-groups">${chapterGroupsMarkup}</div>
      <aside class="directory-nav-card">
        <form class="directory-nav-card__form" data-directory-jump-form data-directory-base="${escapeHtml(hrefBase)}">
          <label>Jump to chapter</label>
          <div class="directory-nav-card__row">
            <input name="chapter" placeholder="e.g. 0007" />
            <button type="submit">Go</button>
          </div>
          <p class="directory-nav-card__error" data-directory-jump-error></p>
        </form>
        <div class="directory-nav-card__groups">
          ${groups
            .map(
              (group, index) => `<details class="directory-nav-card__group"${index === 0 ? " open" : ""}>
              <summary>${escapeHtml(group.label)}</summary>
              <div class="directory-nav-card__chips">
                ${group.items
                  .slice(0, 10)
                  .map(
                    (chapter) => `<a href="${pathToHref(`${hrefBase}chapters/${encodePathSegment(chapter.chapterNo)}`)}" class="directory-nav-card__chip">${escapeHtml(chapter.chapterNo)}</a>`
                  )
                  .join("")}
              </div>
            </details>`
            )
            .join("\n")}
        </div>
        <div class="directory-nav-card__footer">
          <button type="button" class="directory-nav-card__top" data-scroll-top>Back to top</button>
        </div>
      </aside>
    </div>
  </section>

  <div class="directory-share-panel">
    ${renderShareBar({ shareUrl, shareTitle: displayTitle, className: "directory-share-panel__bar" })}
  </div>
</main>`;

  const body = `${renderSiteHeader(novel.categorySlug)}
${renderSideAdsShell("directory", `<div class="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4 sm:pb-20 sm:pt-6">${directoryBody}</div>`)}
${renderSiteFooter({ variant: "directory", novelTitle: displayTitle })}`;

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
  const shareUrl = absoluteUrl(chapterPath);
  const shareTitle = chapterTitle;
  const topicTags = [...(Array.isArray(chapterMeta.chapter_keywords) ? chapterMeta.chapter_keywords : []), ...(Array.isArray(chapterMeta.guide_tags) ? chapterMeta.guide_tags : [])]
    .filter((item, index, array) => String(item ?? "").trim() && array.findIndex((entry) => String(entry).toLowerCase() === String(item).toLowerCase()) === index);

  const readingBody = `<main class="reading-shell">
  <nav class="breadcrumbs">
    <a href="/">Home</a>
    <span>/</span>
    <a href="/category/${encodePathSegment(novel.categorySlug)}/">${escapeHtml(getCategoryLabel(novel.categorySlug))}</a>
    <span>/</span>
    <a href="${pathToHref(basePath)}">${escapeHtml(displayTitle)}</a>
    <span>/</span>
    <span>${escapeHtml(chapterTitle)}</span>
  </nav>

  <section class="reader-preferences-card">
    <div class="reader-preferences-card__group">
      <span class="reader-preferences-card__label">Background</span>
      <div class="reader-preferences-card__swatches">
        <span class="reader-preferences-card__swatch" style="background:#f3f6f1"></span>
        <span class="reader-preferences-card__swatch" style="background:#d9e6d2"></span>
        <span class="reader-preferences-card__swatch" style="background:#e6f4e8"></span>
        <span class="reader-preferences-card__swatch" style="background:#000"></span>
        <span class="reader-preferences-card__swatch" style="background:#fff"></span>
        <span class="reader-preferences-card__swatch" style="background:#f5ecd9"></span>
      </div>
    </div>
    <div class="reader-preferences-card__group">
      <span class="reader-preferences-card__label">Text Color</span>
      <div class="reader-preferences-card__swatches">
        <span class="reader-preferences-card__swatch" style="background:#0f172a"></span>
        <span class="reader-preferences-card__swatch" style="background:#111111"></span>
        <span class="reader-preferences-card__swatch" style="background:#475569"></span>
        <span class="reader-preferences-card__swatch" style="background:#ffffff"></span>
        <span class="reader-preferences-card__swatch" style="background:#2d6a4f"></span>
        <span class="reader-preferences-card__swatch" style="background:#6b4f2d"></span>
      </div>
    </div>
    <div class="reader-preferences-card__group">
      <span class="reader-preferences-card__label">Font Size</span>
      <div class="reader-preferences-card__sizes">
        <span class="reader-preferences-card__size reader-preferences-card__size--active">Small</span>
        <span class="reader-preferences-card__size">Medium</span>
        <span class="reader-preferences-card__size">Large</span>
      </div>
    </div>
    <button type="button" class="reader-preferences-card__save">Save</button>
    <button type="button" class="reader-preferences-card__reset">Reset</button>
  </section>

  <div class="reading-grid">
    <article class="reading-card novel-container">
      <header class="reading-card__header story-text">
        <p class="reading-card__eyebrow">${escapeHtml(displayTitle)}</p>
        <h1>${escapeHtml(chapterTitle)}</h1>
        <div class="reading-card__meta">
          <span><strong>Chapter</strong>${escapeHtml(chapter.chapterNo)}</span>
          ${chapter.wordCount ? `<span><strong>Words</strong>${escapeHtml(Number(chapter.wordCount).toLocaleString("en-US"))}</span>` : ""}
          <span><strong>Updated</strong>${escapeHtml(String(chapter.updatedAt || chapter.publishedAt || chapterMeta.updated_at || "Unknown"))}</span>
        </div>
      </header>
      <div class="reading-prose reader-text">${chapterHtml}</div>
      <nav class="chapter-nav">
        ${prevChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${basePath}chapters/${encodePathSegment(prevChapter.chapterNo)}`)}">Previous Chapter</a>` : `<span class="action-btn action-btn--disabled">Previous Chapter</span>`}
        <a class="action-btn action-btn--secondary" href="${pathToHref(basePath)}">Directory</a>
        ${nextChapter ? `<a class="action-btn action-btn--primary" href="${pathToHref(`${basePath}chapters/${encodePathSegment(nextChapter.chapterNo)}`)}">Next Chapter</a>` : `<span class="action-btn action-btn--disabled">Next Chapter</span>`}
      </nav>
      <div class="chapter-nav__share">
        ${renderShareBar({ shareUrl, shareTitle })}
      </div>
    </article>

    <aside class="guide-card annotation-box">
      <div class="guide-card__share">
        ${renderShareBar({ shareUrl, shareTitle, variant: "compact" })}
      </div>
      <div class="guide-card__badge">Reading Guide Decoding</div>
      <h2>Essential Guide</h2>
      <div class="guide-card__body">${guideHtml || "<p>No annotation yet.</p>"}</div>
      ${topicTags.length ? `<nav class="seo-topics"><p class="seo-topics__label">Related Topics</p><div class="seo-topics__list">${topicTags.map((tag) => `<a href="/search?q=${encodeURIComponent(tag)}" class="seo-topics__link">#${escapeHtml(String(tag))}</a>`).join("")}</div></nav>` : ""}
    </aside>
  </div>
</main>`;

  const body = `${renderSiteHeader(novel.categorySlug)}
${renderSideAdsShell("reading", `<div class="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4">${readingBody}</div>`)}
${renderSiteFooter({ variant: "reading", novelTitle: displayTitle })}`;

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
      --bg-page:#e8f3e8;
      --bg-surface:#f5faf4;
      --bg-card:#f9fcf8;
      --text-deep:#243a2b;
      --text-soft:#4d6654;
      --text-muted:#718575;
      --border-soft:#cfe3cf;
      --accent-green:#07c160;
      --bg:var(--bg-page);
      --surface:var(--bg-surface);
      --card:var(--bg-card);
      --line:var(--border-soft);
      --deep:var(--text-deep);
      --soft:var(--text-soft);
      --muted:var(--text-muted);
      --accent:var(--accent-green);
      --accent-deep:#058c46;
      --accent-soft:#e9f8ef;
      --shadow:0 18px 42px rgba(36,58,43,.08);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      min-height:100vh;
      background:var(--bg-page);
      color:var(--deep);
      font-family:Georgia,"Times New Roman",serif;
      overflow-x:hidden;
    }
    a{color:inherit;text-decoration:none}
    img,video,iframe{max-width:100%;height:auto}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .site-header{
      position:sticky;
      top:0;
      z-index:30;
      border-bottom:1px solid var(--line);
      background:rgba(245,250,244,.95);
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
    .side-ads-shell{max-width:1700px;margin:0 auto;padding:0 .5rem}
    .side-ads-shell__grid{display:grid;grid-template-columns:1fr;gap:1rem}
    .side-ads-shell__aside{display:none}
    .side-ads-shell__content{min-width:0}
    .side-ad-placeholder{display:grid;place-items:center;min-height:160px;border:1px dashed var(--line);border-radius:20px;background:var(--surface);font:700 13px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .shell,.directory-shell,.reading-shell{max-width:1400px;margin:0 auto;padding:0}
    .breadcrumbs{
      display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      margin-bottom:18px;color:var(--muted);font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;
    }
    .breadcrumbs a{color:var(--accent-deep)}
    .category-rail-shell{border:1px solid var(--line);border-radius:1rem;background:color-mix(in srgb,var(--surface) 70%, transparent);padding:.75rem 1rem 1.25rem}
    .category-grid-section{margin-top:2rem}
    .category-grid-section__title{margin:0 0 1.25rem;font:600 2rem/1.2 Georgia,"Times New Roman",serif;color:var(--deep)}
    .hero-card,.section-card,.reading-card,.guide-card,.directory-card,.directory-share-panel{
      border:1px solid var(--line);border-radius:28px;background:rgba(255,255,255,.96);
      box-shadow:var(--shadow);
    }
    .hero-card{padding:30px 26px}
    .section-card,.reading-card,.guide-card{padding:24px 22px}
    .directory-card,.directory-share-panel{padding:1.5rem}
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
    .section-card,.directory-chapters-section,.directory-share-panel{margin-top:24px}
    .section-card__top{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}
    .section-card__top h2,.guide-card h2{margin:0;font-size:1.6rem;line-height:1.2}
    .section-card__top p{margin:0;color:var(--soft);font-size:1rem;line-height:1.7}
    .novel-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
    .section-rail{margin-bottom:3.5rem}
    .section-rail:last-child{margin-bottom:0}
    .section-rail__top{display:flex;flex-direction:column;gap:.75rem;margin-bottom:1rem}
    .section-rail__title{margin:0;font:600 2rem/1.2 Georgia,"Times New Roman",serif;color:var(--deep)}
    .section-rail__controls{display:flex;gap:.5rem}
    .section-rail__button{border:1px solid var(--line);border-radius:.5rem;background:var(--card);padding:.375rem .75rem;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .section-rail__layout{display:flex;flex-direction:column;gap:1.5rem}
    .section-rail__featured{display:flex;justify-content:center}
    .section-rail__scroller{min-width:0;overflow-x:auto;scrollbar-width:none}
    .section-rail__scroller::-webkit-scrollbar{display:none}
    .section-rail__track{display:flex;gap:1.5rem;width:max-content;padding-bottom:.5rem}
    .novel-card{
      display:flex;flex-direction:column;gap:14px;min-height:320px;
      width:100%;max-width:500px;aspect-ratio:5/4;max-height:400px;overflow:hidden;
      border:1px solid var(--line);border-radius:24px;background:var(--card);
      box-shadow:0 14px 32px rgba(36,58,43,.06);
      transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease;
    }
    .novel-card:hover{transform:translateY(-2px);border-color:var(--accent);background:var(--accent);box-shadow:0 20px 40px rgba(7,193,96,.12)}
    .novel-card--rail{width:min(calc(100vw - 2.5rem),22rem);max-width:22rem;aspect-ratio:auto}
    .novel-card__cover-wrap{display:block;height:9rem;overflow:hidden}
    .novel-card__cover{width:100%;height:100%;object-fit:cover}
    .novel-card__body{display:flex;min-height:0;flex:1;flex-direction:column;padding:1.25rem 1.25rem .5rem;outline:none}
    .novel-card__featured-label{margin:0 0 .25rem;color:var(--muted);font:700 10px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
    .novel-card__title{margin:0;text-align:center;font-size:22px;font-weight:700;line-height:1.35;color:var(--deep)}
    .novel-card:hover .novel-card__title,.novel-card:hover .novel-card__summary,.novel-card:hover .novel-card__eyebrow,.novel-card:hover .novel-card__meta,.novel-card:hover .novel-card__hint,.novel-card:hover .share-bar__label{color:#fff}
    .novel-card__summary{margin:.9rem 0 0;color:var(--soft);line-height:1.75;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical}
    .novel-card__share{position:relative;z-index:1;width:100%;max-width:500px;align-self:center;padding:0 .75rem .5rem}
    .novel-card__hint{position:relative;z-index:1;padding:0 1.25rem 1.25rem;text-align:center;font:400 10px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .share-bar{position:relative;display:flex;max-width:100%;flex-direction:column;gap:.5rem}
    .share-bar__label{flex-shrink:0;font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .share-bar__scroller{display:flex;min-width:0;flex:1;justify-content:center;overflow-x:auto;padding-bottom:.25rem}
    .share-bar__list{display:flex;min-width:0;list-style:none;flex-wrap:nowrap;gap:.5rem;padding:0;margin:0}
    .share-bar--compact .share-bar__list{gap:.375rem}
    .share-bar__item{flex-shrink:0}
    .share-bar__button{display:flex;align-items:center;justify-content:center;height:40px;width:40px;border:1px solid transparent;border-radius:.5rem;background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .share-bar--compact .share-bar__button{height:32px;width:32px;border-color:var(--line);border-radius:.375rem}
    .share-bar__icon{width:28px;height:28px;object-fit:contain}
    .share-bar--compact .share-bar__icon{width:20px;height:20px}
    .share-bar__star{font-size:22px;color:#f59e0b}
    .directory-shell{width:100%}
    .directory-hero-banner{margin-bottom:1.5rem;min-height:160px;border:1px solid var(--line);border-radius:1rem;background-size:cover;background-position:center;box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .directory-card__stack{display:flex;flex-direction:column;gap:1.5rem}
    .directory-card__title{margin:0;text-align:center;font:700 2.25rem/1.1 Georgia,"Times New Roman",serif;color:var(--deep)}
    .directory-card__cover-wrap{margin:0 auto;width:100%;max-width:240px}
    .directory-card__cover{width:100%;aspect-ratio:3/4;border:1px solid var(--line);border-radius:.75rem;object-fit:cover;box-shadow:0 1px 2px rgba(0,0,0,.08)}
    .directory-card__grid{display:grid;gap:1.5rem}
    .directory-card__meta{order:1;display:grid;gap:.5rem;font:400 14px/1.6 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .directory-card__meta dt{color:var(--muted)}
    .directory-card__meta dd{margin:0;font-weight:500;color:var(--deep)}
    .directory-card__meta-wide{grid-column:1/-1}
    .directory-synopsis{font-size:1.125rem;line-height:1.7;color:var(--soft)}
    .directory-synopsis__text{white-space:pre-wrap;margin:0}
    .directory-synopsis__toggle{margin-top:.5rem;border:none;background:none;padding:0;font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--accent);text-decoration:underline;text-underline-offset:2px}
    .directory-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem}
    .directory-tag{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;background:var(--card);padding:.25rem .75rem;font:500 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .directory-card__actions{display:flex;flex-direction:column;gap:.75rem}
    .directory-share,.directory-share-panel__bar{justify-content:flex-start}
    .directory-chapters-section__title{margin:0 0 1rem;font:600 2rem/1.2 Georgia,"Times New Roman",serif;color:var(--deep)}
    .directory-chapters-layout{display:grid;gap:1.5rem}
    .directory-nav-card{position:relative}
    .directory-nav-card__form,.directory-nav-card__group,.directory-nav-card__footer{border:1px solid var(--line);border-radius:1rem;background:var(--card);padding:1rem;box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .directory-nav-card__form label{display:block;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--muted);margin-bottom:.5rem}
    .directory-nav-card__row{display:flex;gap:.5rem}
    .directory-nav-card__row input{width:117px;border:1px solid var(--line);border-radius:.5rem;background:#fff;padding:.5rem .75rem;font:400 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .directory-nav-card__row button,.directory-card__meta-wide,.chapter-group__focus,.directory-nav-card__top{font-family:ui-sans-serif,system-ui,sans-serif}
    .directory-nav-card__row button,.chapter-group__focus,.directory-nav-card__top{border:none;border-radius:.5rem;background:var(--accent);padding:.5rem .75rem;font-size:14px;font-weight:600;color:#fff}
    .directory-nav-card__error{min-height:1rem;margin:.5rem 0 0;font:400 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:#dc2626}
    .directory-nav-card__groups{margin-top:.75rem;display:grid;gap:.75rem}
    .directory-nav-card__group summary{cursor:pointer;font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .directory-nav-card__chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}
    .directory-nav-card__chip{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;background:#fff;padding:.25rem .75rem;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .chapter-groups{display:grid;gap:18px}
    .chapter-group{
      border:1px solid var(--line);border-radius:22px;background:var(--surface);padding:18px;scroll-margin-top:6rem;
    }
    .chapter-group__top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:1rem}
    .chapter-group__eyebrow{margin:0;color:var(--muted);font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase}
    .chapter-group h3{margin:0 0 14px;font-size:1.25rem}
    .chapter-links{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .chapter-link{
      display:flex;align-items:center;justify-content:space-between;gap:1rem;
      border:1px solid var(--line);border-radius:18px;background:#fff;padding:14px 15px;
      transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease;
    }
    .chapter-link:hover{transform:translateY(-1px);border-color:#9cd8b5;box-shadow:0 12px 24px rgba(7,193,96,.1)}
    .chapter-link__main{min-width:0}
    .chapter-link__title{display:block;font-weight:700;line-height:1.55}
    .chapter-link__meta{color:var(--muted);font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif}
    .chapter-link__cta{flex-shrink:0;color:var(--accent-deep);font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif}
    .reading-grid{
      display:grid;gap:2rem;grid-template-columns:minmax(0,920px) minmax(360px,460px);
      align-items:start;
    }
    .reader-preferences-card{margin-bottom:1.25rem;display:flex;flex-direction:column;gap:.75rem;border:1px solid rgba(6,78,59,.15);border-radius:.75rem;background:rgba(255,255,255,.7);padding:.75rem;color:#1e293b;box-shadow:0 1px 2px rgba(0,0,0,.06);backdrop-filter:blur(4px)}
    .reader-preferences-card__group{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
    .reader-preferences-card__label{color:#475569;font:400 14px/1.2 ui-sans-serif,system-ui,sans-serif}
    .reader-preferences-card__swatches{display:flex;gap:.375rem}
    .reader-preferences-card__swatch{display:block;height:20px;width:20px;border:1px solid rgba(0,0,0,.1);border-radius:999px}
    .reader-preferences-card__sizes{display:inline-flex;border:1px solid var(--line);border-radius:.5rem;background:#fff;padding:.25rem}
    .reader-preferences-card__size{border-radius:.375rem;padding:.375rem .75rem;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .reader-preferences-card__size--active{background:var(--accent);color:#fff}
    .reader-preferences-card__save,.reader-preferences-card__reset{border-radius:.5rem;padding:.375rem .75rem;font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif}
    .reader-preferences-card__save{border:none;background:#065f46;color:#fff}
    .reader-preferences-card__reset{border:1px solid rgba(6,78,59,.25);background:#f3f6f1;color:#022c22}
    .reading-card__header h1{margin:10px 0 0;font-size:30px;line-height:1.08}
    .reading-prose{margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}
    .reading-prose h2,.reading-prose h3,.guide-card__body h2,.guide-card__body h3{margin:1.4em 0 .6em;line-height:1.25}
    .reader-text :where(p){line-height:1.82;overflow-wrap:anywhere}
    .reading-prose p,.guide-card__body p{margin:1em 0;color:var(--soft);font-size:20px;line-height:1.95}
    .reading-prose ul,.guide-card__body ul{margin:1em 0;padding-left:1.3rem;color:var(--soft)}
    .reading-prose li,.guide-card__body li{margin:.55em 0;line-height:1.8}
    .guide-card{position:sticky;top:7rem;max-height:calc(100vh - 7rem);overflow-y:auto}
    .guide-card__share{margin-bottom:1rem;max-width:460px}
    .guide-card__badge{display:flex;justify-content:center;margin-bottom:.75rem}
    .guide-card__badge::before{content:"Reading Guide Decoding";display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:.75rem;background:var(--card);padding:.5rem 1rem;font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep);box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .guide-card__body{margin-top:16px}
    .seo-topics{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line)}
    .seo-topics__label{margin:0 0 .5rem;font:500 10px/1.2 ui-sans-serif,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
    .seo-topics__list{display:flex;flex-wrap:wrap;gap:.5rem .75rem}
    .seo-topics__link{font:400 10px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft);text-decoration:underline;text-underline-offset:2px}
    .site-footer{margin-top:3rem;width:100%;border-top:1px solid var(--line);background:rgba(245,250,244,.95)}
    .site-footer__inner{max-width:1400px;margin:0 auto;padding:2.5rem .75rem}
    .site-footer__heading{text-align:center;font:600 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .site-footer__links-wrap{margin-top:1.5rem;display:flex;justify-content:center;overflow-x:auto;padding-bottom:.25rem}
    .site-footer__links{display:flex;min-width:0;flex-wrap:nowrap;gap:.5rem}
    .friend-link{display:inline-flex;min-height:44px;align-items:center;gap:.5rem;flex-shrink:0;border:1px solid var(--line);border-radius:.75rem;background:var(--card);padding:.5rem .75rem;font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep);box-shadow:0 1px 2px rgba(0,0,0,.06)}
    .friend-link__icon{width:20px;height:20px;object-fit:contain}
    .site-footer__legal{margin-top:2.5rem;padding-top:2rem;border-top:1px dashed var(--line)}
    .site-footer__copy{margin:0;font:400 14px/1.7 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .site-footer__meta{margin-top:1rem;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font:400 14px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .site-footer__button{border:none;background:none;padding:0;font:500 14px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--accent-deep);text-decoration:underline;text-underline-offset:2px}
    .site-footer__sep{color:var(--line)}
    .toast{position:fixed;left:50%;bottom:1rem;z-index:200;max-width:min(100vw - 2rem,28rem);transform:translateX(-50%);border:1px solid #9cd8b5;border-radius:.75rem;background:#0f2e1f;padding:.75rem 1rem;text-align:center;font:400 14px/1.4 ui-sans-serif,system-ui,sans-serif;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.2)}
    .empty-note{
      margin:0;border:1px dashed var(--line);border-radius:18px;background:var(--surface);
      padding:18px;text-align:center;color:var(--soft)
    }
    @media (min-width: 1280px){
      .side-ads-shell{padding:0 .75rem}
      .side-ads-shell__grid{grid-template-columns:minmax(0,180px) minmax(0,1fr) minmax(0,180px)}
      .side-ads-shell__aside{display:block}
      .side-ads-shell__stack{position:sticky;top:6rem;display:grid;gap:1rem}
    }
    @media (min-width: 1024px){
      .section-rail__layout{flex-direction:row;align-items:flex-start}
      .section-rail__featured{width:500px;justify-content:flex-start;flex-shrink:0}
      .section-rail__scroller{flex:1;align-self:flex-start}
      .directory-card__grid{grid-template-columns:minmax(0,1fr) 240px}
      .directory-card__synopsis{order:1}
      .directory-card__meta{order:2;grid-template-columns:1fr}
      .directory-chapters-layout{grid-template-columns:minmax(0,1fr) 280px;align-items:start}
      .directory-nav-card{position:sticky;top:6rem}
      .site-footer__links-wrap{justify-content:flex-start}
    }
    @media (max-width: 980px){
      .reading-grid{grid-template-columns:1fr}
      .guide-card{position:static;max-height:none}
      .reader-preferences-card{padding:.75rem}
    }
  `;
}

function buildClientScript() {
  return `
  (() => {
    const toast = (message) => {
      const node = document.createElement('div');
      node.className = 'toast';
      node.textContent = message;
      document.body.appendChild(node);
      window.setTimeout(() => node.remove(), 4000);
    };

    document.querySelectorAll('[data-copy-email]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy-email') || '';
        try {
          await navigator.clipboard.writeText(value);
          toast('Copied ' + value + '.');
        } catch {
          toast('Could not access the clipboard. Please copy manually: ' + value);
        }
      });
    });

    document.querySelectorAll('[data-share-platform]').forEach((button) => {
      button.addEventListener('click', async () => {
        const root = button.closest('[data-share-url]');
        const shareUrl = root?.getAttribute('data-share-url') || '';
        const shareTitle = root?.getAttribute('data-share-title') || '';
        const platform = button.getAttribute('data-share-platform') || 'social media';
        const line = (shareTitle + ' ' + shareUrl).trim();
        try {
          await navigator.clipboard.writeText(line);
          toast('Share text copied. Open ' + platform + ' and paste it there to publish your post.');
        } catch {
          toast('Could not copy to the clipboard. Please copy the page link manually.');
        }
      });
    });

    document.querySelectorAll('[data-bookmark-url]').forEach((button) => {
      button.addEventListener('click', async () => {
        const url = button.getAttribute('data-bookmark-url') || '';
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
        alert('Add this page to your browser bookmarks:\\n\\nWindows / Linux: Ctrl + D\\nMac: Command (⌘) + D\\n\\nThe page URL has been copied to your clipboard as a shortcut.');
      });
    });

    document.querySelectorAll('[data-synopsis-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const text = button.parentElement?.querySelector('[data-synopsis-text]');
        if (!text) return;
        const expanded = button.getAttribute('data-expanded') === '1';
        text.textContent = expanded ? (button.getAttribute('data-preview') || '') : (button.getAttribute('data-full') || '');
        button.textContent = expanded ? 'Read more' : 'Show less';
        button.setAttribute('data-expanded', expanded ? '0' : '1');
      });
    });

    document.querySelectorAll('[data-scroll-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-scroll-target');
        const node = id ? document.getElementById(id) : null;
        node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('[data-scroll-top]').forEach((button) => {
      button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    });

    document.querySelectorAll('[data-rail-prev]').forEach((button) => {
      button.addEventListener('click', () => {
        const rail = document.querySelector('[data-rail="' + button.getAttribute('data-rail-prev') + '"]');
        rail?.scrollBy({ left: -424, behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-rail-next]').forEach((button) => {
      button.addEventListener('click', () => {
        const rail = document.querySelector('[data-rail="' + button.getAttribute('data-rail-next') + '"]');
        rail?.scrollBy({ left: 424, behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-directory-jump-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = form.querySelector('input[name="chapter"]');
        const error = form.querySelector('[data-directory-jump-error]');
        const value = (input?.value || '').trim();
        if (!/^\\d+$/.test(value)) {
          if (error) error.textContent = 'Please enter a valid chapter number.';
          return;
        }
        const padded = value.padStart(4, '0');
        window.location.href = (form.getAttribute('data-directory-base') || '') + 'chapters/' + encodeURIComponent(padded) + '/';
      });
    });
  })();
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
  writeText(path.join(assetsRoot, "novel-static.js"), buildClientScript());

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
