import Link from "next/link";

type ChapterNavigationProps = {
  prevHref: string | null;
  nextHref: string | null;
  directoryHref: string;
};

export function ChapterNavigation({ prevHref, nextHref, directoryHref }: ChapterNavigationProps) {
  return (
    <nav
      className="chapter-navigation mt-10 flex flex-wrap gap-3 border-t border-[var(--border-soft)] pt-8"
      aria-label="Chapter navigation"
    >
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
    </nav>
  );
}
