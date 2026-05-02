import Link from "next/link";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";

type ChapterNavigationProps = {
  prevHref: string | null;
  nextHref: string | null;
  directoryHref: string;
  shareUrl: string;
  shareTitle: string;
};

export function ChapterNavigation({
  prevHref,
  nextHref,
  directoryHref,
  shareUrl,
  shareTitle
}: ChapterNavigationProps) {
  return (
    <nav
      className="chapter-navigation mt-10 flex w-full flex-col gap-4 border-t border-[var(--border-soft)] pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
      aria-label="Chapter navigation"
    >
      <div className="flex flex-wrap gap-3">
        {prevHref ? (
          <Link
            href={prevHref}
            className="rounded-xl bg-[var(--accent-green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
          >
            Previous Chapter
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl border border-dashed border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
            Previous Chapter
          </span>
        )}
        <Link
          href={directoryHref}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-deep)] shadow-sm hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
        >
          Directory
        </Link>
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-xl bg-[var(--accent-green)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
          >
            Next Chapter
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded-xl border border-dashed border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
            Next Chapter
          </span>
        )}
      </div>
      <ShareAndFavoriteBar shareUrl={shareUrl} shareTitle={shareTitle} className="sm:justify-end" />
    </nav>
  );
}
