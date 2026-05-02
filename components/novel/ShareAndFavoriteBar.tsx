"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

const POPUP =
  "toolbar=yes,location=yes,directories=no,status=no,menubar=yes,scrollbars=yes,resizable=yes,copyhistory=yes,width=600,height=450,top=100,left=350";

function bookmarkStorageKey(url: string) {
  return `novel-browser-bookmark:${url}`;
}

function tryLegacyBrowserBookmark(absUrl: string, title: string): boolean {
  try {
    const ext = window.external as { AddFavorite?: (u: string, t: string) => void } | undefined;
    if (ext && typeof ext.AddFavorite === "function") {
      ext.AddFavorite(absUrl, title);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const sidebar = window.sidebar as { addPanel?: (a: string, b: string, c: string) => void } | undefined;
    if (sidebar && typeof sidebar.addPanel === "function") {
      sidebar.addPanel(title, absUrl, "");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

type PlatformDef =
  | {
      id: string;
      label: string;
      icon: string;
      href: (url: string, title: string) => string;
    }
  | {
      id: string;
      label: string;
      icon: string;
      onShare: (url: string, title: string) => void;
    };

function buildPlatforms(url: string, title: string): PlatformDef[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    {
      id: "x",
      label: "Share to X",
      icon: "/LOGO/x.png",
      href: () =>
        `https://twitter.com/intent/tweet?url=${u}&text=${t}`
    },
    {
      id: "facebook",
      label: "Share to Facebook",
      icon: "/LOGO/facebook.png",
      href: () => `https://www.facebook.com/sharer.php?u=${u}&t=${t}`
    },
    {
      id: "instagram",
      label: "Share to Instagram",
      icon: "/LOGO/instagram.png",
      onShare: async (pageUrl, pageTitle) => {
        const line = `${pageTitle} ${pageUrl}`.trim();
        try {
          await navigator.clipboard.writeText(line);
        } catch {
          /* ignore */
        }
        window.open("https://www.instagram.com/", "_blank", POPUP);
      }
    },
    {
      id: "telegram",
      label: "Share to Telegram",
      icon: "/LOGO/telegram.png",
      href: () => `https://t.me/share/url?url=${u}&text=${t}`
    },
    {
      id: "reddit",
      label: "Share to Reddit",
      icon: "/LOGO/reddit.png",
      href: () => `https://www.reddit.com/submit?url=${u}&title=${t}`
    },
    {
      id: "quora",
      label: "Share to Quora",
      icon: "/LOGO/quora.png",
      onShare: async (pageUrl, pageTitle) => {
        const line = `${pageTitle} ${pageUrl}`.trim();
        try {
          await navigator.clipboard.writeText(line);
        } catch {
          /* ignore */
        }
        window.open("https://www.quora.com/", "_blank", POPUP);
      }
    },
    {
      id: "threads",
      label: "Share to Threads",
      icon: "/LOGO/threads.png",
      href: () => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${title} ${url}`)}`
    }
  ];
}

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  );
}

type ShareAndFavoriteBarProps = {
  shareUrl: string;
  shareTitle: string;
  className?: string;
};

export function ShareAndFavoriteBar({ shareUrl, shareTitle, className }: ShareAndFavoriteBarProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [iconBroken, setIconBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setBookmarked(window.localStorage.getItem(bookmarkStorageKey(shareUrl)) === "1");
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  const platforms = useMemo(() => buildPlatforms(shareUrl, shareTitle), [shareUrl, shareTitle]);

  const markBookmarked = useCallback(() => {
    try {
      window.localStorage.setItem(bookmarkStorageKey(shareUrl), "1");
    } catch {
      /* ignore */
    }
    setBookmarked(true);
  }, [shareUrl]);

  const openShare = useCallback(
    (p: PlatformDef) => {
      if ("onShare" in p && p.onShare) {
        p.onShare(shareUrl, shareTitle);
        return;
      }
      if ("href" in p && p.href) {
        const target = p.href(shareUrl, shareTitle);
        window.open(target, "_blank", POPUP);
      }
    },
    [shareTitle, shareUrl]
  );

  const onBookmarkClick = useCallback(() => {
    if (tryLegacyBrowserBookmark(shareUrl, shareTitle)) {
      markBookmarked();
      return;
    }
    void (async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch {
        /* ignore */
      }
      window.alert(
        "Add this page to your browser bookmarks:\n\n" +
          "• Windows / Linux: Ctrl + D\n" +
          "• Mac: Command (⌘) + D\n\n" +
          "The page URL has been copied to your clipboard as a shortcut."
      );
      markBookmarked();
    })();
  }, [markBookmarked, shareTitle, shareUrl]);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className ?? ""}`}
      role="group"
      aria-label="Share and bookmark"
    >
      <span className="font-sans text-sm font-semibold text-[var(--text-deep)]">Share to</span>
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {platforms.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              title={p.label}
              aria-label={p.label}
              onClick={() => openShare(p)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent bg-[var(--bg-card)] text-[var(--text-deep)] shadow-sm transition-transform hover:scale-110 hover:border-[var(--border-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
            >
              {!iconBroken[p.id] ? (
                <Image
                  src={p.icon}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  unoptimized
                  onError={() => setIconBroken((prev) => ({ ...prev, [p.id]: true }))}
                />
              ) : (
                <span className="text-xs font-bold uppercase">{p.id.slice(0, 2)}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        title={bookmarked ? "Bookmarked (click again to copy URL)" : "Add to browser bookmarks"}
        aria-label={bookmarked ? "Bookmarked" : "Add to browser bookmarks"}
        aria-pressed={bookmarked}
        onClick={onBookmarkClick}
        className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg border border-transparent bg-[var(--bg-card)] text-amber-500 shadow-sm transition-transform hover:scale-110 hover:border-[var(--border-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
      >
        <StarIcon filled={bookmarked} className="h-6 w-6" />
      </button>
    </div>
  );
}
