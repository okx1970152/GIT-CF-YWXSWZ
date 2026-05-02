"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

const SHARE_TOAST_MS = 7000;

/** IE / legacy Firefox bookmark APIs are not on TypeScript's Window type */
type LegacyBookmarkWindow = Window & {
  external?: { AddFavorite?: (u: string, t: string) => void };
  sidebar?: { addPanel?: (a: string, b: string, c: string) => void };
};

function bookmarkStorageKey(url: string) {
  return `novel-browser-bookmark:${url}`;
}

function tryLegacyBrowserBookmark(absUrl: string, title: string): boolean {
  const w = window as LegacyBookmarkWindow;
  try {
    const ext = w.external;
    if (ext && typeof ext.AddFavorite === "function") {
      ext.AddFavorite(absUrl, title);
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    const sidebar = w.sidebar;
    if (sidebar && typeof sidebar.addPanel === "function") {
      sidebar.addPanel(title, absUrl, "");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

const SHARE_TARGETS: readonly { id: string; toastName: string; title: string; icon: string }[] = [
  { id: "x", toastName: "X", title: "Share to X", icon: "/LOGO/x.png" },
  { id: "facebook", toastName: "Facebook", title: "Share to Facebook", icon: "/LOGO/facebook.png" },
  { id: "instagram", toastName: "Instagram", title: "Share to Instagram", icon: "/LOGO/instagram.png" },
  { id: "telegram", toastName: "Telegram", title: "Share to Telegram", icon: "/LOGO/telegram.png" },
  { id: "reddit", toastName: "Reddit", title: "Share to Reddit", icon: "/LOGO/reddit.png" },
  { id: "quora", toastName: "Quora", title: "Share to Quora", icon: "/LOGO/quora.png" },
  { id: "threads", toastName: "Threads", title: "Share to Threads", icon: "/LOGO/threads.png" }
];

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  if (filled) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      setBookmarked(window.localStorage.getItem(bookmarkStorageKey(shareUrl)) === "1");
    } catch {
      /* ignore */
    }
  }, [shareUrl]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), SHARE_TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const markBookmarked = useCallback(() => {
    try {
      window.localStorage.setItem(bookmarkStorageKey(shareUrl), "1");
    } catch {
      /* ignore */
    }
    setBookmarked(true);
  }, [shareUrl]);

  const copyShareForPlatform = useCallback(
    async (toastName: string) => {
      const line = `${shareTitle} ${shareUrl}`.trim();
      try {
        await navigator.clipboard.writeText(line);
      } catch {
        setToast("无法复制到剪贴板，请手动复制页面链接。");
        return;
      }
      setToast(`分享内容链接已复制，请到${toastName}发布分享即可！`);
    },
    [shareTitle, shareUrl]
  );

  const targets = useMemo(() => SHARE_TARGETS, []);

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
      className={`relative flex flex-wrap items-center gap-x-3 gap-y-2 ${className ?? ""}`}
      role="group"
      aria-label="Share and bookmark"
    >
      <span className="font-sans text-sm font-semibold text-[var(--text-deep)]">Share to</span>
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {targets.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              title={p.title}
              aria-label={p.title}
              onClick={() => void copyShareForPlatform(p.toastName)}
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

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[200] max-w-[min(100vw-2rem,26rem)] -translate-x-1/2 rounded-xl border border-[#9cd8b5] bg-[#0f2e1f] px-4 py-3 text-center text-sm leading-snug text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
