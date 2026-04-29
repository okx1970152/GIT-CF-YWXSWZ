import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import { cn } from "@/lib/cn";
import { getDisplayNovelTitle } from "@/lib/content/novels";

type NovelCardProps = {
  novel: NovelInfo;
  className?: string;
};

export function NovelCard({ novel, className }: NovelCardProps) {
  const href = `/novels/${novel.categorySlug}/${novel.novelId}`;
  const displayTitle = getDisplayNovelTitle(novel);
  const label = `Open directory: ${displayTitle}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group flex aspect-[5/4] max-h-[400px] w-full max-w-[500px] flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-sm outline-none ring-[var(--accent-green)]/30 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-green)] hover:bg-[var(--accent-green)] hover:text-white hover:shadow-md focus-visible:ring-2 focus-visible:bg-[var(--accent-green)] focus-visible:text-white active:scale-[0.995] sm:h-[400px] sm:max-h-[400px] sm:aspect-auto sm:p-6",
        className
      )}
    >
      <h2 className="text-center font-serif text-[22px] font-bold leading-snug text-[var(--text-deep)] transition-colors duration-300 group-hover:text-white group-focus-visible:text-white">
        {displayTitle}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-sans text-sm text-[var(--text-soft)] transition-colors duration-300 group-hover:text-white group-focus-visible:text-white">
        <p>
          <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover:text-white/90 group-focus-visible:text-white/90">
            Author:
          </span>{" "}
          {novel.author}
        </p>
        <p>
          <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover:text-white/90 group-focus-visible:text-white/90">
            Category:
          </span>{" "}
          {novel.category}
        </p>
        <p>
          <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover:text-white/90 group-focus-visible:text-white/90">
            Status:
          </span>{" "}
          {novel.status}
        </p>
        <p>
          <span className="text-[var(--text-muted)] transition-colors duration-300 group-hover:text-white/90 group-focus-visible:text-white/90">
            Chapters:
          </span>{" "}
          {novel.total_chapters}
        </p>
      </div>
      <p className="mt-4 line-clamp-8 flex-1 overflow-hidden font-serif text-base leading-relaxed text-[var(--text-soft)] transition-colors duration-300 group-hover:text-white group-focus-visible:text-white">
        {novel.desc}
      </p>
      <p className="mt-4 text-center font-sans text-[10px] text-[var(--text-muted)] transition-colors duration-300 group-hover:text-white/90 group-focus-visible:text-white/90">
        Click anywhere to read directory
      </p>
    </Link>
  );
}
