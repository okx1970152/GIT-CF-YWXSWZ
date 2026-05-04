import type { NovelInfo } from "@/lib/content/schema";

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
}) {
  const { novel, displayTitle, summary, directoryAbsUrl } = opts;
  return {
    "@context": "https://schema.org",
    "@type": "Book",
    name: displayTitle,
    author: {
      "@type": "Person",
      name: novel.author?.trim() || "Unknown"
    },
    description: summary || undefined,
    dateModified: novel.updated_at || undefined,
    url: directoryAbsUrl,
    image: bookSchemaPlaceholderImage(displayTitle),
    inLanguage: "en"
  };
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

  const guidePosting: Record<string, unknown> = {
    "@type": "BlogPosting",
    "@id": `${chapterUrl}#reading-guide`,
    headline: `${displayTitle} Chapter ${chapterNo} - Summary & Analysis`,
    description: guideDesc.slice(0, 16_000),
    author: {
      "@type": "Organization",
      name: siteName
    },
    url: chapterUrl,
    inLanguage: "en",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": chapterUrl
    },
    publisher: {
      "@type": "Organization",
      name: siteName
    }
  };

  const chapterArticle: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${chapterUrl}#chapter-body`,
    headline: `${displayTitle} Chapter ${chapterNo}: ${chapterTitle}`,
    articleBody: body,
    author: {
      "@type": "Person",
      name: novelAuthor?.trim() || "Unknown"
    },
    url: chapterUrl,
    isPartOf: {
      "@type": "Book",
      name: displayTitle,
      url: bookDirectoryUrl
    },
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: siteName
    }
  };

  if (chapterDatePublished) chapterArticle.datePublished = chapterDatePublished;
  if (chapterDateModified) chapterArticle.dateModified = chapterDateModified;

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
