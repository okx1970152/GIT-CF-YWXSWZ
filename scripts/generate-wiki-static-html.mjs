import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const dataRoot = path.join(workspaceRoot, "data");
const publicRoot = path.join(workspaceRoot, "public");
const wikiOutRoot = path.join(publicRoot, "wiki");
const wikiAssetsOutRoot = path.join(publicRoot, "__wiki_assets__");
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
const CATEGORY_NAV = [
  { slug: "xiuxian", label: "XiuXian" },
  { slug: "wuxia", label: "WuXia" },
  { slug: "xuanhuan", label: "XuanHuan" },
  { slug: "ranking", label: "Ranking" },
  { slug: "hot-essays", label: "Hot Essays" }
];
const DIRECTORY_SYNOPSIS_CHARS = 170;
const WIKI_SHARE_PLATFORMS = [
  { name: "X", icon: "/LOGO/x.png" },
  { name: "Facebook", icon: "/LOGO/facebook.png" },
  { name: "Instagram", icon: "/LOGO/instagram.png" },
  { name: "Telegram", icon: "/LOGO/telegram.png" },
  { name: "Reddit", icon: "/LOGO/reddit.png" },
  { name: "Quora", icon: "/LOGO/quora.png" },
  { name: "Threads", icon: "/LOGO/threads.png" }
];

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

function escapeJsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}

function absoluteUrl(relPath) {
  return relPath.startsWith("/") ? `${SITE_URL}${relPath}` : `${SITE_URL}/${relPath}`;
}

function wikiHubPath() {
  return "/wiki/";
}

function wikiNovelPath(novelId) {
  return `${wikiHubPath()}${encodePathSegment(novelId)}/`;
}

function wikiTermPath(novelId, termId) {
  return `${wikiNovelPath(novelId)}${encodePathSegment(termId)}/`;
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

function normalizeSummary(frontmatter = {}, contentRecord = null) {
  const candidates = [
    contentRecord?.summary,
    contentRecord?.description,
    contentRecord?.excerpt,
    contentRecord?.synopsis,
    frontmatter.summary,
    frontmatter.desc,
    frontmatter.description,
    frontmatter.excerpt,
    frontmatter.synopsis,
    frontmatter.meta_description,
    frontmatter.og_description,
    frontmatter.twitter_description
  ];
  const summary = candidates.find((value) => typeof value === "string" && value.trim()) ?? "";
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
  return `${compact.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function firstLetterLabel(value) {
  const first = String(value ?? "").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : "#";
}

function truncateForPreview(text, maxChars) {
  const clean = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return { preview: "", needsExpand: false };
  if (clean.length <= maxChars) return { preview: clean, needsExpand: false };
  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > Math.floor(maxChars * 0.55) ? slice.slice(0, lastSpace).trimEnd() : slice.trimEnd();
  return { preview: `${cut}...`, needsExpand: true };
}

function normalizeForSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    .site-header{
      position:sticky;top:0;z-index:40;border-bottom:1px solid var(--line);
      background:rgba(249,252,247,.94);backdrop-filter:blur(10px)
    }
    .site-header__inner{max-width:1400px;margin:0 auto;padding:16px 18px}
    .site-header__stack{display:flex;flex-direction:column;gap:12px}
    .site-header__categories{
      display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;
      border-bottom:1px solid var(--line);padding-bottom:12px
    }
    .site-header__tools{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
    .site-pill,.site-pill--active,.site-home,.site-home--active,.site-search button,.site-ads{
      font-family:ui-sans-serif,system-ui,sans-serif
    }
    .site-pill{
      display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);
      border-radius:999px;background:var(--surface);padding:7px 12px;font-size:14px;font-weight:600;color:var(--soft)
    }
    .site-pill--active{
      display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--accent);
      border-radius:999px;background:var(--accent);padding:7px 12px;font-size:14px;font-weight:700;color:#fff
    }
    .site-home{
      display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);
      border-radius:12px;background:var(--card);padding:10px 14px;font-size:14px;font-weight:700;color:var(--deep)
    }
    .site-home--active{
      display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--accent);
      border-radius:12px;background:var(--accent);padding:10px 14px;font-size:14px;font-weight:700;color:#fff
    }
    .site-search{display:flex;align-items:center;gap:8px;min-width:min(100%,380px)}
    .site-search input{
      flex:1;min-width:180px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);
      color:var(--deep);font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif
    }
    .site-search button,.site-ads{
      border:none;border-radius:12px;background:var(--accent);padding:10px 14px;font-size:14px;font-weight:600;color:#fff
    }
    .shell{max-width:1120px;margin:0 auto;padding:28px 18px 72px}
    .wiki-shell--wide{max-width:1400px}
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
    .title--wiki-hub{
      font-size:clamp(30px,2.9vw,40px);line-height:1.02;white-space:nowrap;letter-spacing:-.035em
    }
    .tagline,.lede,.meta,.search-copy,.footer-copy{
      font-family:ui-sans-serif,system-ui,sans-serif;color:var(--soft)
    }
    .tagline{max-width:760px;margin:16px 0 0;font-size:1.05rem;line-height:1.75}
    .stack{display:grid;gap:14px;margin-top:34px}
    .grid{display:grid;gap:14px;margin-top:34px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .wiki-glossary-layout{display:grid;gap:24px;margin-top:34px}
    .wiki-term-grid{display:grid;gap:20px}
    .wiki-letter-section .grid{margin-top:0;grid-template-columns:repeat(3,minmax(0,1fr))}
    .wiki-glossary-rail{position:relative}
    .follow-rail-shell{position:relative}
    .follow-rail-inner{width:100%}
    .wiki-glossary-card{display:flex;flex-direction:column;gap:14px}
    .wiki-glossary-card .card-copy{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
    .wiki-search-panel{
      margin-top:22px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.92);
      padding:18px 20px;box-shadow:0 10px 24px rgba(35,55,43,.06)
    }
    .wiki-search-form{display:grid;gap:10px}
    .wiki-search-row{display:flex;gap:10px;flex-wrap:wrap}
    .wiki-search-label{font:700 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .wiki-search-input{
      flex:1;min-width:220px;border:1px solid var(--line);border-radius:12px;padding:11px 13px;background:#fff;
      color:var(--deep);font:500 14px/1.2 ui-sans-serif,system-ui,sans-serif
    }
    .wiki-search-button{
      border:none;border-radius:12px;background:var(--accent);padding:11px 16px;font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:#fff
    }
    .wiki-search-help{margin:0;font:500 13px/1.6 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .wiki-search-results{display:grid;gap:12px;margin-top:16px}
    .wiki-search-result{
      display:block;border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:14px 16px
    }
    .wiki-search-result__title{font:700 15px/1.35 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .wiki-search-result__meta{margin-top:6px;font:600 12px/1.4 ui-sans-serif,system-ui,sans-serif;color:var(--accent-deep);text-transform:uppercase;letter-spacing:.08em}
    .wiki-search-result__copy{margin-top:6px;font:500 13px/1.6 ui-sans-serif,system-ui,sans-serif;color:var(--soft)}
    .wiki-search-empty{font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
    .wiki-letter-section{
      scroll-margin-top:120px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.82);
      padding:18px;box-shadow:0 12px 28px rgba(35,55,43,.06);transition:border-color .18s ease,box-shadow .18s ease, background-color .18s ease
    }
    .wiki-letter-section--active{
      border-color:var(--accent);box-shadow:0 0 0 2px rgba(15,184,93,.18),0 16px 34px rgba(35,55,43,.08);background:#f4fbf6
    }
    .wiki-letter-section__heading{
      margin:0 0 14px;font:700 24px/1.1 Georgia,"Times New Roman",serif;color:var(--deep)
    }
    .glossary-groups{display:flex;flex-direction:column;gap:12px}
    .glossary-group{border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:10px}
    .glossary-trigger{
      width:100%;display:flex;align-items:center;justify-content:space-between;border:none;border-radius:14px;
      background:#fff;padding:11px 12px;font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep);
      transition:background-color .18s ease,color .18s ease
    }
    .glossary-trigger--active{background:var(--accent);color:#fff}
    .glossary-chip-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
    .glossary-chip{
      display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;
      background:#fff;padding:8px 12px;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--soft)
    }
    .glossary-chip:hover{border-color:var(--accent);background:#eef7f0;color:var(--deep)}
    .share-bar{
      position:relative;z-index:1;width:100%;max-width:500px;flex-shrink:0;align-self:center;
      padding:0 12px 8px
    }
    .share-bar__inner{
      position:relative;display:flex;max-width:100%;flex-direction:column;gap:8px;justify-content:center
    }
    .share-bar__label{flex-shrink:0;font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--deep)}
    .share-bar__scroller{
      display:flex;min-width:0;flex:1 1 auto;justify-content:center;overflow-x:auto;padding-bottom:4px;
      -webkit-overflow-scrolling:touch
    }
    .share-bar__list{margin:0;display:flex;min-width:0;list-style:none;flex-wrap:nowrap;align-items:stretch;justify-content:flex-start;padding:0;gap:6px}
    .share-bar__item{flex-shrink:0}
    .share-bar__button{
      display:flex;height:32px;width:32px;min-height:32px;min-width:32px;flex-shrink:0;align-items:center;justify-content:center;
      border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--deep);box-shadow:0 1px 3px rgba(35,55,43,.12);
      transition:transform .18s ease,border-color .18s ease
    }
    .share-bar__button:hover{transform:scale(1.05);border-color:var(--accent)}
    .share-bar__button img{height:20px;width:20px;object-fit:contain}
    .share-bar__bookmark{color:#d6a218}
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
    .summary-toggle{
      margin-top:10px;display:inline-flex;align-items:center;border:none;background:none;padding:0;
      font:700 14px/1.2 ui-sans-serif,system-ui,sans-serif;color:var(--accent);text-decoration:underline;text-underline-offset:3px
    }
    .empty{
      margin-top:32px;padding:22px;border:1px dashed var(--line);border-radius:24px;background:rgba(255,255,255,.6);
      font:500 .98rem/1.7 ui-sans-serif,system-ui,sans-serif;color:var(--muted)
    }
    .footer{
      margin-top:42px;padding-top:22px;border-top:1px solid rgba(112,129,114,.18)
    }
    .footer-copy{font-size:.92rem;line-height:1.7}
    @media (min-width: 640px){
      .share-bar{padding:0 16px 8px}
      .share-bar__inner{flex-direction:row;align-items:center;gap:12px}
      .share-bar__scroller{justify-content:flex-start}
    }
    @media (max-width: 700px){
      .site-header__inner{padding:14px}
      .site-search{min-width:100%}
      .shell{padding:20px 14px 56px}
      .hero{padding:24px 18px}
      .definition{padding:22px 18px}
      .title--wiki-hub{font-size:30px}
    }
    @media (max-width: 1023px){
      .wiki-glossary-layout{grid-template-columns:1fr}
      .wiki-glossary-rail{position:static}
      .follow-rail-shell{min-height:0 !important}
    }
    @media (min-width: 1024px){
      .wiki-glossary-layout{grid-template-columns:minmax(0,1fr) 280px}
    }
    @media (max-width: 1023px){
      .wiki-term-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .wiki-letter-section .grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
    @media (max-width: 639px){
      .wiki-term-grid{grid-template-columns:1fr}
      .wiki-letter-section .grid{grid-template-columns:1fr}
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

function sharedWikiClientScript() {
  return `(() => {
  const adsButton = document.getElementById('toggle-ads');
  if (adsButton) {
    const hasCookie = document.cookie.split('; ').some((token) => token === 'hide_image_ads=1');
    adsButton.textContent = hasCookie ? 'Open Ads' : 'Close Ads';
    adsButton.addEventListener('click', () => {
      const next = adsButton.textContent !== 'Open Ads';
      document.cookie = 'hide_image_ads=' + (next ? '1' : '0') + '; path=/; max-age=31536000; samesite=lax';
      adsButton.textContent = next ? 'Open Ads' : 'Close Ads';
    });
  }

  const pageUrl = window.location.href;
  const shareMap = {
    X: (url) => 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url),
    Facebook: (url) => 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
    Instagram: () => '',
    Telegram: (url) => 'https://t.me/share/url?url=' + encodeURIComponent(url),
    Reddit: (url) => 'https://www.reddit.com/submit?url=' + encodeURIComponent(url),
    Quora: (url) => 'https://www.quora.com/?share=' + encodeURIComponent(url),
    Threads: (url) => 'https://www.threads.net/intent/post?text=' + encodeURIComponent(url)
  };

  document.querySelectorAll('[data-share-platform]').forEach((button) => {
    button.addEventListener('click', async () => {
      const platform = button.getAttribute('data-share-platform');
      const target = shareMap[platform]?.(pageUrl) || '';
      if (platform === 'Instagram') {
        try {
          await navigator.clipboard.writeText(pageUrl);
          button.setAttribute('title', 'Link copied for Instagram');
        } catch {}
        return;
      }
      if (!target) return;
      window.open(target, '_blank', 'noopener,noreferrer,width=860,height=720');
    });
  });

  const bookmark = document.querySelector('[data-bookmark-url]');
  bookmark?.addEventListener('click', async () => {
    try {
      if (window.sidebar && window.sidebar.addPanel) {
        window.sidebar.addPanel(document.title, pageUrl, '');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pageUrl);
      }
      bookmark.setAttribute('aria-pressed', 'true');
      bookmark.setAttribute('title', 'Link copied. Use your browser bookmark shortcut.');
    } catch {}
  });

  const summaryToggle = document.querySelector('[data-summary-toggle]');
  const summary = document.querySelector('[data-summary-text]');
  summaryToggle?.addEventListener('click', () => {
    const expanded = summaryToggle.getAttribute('data-expanded') === '1';
    const next = !expanded;
    summary.textContent = next ? summary.dataset.full : summary.dataset.preview;
    summaryToggle.setAttribute('data-expanded', next ? '1' : '0');
    summaryToggle.setAttribute('aria-expanded', next ? 'true' : 'false');
    summaryToggle.textContent = next ? 'Show less' : 'Read more';
  });

  const wikiHomeForm = document.querySelector('[data-wiki-search-form]');
  const wikiHomeInput = document.querySelector('[data-wiki-search-input]');
  const wikiHomeResults = document.querySelector('[data-wiki-search-results]');
  const wikiHomeCards = Array.from(document.querySelectorAll('[data-wiki-home-card]'));
  const wikiSearchScript = document.getElementById('wiki-search-index');

  function normalizeForSearch(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[\\u0027\\u2019]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();
  }

  function renderWikiResults(results) {
    if (!wikiHomeResults) return;
    if (!results.length) {
      wikiHomeResults.innerHTML = '<p class="wiki-search-empty">No matching wiki books or glossary terms yet.</p>';
      return;
    }
    wikiHomeResults.innerHTML = results
      .map((item) => '<a class="wiki-search-result" href="' + item.href + '">' +
        '<div class="wiki-search-result__meta">' + item.kind + '</div>' +
        '<div class="wiki-search-result__title">' + item.title + '</div>' +
        '<div class="wiki-search-result__copy">' + item.excerpt + '</div>' +
      '</a>')
      .join('');
  }

  if (wikiHomeForm && wikiHomeInput && wikiHomeResults && wikiSearchScript) {
    let wikiSearchIndex = [];
    try {
      wikiSearchIndex = JSON.parse(wikiSearchScript.textContent || '[]');
    } catch {}

    const runWikiSearch = () => {
      const query = normalizeForSearch(wikiHomeInput.value);
      if (!query) {
        wikiHomeResults.innerHTML = '';
        wikiHomeCards.forEach((card) => {
          card.style.display = '';
        });
        return;
      }

      wikiHomeCards.forEach((card) => {
        const haystack = normalizeForSearch(card.getAttribute('data-wiki-home-card') || '');
        card.style.display = haystack.includes(query) ? '' : 'none';
      });

      const matches = wikiSearchIndex.filter((item) => item.search.includes(query));
      const bookMatches = matches.filter((item) => item.kind === 'Book glossary');
      const results = (bookMatches.length > 0 ? bookMatches : matches).slice(0, 16);
      renderWikiResults(results);
    };

    wikiHomeForm.addEventListener('submit', (event) => {
      event.preventDefault();
      runWikiSearch();
    });
    wikiHomeInput.addEventListener('input', runWikiSearch);
  }

  function initFollowRail(containerSelector, shellSelector, cardSelector, desktopMinWidth) {
    const container = document.querySelector(containerSelector);
    const shell = document.querySelector(shellSelector);
    const card = document.querySelector(cardSelector);
    if (!container || !shell || !card) return;

    const topGap = 104;

    const updateRail = () => {
      if (window.innerWidth < desktopMinWidth) {
        shell.style.minHeight = '';
        card.style.position = '';
        card.style.top = '';
        card.style.left = '';
        card.style.width = '';
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const cardHeight = card.offsetHeight;
      const scrollY = window.scrollY;
      const containerTop = scrollY + containerRect.top;
      const containerBottom = containerTop + containerRect.height;
      const shellTop = scrollY + shellRect.top;
      const desiredTop = scrollY + topGap;
      const maxFixedTop = containerBottom - cardHeight;

      shell.style.minHeight = cardHeight + 'px';

      if (desiredTop <= shellTop) {
        card.style.position = 'relative';
        card.style.top = '0';
        card.style.left = '0';
        card.style.width = '100%';
        return;
      }

      if (desiredTop >= maxFixedTop) {
        card.style.position = 'absolute';
        card.style.top = Math.max(0, containerRect.height - cardHeight) + 'px';
        card.style.left = '0';
        card.style.width = '100%';
        return;
      }

      card.style.position = 'fixed';
      card.style.top = topGap + 'px';
      card.style.left = shellRect.left + 'px';
      card.style.width = shellRect.width + 'px';
    };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateRail) : null;
    observer?.observe(document.body);
    observer?.observe(container);
    observer?.observe(shell);
    observer?.observe(card);

    updateRail();
    window.addEventListener('scroll', updateRail, { passive: true });
    window.addEventListener('resize', updateRail);
  }

  const glossarySections = Array.from(document.querySelectorAll('[data-letter-section]'));
  const glossaryButtons = Array.from(document.querySelectorAll('[data-letter-trigger]'));
  const glossaryPanels = Array.from(document.querySelectorAll('[data-letter-panel]'));
  let glossaryNavLock = false;

  function activateLetter(letter, shouldScroll) {
    glossaryButtons.forEach((button) => {
      const active = button.getAttribute('data-letter-trigger') === letter;
      button.classList.toggle('glossary-trigger--active', active);
      button.setAttribute('aria-expanded', active ? 'true' : 'false');
    });
    glossaryPanels.forEach((panel) => {
      panel.hidden = panel.getAttribute('data-letter-panel') !== letter;
    });
    glossarySections.forEach((section) => {
      const active = section.getAttribute('data-letter-section') === letter;
      section.classList.toggle('wiki-letter-section--active', active);
      if (active && shouldScroll) {
        glossaryNavLock = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => {
          glossaryNavLock = false;
        }, 650);
      }
    });
  }

  glossaryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const letter = button.getAttribute('data-letter-trigger');
      if (!letter) return;
      activateLetter(letter, true);
    });
  });

  if (glossarySections.length && glossaryButtons.length) {
    const syncGlossaryLetter = () => {
      if (glossaryNavLock) return;
      const viewportTop = window.scrollY + 180;
      let activeLetter = glossarySections[0]?.getAttribute('data-letter-section');
      glossarySections.forEach((section) => {
        if (section.offsetTop <= viewportTop) {
          activeLetter = section.getAttribute('data-letter-section');
        }
      });
      if (activeLetter) activateLetter(activeLetter, false);
    };
    syncGlossaryLetter();
    window.addEventListener('scroll', syncGlossaryLetter, { passive: true });
    window.addEventListener('resize', syncGlossaryLetter);
  }

  initFollowRail('[data-follow-rail-container]', '[data-follow-rail-shell]', '[data-follow-rail-card]', 1024);
})();`;
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
    <link rel="stylesheet" href="/__wiki_assets__/wiki.css" />
    ${renderJsonLd(jsonLd)}
  </head>
  <body>
    ${body}
    <script src="/__wiki_assets__/wiki.js" defer></script>
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
    url: absoluteUrl(wikiHubPath()),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/")
    },
    hasPart: novels.map((novel, index) => ({
      "@type": "CollectionPage",
      position: index + 1,
      name: novel.label,
      url: absoluteUrl(wikiNovelPath(novel.novelId))
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

function buildLetterGroups(entries, novelId) {
  const groups = new Map();
  for (const entry of entries) {
    const letter = firstLetterLabel(entry.displayTitle || entry.id);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push({
      ...entry,
      href: wikiTermPath(novelId, entry.id)
    });
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([letter, items]) => ({
      letter,
      items: items.sort((a, b) => String(a.displayTitle).localeCompare(String(b.displayTitle), "en"))
    }));
}

function renderShareBar(canonicalPath) {
  const pageUrl = absoluteUrl(canonicalPath);
  const buttons = WIKI_SHARE_PLATFORMS.map((item) => {
    const safeUrl = escapeHtml(pageUrl);
    return `<li class="share-bar__item"><button type="button" title="Share to ${escapeHtml(
      item.name
    )}" aria-label="Share to ${escapeHtml(
      item.name
    )}" class="share-bar__button" data-share-platform="${escapeHtml(item.name)}" data-share-url="${safeUrl}"><img alt="" loading="lazy" width="20" height="20" decoding="async" src="${escapeHtml(
      item.icon
    )}" /></button></li>`;
  }).join("");

  return `<div class="share-bar">
  <div class="share-bar__inner" role="group" aria-label="Share and bookmark">
    <span class="share-bar__label">Share to</span>
    <div class="share-bar__scroller">
      <ul class="share-bar__list">
        ${buttons}
        <li class="share-bar__item">
          <button type="button" title="Add to browser bookmarks" aria-label="Add to browser bookmarks" aria-pressed="false" class="share-bar__button share-bar__bookmark" data-bookmark-url="${escapeHtml(
            pageUrl
          )}">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"></path>
            </svg>
          </button>
        </li>
      </ul>
    </div>
  </div>
</div>`;
}

function renderSiteHeader({ activeCategory = null, wikiActive = true }) {
  const categoryLinks = CATEGORY_NAV.map((item) => {
    const active = activeCategory === item.slug;
    const className = active ? "site-pill--active" : "site-pill";
    return `<a class="${className}" href="/category/${encodePathSegment(item.slug)}">${escapeHtml(item.label)}</a>`;
  }).join("\n");

  return `<header class="site-header">
  <div class="site-header__inner">
    <div class="site-header__stack">
      <nav class="site-header__categories" aria-label="Categories">
        ${categoryLinks}
        <a class="${wikiActive ? "site-pill--active" : "site-pill"}" href="${wikiHubPath()}">${escapeHtml(WIKI_NAV_LABEL)}</a>
      </nav>
      <div class="site-header__tools">
        <a class="site-home" href="/">Home</a>
        <form class="site-search" action="/search" method="get">
          <input name="q" type="search" placeholder="Search site..." aria-label="Search site" autocomplete="off" />
          <button type="submit">Search</button>
        </form>
        <button class="site-ads" type="button" id="toggle-ads">Close Ads</button>
      </div>
    </div>
  </div>
</header>`;
}

function renderHubPage(novels) {
  const wikiSearchIndex = novels.flatMap((novel) => {
    const novelResult = {
      kind: "Book glossary",
      title: novel.label,
      excerpt: trimDescription(novel.summary || `${novel.termCount} terms in this glossary.`, 120),
      href: wikiNovelPath(novel.novelId),
      search: normalizeForSearch(`${novel.label} ${novel.summary}`)
    };
    const termResults = novel.entries.map((entry) => ({
      kind: "Glossary term",
      title: `${entry.displayTitle} - ${novel.label}`,
      excerpt: trimDescription(entry.definition, 120),
      href: wikiTermPath(novel.novelId, entry.id),
      search: normalizeForSearch(`${entry.displayTitle} ${entry.definition} ${novel.label}`)
    }));
    return [novelResult, ...termResults];
  });

  const itemsHtml = novels.length
    ? novels
        .map(
          (novel) => `<a class="card" href="${wikiNovelPath(novel.novelId)}" data-wiki-home-card="${escapeHtml(
            `${novel.label} ${novel.summary}`
          )}">
  <div class="card-title">${escapeHtml(novel.label)}</div>
  <div class="card-copy">${escapeHtml(novel.summary || `Glossary hub for ${novel.label}.`)}</div>
  <div class="card-meta">${novel.termCount} terms</div>
</a>`
        )
        .join("\n")
    : `<div class="empty">No glossary entries yet. Run the wiki index pipeline after content sync to publish lore pages.</div>`;

  const body = `${renderSiteHeader({ wikiActive: true })}
<main class="shell">
  <section class="hero">
    <h1 class="title title--wiki-hub">${escapeHtml(WIKI_HUB_HEADING)}</h1>
    <p class="tagline">${escapeHtml(WIKI_HUB_TAGLINE)}</p>
    <div class="wiki-search-panel">
      <form class="wiki-search-form" data-wiki-search-form>
        <label class="wiki-search-label" for="wiki-home-search">Search wiki terms or book glossaries</label>
        <div class="wiki-search-row">
          <input id="wiki-home-search" class="wiki-search-input" name="q" type="search" placeholder="Search wiki terms..." aria-label="Search wiki terms" autocomplete="off" data-wiki-search-input />
          <button class="wiki-search-button" type="submit">Search</button>
        </div>
        <p class="wiki-search-help">Search glossary terms only. Searching a book title will show its wiki glossary page.</p>
      </form>
      <div class="wiki-search-results" data-wiki-search-results></div>
    </div>
    ${renderShareBar(wikiHubPath())}
  </section>
  <section class="stack" id="wiki-list">${itemsHtml}</section>
  <script id="wiki-search-index" type="application/json">${escapeJsonForScript(wikiSearchIndex)}</script>
  <footer class="footer">
    <p class="footer-copy">Static wiki pages are generated during deployment from your synced novel content, then served directly by Cloudflare assets.</p>
  </footer>
</main>`;

  return renderDocument({
    title: WIKI_HUB_HEADING,
    description: WIKI_HUB_META_DESCRIPTION,
    canonicalPath: wikiHubPath(),
    body,
    jsonLd: [wikiHubJsonLd(novels)]
  });
}

function renderNovelHubPage(novel) {
  const pathName = wikiNovelPath(novel.novelId);
  const hasSummary = Boolean(novel.summary);
  const letterGroups = buildLetterGroups(novel.entries, novel.novelId);
  const description = trimDescription(
    novel.summary || `Glossary terms for ${novel.label}: cultivation lore, techniques, and world concepts with chapter links.`,
    170
  );
  const { preview: summaryPreview, needsExpand } = truncateForPreview(
    novel.summary || `Glossary hub for ${novel.label}.`,
    DIRECTORY_SYNOPSIS_CHARS
  );
  const itemsHtml = letterGroups.length
    ? novel.entries
        .map(() => "")
        .join("\n")
    : `<div class="empty">No glossary entries were available for this novel in the current wiki shard.</div>`;

  const letterNavHtml = letterGroups.length
    ? letterGroups
        .map(
          (group, index) => `<div class="glossary-group">
  <button type="button" class="glossary-trigger${index === 0 ? " glossary-trigger--active" : ""}" data-letter-trigger="${escapeHtml(
            group.letter
          )}" aria-expanded="${index === 0 ? "true" : "false"}">
    <span>${escapeHtml(group.letter)} terms</span>
    <span>${group.items.length}</span>
  </button>
  <div class="glossary-chip-list" data-letter-panel="${escapeHtml(group.letter)}"${index === 0 ? "" : ' hidden'}>
    ${group.items
      .map(
        (item) => `<a class="glossary-chip" href="${escapeHtml(item.href)}">${escapeHtml(item.displayTitle)}</a>`
      )
      .join("")}
  </div>
</div>`
        )
        .join("\n")
    : `<div class="empty">No indexed term navigation is available yet for this glossary.</div>`;

  const groupedCardHtml = letterGroups.length
    ? letterGroups
        .map(
          (group, index) => `<section class="wiki-letter-section${index === 0 ? " wiki-letter-section--active" : ""}" data-letter-section="${escapeHtml(
            group.letter
          )}" id="wiki-letter-${escapeHtml(group.letter)}">
  <h2 class="wiki-letter-section__heading">${escapeHtml(group.letter)} terms</h2>
  <div class="grid">
    ${group.items
      .map(
        (entry) => `<a class="card" href="${wikiTermPath(novel.novelId, entry.id)}">
      <div class="wiki-glossary-card">
        <div class="card-title">${escapeHtml(entry.displayTitle)}</div>
        <div class="card-copy">${escapeHtml(trimDescription(entry.definition, 150))}</div>
        <div class="card-meta">${entry.chapterNos.length} chapter references</div>
      </div>
    </a>`
      )
      .join("\n")}
  </div>
</section>`
        )
        .join("\n")
    : itemsHtml;

  const body = `${renderSiteHeader({ activeCategory: novel.categorySlug, wikiActive: true })}
<main class="shell wiki-shell--wide">
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${wikiHubPath()}">${escapeHtml(WIKI_NAV_LABEL)}</a>
      <span>/</span>
      <span>${escapeHtml(novel.label)}</span>
    </nav>
    <h1 class="title">${escapeHtml(novel.label)}</h1>
    ${
      hasSummary
        ? `<div class="tagline">
      <p data-summary-text data-full="${escapeHtml(novel.summary)}" data-preview="${escapeHtml(summaryPreview)}">${escapeHtml(
            summaryPreview
          )}</p>
      ${
        needsExpand
          ? `<button class="summary-toggle" type="button" data-summary-toggle data-expanded="0" aria-expanded="false">Read more</button>`
          : ""
      }
    </div>`
        : ""
    }
    <p class="meta">${novel.termCount} terms in this glossary.</p>
    ${renderShareBar(pathName)}
  </section>
  <section class="wiki-glossary-layout" data-follow-rail-container>
    <div class="wiki-term-grid">${groupedCardHtml}</div>
    <aside class="wiki-glossary-rail follow-rail-shell" data-follow-rail-shell>
      <div class="follow-rail-inner rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-sm" data-follow-rail-card>
        <p class="section-label">Glossary Navigator</p>
        <div class="glossary-groups">${letterNavHtml}</div>
      </div>
    </aside>
  </section>
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
          url: absoluteUrl(wikiHubPath())
        }
      },
      breadcrumbJsonLd([
        { name: WIKI_NAV_LABEL, path: wikiHubPath() },
        { name: novel.label, path: pathName }
      ])
    ]
  });
}

function renderTermPage(novel, entry) {
  const novelPath = wikiNovelPath(novel.novelId);
  const termPath = wikiTermPath(novel.novelId, entry.id);
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

  const body = `${renderSiteHeader({ activeCategory: novel.categorySlug, wikiActive: true })}
<main class="shell">
  <section class="hero">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="${wikiHubPath()}">${escapeHtml(WIKI_NAV_LABEL)}</a>
      <span>/</span>
      <a href="${novelPath}">${escapeHtml(novel.label)}</a>
      <span>/</span>
      <span>${escapeHtml(entry.displayTitle)}</span>
    </nav>
    <h1 class="title">${escapeHtml(entry.displayTitle)}</h1>
    <p class="tagline">A static cultivation glossary entry for ${escapeHtml(novel.label)}.</p>
    ${renderShareBar(termPath)}
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
        { name: WIKI_NAV_LABEL, path: wikiHubPath() },
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
    const summary = normalizeSummary(frontmatter, contentRecord);
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
  ensureDir(wikiAssetsOutRoot);
  writeText(path.join(wikiAssetsOutRoot, "wiki.css"), baseStyles());
  writeText(path.join(wikiAssetsOutRoot, "wiki.js"), sharedWikiClientScript());
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
