import type { NovelInfo } from "@/lib/content/schema";
import { toAbsoluteUrl } from "@/lib/seo";

/** 无独立作者主页时，Person.url 的占位（富媒体校验常用固定首页） */
export const DEFAULT_SCHEMA_AUTHOR_PERSON_URL = "https://wx.0o0o.mom/";

/**
 * 将各类日期字符串规范为带 Z 的 ISO-8601（Google Rich Results 要求含时区）。
 * 仅日期 `YYYY-MM-DD` 时按 UTC 当日 00:00:00 解释。
 */
export function toSchemaOrgIsoDateTime(input: string | undefined | null): string | undefined {
  if (input == null || !String(input).trim()) return undefined;
  const s = String(input).trim();
  let d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dayOnly) {
    const y = Number(dayOnly[1]);
    const mo = Number(dayOnly[2]);
    const da = Number(dayOnly[3]);
    d = new Date(Date.UTC(y, mo - 1, da, 0, 0, 0, 0));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

function publisherOrganization(siteName: string) {
  const homeUrl = toAbsoluteUrl("/");
  const logoUrl = toAbsoluteUrl("/icon.png");
  return {
    "@type": "Organization",
    name: siteName,
    url: homeUrl,
    logo: {
      "@type": "ImageObject",
      url: logoUrl
    }
  };
}

/** 章节阅读页占位图（仅 JSON-LD；1200×630，与 OG 常见比例一致） */
export function getPlaceholderCover(title: string): string {
  const t = title?.trim() || "Chapter";
  return `https://placehold.co/1200x630/f3f4f6/374151?text=${encodeURIComponent(t)}`;
}

/** 将 Markdown 压成纯文本供 JSON-LD，避免 HTML 与过长脚本 */
export function markdownToPlainTextForSchema(input: string, maxLen = 120_000): string {
  if (!input?.trim()) return "";
  let s = input.replace(/^---[\s\S]*?---\s*/m, "");
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/** Schema 专用占位封面（仅 JSON-LD，不改 UI） */
export function bookSchemaPlaceholderImage(displayTitle: string): string {
  return `https://placehold.co/600x800/f3f4f6/374151?text=${encodeURIComponent(displayTitle)}`;
}

/** 小说目录页 Book（不含 aggregateRating） */
export function buildDirectoryBookJsonLd(opts: {
  novel: NovelInfo;
  displayTitle: string;
  summary: string;
  directoryAbsUrl: string;
  genres?: string[];
}) {
  const { novel, displayTitle, summary, directoryAbsUrl, genres } = opts;
  const bookDateModified = toSchemaOrgIsoDateTime(novel.updated_at);
  const book: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: displayTitle,
    author: {
      "@type": "Person",
      name: novel.author?.trim() || "Unknown",
      url: DEFAULT_SCHEMA_AUTHOR_PERSON_URL
    },
    description: summary || undefined,
    dateModified: bookDateModified,
    url: directoryAbsUrl,
    image: bookSchemaPlaceholderImage(displayTitle),
    inLanguage: "en"
  };
  if (genres?.length) book.genre = genres;
  return book;
}

/** 阅读页：导读 BlogPosting + 正文 Article + 稳定 @id */
export function buildChapterReadingGraph(opts: {
  chapterUrl: string;
  bookDirectoryUrl: string;
  displayTitle: string;
  chapterNo: string;
  chapterTitle: string;
  novelAuthor: string;
  guidePlainText: string;
  chapterBodyPlainText: string;
  siteName: string;
  chapterDatePublished?: string;
  chapterDateModified?: string;
}) {
  const {
    chapterUrl,
    bookDirectoryUrl,
    displayTitle,
    chapterNo,
    chapterTitle,
    novelAuthor,
    guidePlainText,
    chapterBodyPlainText,
    siteName,
    chapterDatePublished,
    chapterDateModified
  } = opts;

  const guideDesc = guidePlainText.trim() || "Reading guide for this chapter.";
  const body = chapterBodyPlainText.trim() || "";
  const coverImageUrl = getPlaceholderCover(chapterTitle);
  const pubIso = toSchemaOrgIsoDateTime(chapterDatePublished);
  const modIso = toSchemaOrgIsoDateTime(chapterDateModified);

  const guidePosting: Record<string, unknown> = {
    "@type": "BlogPosting",
    "@id": `${chapterUrl}#reading-guide`,
    headline: `${displayTitle} Chapter ${chapterNo} - Summary & Analysis`,
    description: guideDesc.slice(0, 16_000),
    image: coverImageUrl,
    author: {
      "@type": "Organization",
      name: siteName,
      url: toAbsoluteUrl("/")
    },
    url: chapterUrl,
    inLanguage: "en",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": chapterUrl
    },
    publisher: publisherOrganization(siteName)
  };

  const chapterArticle: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${chapterUrl}#chapter-body`,
    headline: `${displayTitle} Chapter ${chapterNo}: ${chapterTitle}`,
    articleBody: body,
    image: coverImageUrl,
    author: {
      "@type": "Person",
      name: novelAuthor?.trim() || "Unknown",
      url: DEFAULT_SCHEMA_AUTHOR_PERSON_URL
    },
    url: chapterUrl,
    isPartOf: {
      "@type": "Book",
      name: displayTitle,
      url: bookDirectoryUrl
    },
    inLanguage: "en",
    publisher: publisherOrganization(siteName)
  };

  if (pubIso) {
    guidePosting.datePublished = pubIso;
    chapterArticle.datePublished = pubIso;
  }
  if (modIso) {
    guidePosting.dateModified = modIso;
    chapterArticle.dateModified = modIso;
  }

  return {
    "@context": "https://schema.org",
    "@graph": [guidePosting, chapterArticle]
  };
}

/** 阅读页面包屑：首页 → 书目录 → 本章 */
export function buildChapterBreadcrumbJsonLd(opts: {
  homeUrl: string;
  bookName: string;
  bookDirectoryUrl: string;
  chapterName: string;
  chapterUrl: string;
}) {
  const { homeUrl, bookName, bookDirectoryUrl, chapterName, chapterUrl } = opts;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: homeUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: bookName,
        item: bookDirectoryUrl
      },
      {
        "@type": "ListItem",
        position: 3,
        name: chapterName,
        item: chapterUrl
      }
    ]
  };
}
