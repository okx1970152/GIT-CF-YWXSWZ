import Link from "next/link";

type ChapterNavigationProps = {
  prevHref: string | null;
  nextHref: string | null;
  directoryHref: string;
};

export function ChapterNavigation({ prevHref, nextHref, directoryHref }: ChapterNavigationProps) {
  return (
    <nav
      className="chapter-navigation mt-10 flex flex-wrap gap-3 border-t border-emerald-900/10 pt-8"
      aria-label="Chapter navigation"
    >
      {prevHref ? (
        <Link
          href={prevHref}
          className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
        className="rounded-xl border border-emerald-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Directory
      </Link>
      {nextHref ? (
        <Link
          href={nextHref}
          className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
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
