import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";
import { cn } from "@/lib/cn";
import { getDisplayNovelTitle, getNovelSummary } from "@/lib/content/novels";
import { toAbsoluteUrl } from "@/lib/seo";

type NovelCardProps = {
  novel: NovelInfo;
  className?: string;
};

export function NovelCard({ novel, className }: NovelCardProps) {
  const href = `/novels/${novel.categorySlug}/${novel.novelId}`;
  const displayTitle = getDisplayNovelTitle(novel);
  const summary = getNovelSummary(novel);
  const label = `Open directory: ${displayTitle}`;
  const shareUrl = toAbsoluteUrl(href);

  return (
    <div
      className={cn(
        "group/homecard flex aspect-[5/4] max-h-[400px] w-full max-w-[500px] flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-sm outline-none ring-[var(--accent-green)]/30 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:shadow-md focus-within:-translate-y-0.5 focus-within:border-[var(--accent-green)] focus-within:bg-[var(--accent-green)] focus-within:shadow-md focus-within:ring-2 sm:h-[400px] sm:max-h-[400px] sm:aspect-auto",
        className
      )}
    >
      <Link
        href={href}
        aria-label={label}
        className="flex min-h-0 flex-1 flex-col px-5 pb-2 pt-5 outline-none ring-[var(--accent-green)]/30 transition duration-300 ease-out focus-visible:ring-2 sm:px-6 sm:pt-6 active:scale-[0.995]"
      >
        <h2 className="text-center font-serif text-[22px] font-bold leading-snug text-[var(--text-deep)] transition-colors duration-300 group-hover/homecard:text-white group-focus-within/homecard:text-white">
          {displayTitle}
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-sans text-sm text-[var(--text-soft)] transition-colors duration-300 group-hover/homecard:text-white group-focus-within/homecard:text-white">
          <p>
            <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover/homecard:text-white/90 group-focus-within/homecard:text-white/90">
              Author:
            </span>{" "}
            {novel.author}
          </p>
          <p>
            <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover/homecard:text-white/90 group-focus-within/homecard:text-white/90">
              Category:
            </span>{" "}
            {novel.category}
          </p>
          <p>
            <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover/homecard:text-white/90 group-focus-within/homecard:text-white/90">
              Status:
            </span>{" "}
            {novel.status}
          </p>
          <p>
            <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover/homecard:text-white/90 group-focus-within/homecard:text-white/90">
              Chapters:
            </span>{" "}
            {novel.total_chapters}
          </p>
        </div>
        <p className="mt-4 line-clamp-8 min-h-0 flex-1 overflow-hidden font-serif text-base leading-relaxed text-[var(--text-soft)] transition-colors duration-300 group-hover/homecard:text-white group-focus-within/homecard:text-white">
          {summary}
        </p>
      </Link>
      <div className="relative z-[1] w-full max-w-[500px] shrink-0 self-center px-3 pb-2 sm:px-4">
        <ShareAndFavoriteBar
          shareUrl={shareUrl}
          shareTitle={displayTitle}
          variant="compact"
          className="justify-center"
        />
      </div>
      <Link
        href={href}
        className="relative z-[1] px-5 pb-5 text-center font-sans text-[10px] text-[var(--text-muted)] transition-colors duration-300 group-hover/homecard:text-white/90 group-focus-within/homecard:text-white/90 sm:px-6"
      >
        Click anywhere to read directory
      </Link>
    </div>
  );
}
