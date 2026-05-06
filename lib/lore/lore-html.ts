import type { LoreAnchor } from "@/lib/content/meta";

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** 词条表面文本插入 HTML 正文时转义（不含引号场景） */
function escapeHtmlTextNode(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type LoreWikiLinkOptions = {
  novelId: string;
  /** 仅对这些 id 包 `<a href="/wiki/...">`，避免无释义词条 404 */
  wikiLinkedIds: Set<string>;
};

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** 悬停 data 属性用，限制体积，避免 HTML 膨胀 */
const LORE_PREVIEW_ATTR_MAX_CHARS = 420;

function truncateForDataAttr(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= LORE_PREVIEW_ATTR_MAX_CHARS) return t;
  return `${t.slice(0, LORE_PREVIEW_ATTR_MAX_CHARS - 1)}…`;
}

/**
 * 生产端约定：`## Visible title {#lore-id}` → remark 产出 `<h2>…{#id}</h2>`。
 * 转成标准带 id 的标题，便于导读内 scrollIntoView。
 */
/** 导读侧栏四项小节在页面上的展示顺序（与素材端默认写作顺序无关） */
const GUIDE_SECTION_ORDER = [
  "cultural / xianxia notes",
  "chapter overview",
  "key plot points",
  "reading guide"
] as const;

function stripHtmlTagsInner(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/** 将 remark 产出的导读 HTML 按固定顺序重排 h2 章节（保留首个 h2 前的引言片段）。 */
export function reorderGuideSectionsHtml(html: string): string {
  if (!html.trim()) return html;

  const h2Re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  const matches = Array.from(html.matchAll(h2Re));
  if (matches.length <= 1) return html;

  function headingSortKey(innerHtml: string, fallbackIndex: number): number {
    const plain = stripHtmlTagsInner(innerHtml)
      .replace(/\{#[a-z0-9-]+\}\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    for (let i = 0; i < GUIDE_SECTION_ORDER.length; i++) {
      if (plain === GUIDE_SECTION_ORDER[i]) return i;
    }
    for (let i = 0; i < GUIDE_SECTION_ORDER.length; i++) {
      if (plain.includes(GUIDE_SECTION_ORDER[i])) return i;
    }
    return 100 + fallbackIndex;
  }

  const firstIdx = matches[0].index ?? 0;
  const preamble = firstIdx > 0 ? html.slice(0, firstIdx) : "";

  const sections = matches.map((m, i) => {
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? html.length) : html.length;
    return {
      sortKey: headingSortKey(m[1] as string, i),
      originalIndex: i,
      chunk: html.slice(start, end)
    };
  });

  sections.sort((a, b) =>
    a.sortKey !== b.sortKey ? a.sortKey - b.sortKey : a.originalIndex - b.originalIndex
  );

  return preamble + sections.map((s) => s.chunk).join("");
}

export function applyGuideHeadingAnchors(html: string): string {
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, (full, attrs = "", inner: string) => {
    const attrsStr = attrs as string;
    if (/\bid\s*=/i.test(attrsStr)) return full;
    const m = inner.match(/\{#([a-z0-9-]+)\}\s*$/i);
    if (!m) return full;
    const id = m[1].toLowerCase();
    const titleInner = inner.slice(0, m.index).trim();
    return `<h2 id="${escapeHtmlAttr(id)}"${attrsStr}>${titleInner}</h2>`;
  });
}

export type LoreSectionPreview = { title: string; preview: string };

/** 从已处理过的导读 HTML 中提取带 id 的 h2 节后正文预览（用于悬浮卡片）。 */
export function extractLoreGuideSectionPreviews(
  html: string,
  maxWords = 60
): Record<string, LoreSectionPreview> {
  const out: Record<string, LoreSectionPreview> = {};
  const h2Re = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
  const matches: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = h2Re.exec(html)) !== null) matches.push(m);

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const attrs = match[1];
    const inner = match[2];
    const idM = attrs.match(/\bid\s*=\s*"([^"]+)"/i);
    if (!idM) continue;
    const id = idM[1];
    const title = stripHtmlTags(inner).replace(/\s+/g, " ").trim();
    const endIdx = match.index + match[0].length;
    const next = matches[i + 1];
    const bodyEnd = next ? next.index : html.length;
    const bodyHtml = html.slice(endIdx, bodyEnd);
    const plain = stripHtmlTags(bodyHtml).replace(/\s+/g, " ").trim();
    out[id] = { title, preview: truncateWords(plain, maxWords) };
  }
  return out;
}

type SurfaceItem = { surface: string; id: string };

/** 仅在「标签外的文本」中替换，避免破坏属性值；同一位置优先更长 surface。 */
export function applyLoreAnchorsToChapterHtml(
  html: string,
  anchors: LoreAnchor[],
  wikiLink?: LoreWikiLinkOptions
): string {
  const items: SurfaceItem[] = anchors.flatMap((a) =>
    (a.surfaces ?? []).filter(Boolean).map((surface) => ({ surface, id: a.id }))
  );
  if (items.length === 0) return html;
  items.sort((a, b) => b.surface.length - a.surface.length);

  const definitionById = new Map<string, string>();
  for (const a of anchors) {
    const d = a.definition?.trim();
    if (d) definitionById.set(a.id, d);
  }

  const parts = html.split(/(<[^>]+>)/);
  return parts
    .map((part, idx) => {
      if (idx % 2 === 1) return part;
      return wrapSurfacesInPlainText(part, items, wikiLink, definitionById);
    })
    .join("");
}

function wrapSurfacesInPlainText(
  text: string,
  items: SurfaceItem[],
  wikiLink: LoreWikiLinkOptions | undefined,
  definitionById: Map<string, string>
): string {
  let result = "";
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const { surface, id } of items) {
      if (!surface) continue;
      if (text.startsWith(surface, i)) {
        const safeSurface = escapeHtmlTextNode(surface);
        const def = definitionById.get(id);
        const previewAttr = def
          ? ` data-lore-preview="${escapeHtmlAttr(truncateForDataAttr(def))}"`
          : "";
        const titleAttr = ` data-lore-title="${escapeHtmlAttr(surface)}"`;
        const inner = `<span class="lore-anchor" data-lore-id="${escapeHtmlAttr(id)}"${titleAttr}${previewAttr} tabindex="0">${safeSurface}</span>`;
        const useWiki =
          wikiLink &&
          wikiLink.wikiLinkedIds.size > 0 &&
          wikiLink.wikiLinkedIds.has(id);
        if (useWiki) {
          const href = `/wiki/${encodeURIComponent(wikiLink.novelId)}/${encodeURIComponent(id)}`;
          result += `<a href="${href}" target="_blank" rel="noopener noreferrer" class="lore-link">${inner}</a>`;
        } else {
          result += inner;
        }
        i += surface.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i += 1;
    }
  }
  return result;
}
