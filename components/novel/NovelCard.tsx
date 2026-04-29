import Link from "next/link";
import type { NovelInfo } from "@/lib/content/schema";
import { cn } from "@/lib/cn";

type NovelCardProps = {
  novel: NovelInfo;
  className?: string;
};

export function NovelCard({ novel, className }: NovelCardProps) {
  const href = `/novels/${novel.categorySlug}/${novel.novelId}`;
  const label = `Open directory: ${novel.title}`;

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "group flex aspect-[5/4] max-h-[400px] w-full max-w-[500px] flex-col rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5 shadow-sm outline-none ring-[var(--accent-green)]/30 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 active:scale-[0.995] sm:h-[400px] sm:max-h-[400px] sm:aspect-auto sm:p-6",
        className
      )}
    >
      <h2 className="font-serif text-[22px] font-bold leading-snug text-[var(--text-deep)] group-hover:text-[#058c46]">
        {novel.title}
      </h2>
      <div className="mt-2 space-y-0.5 font-sans text-sm text-[var(--text-soft)]">
        <p>
          <span className="text-[var(--text-muted)]">Author:</span> {novel.author}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Status:</span> {novel.status}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Category:</span> {novel.category}
        </p>
        <p>
          <span className="text-[var(--text-muted)]">Chapters:</span> {novel.total_chapters}
        </p>
      </div>
      <p className="mt-4 line-clamp-6 flex-1 overflow-hidden font-serif text-base leading-relaxed text-[var(--text-soft)]">
        {novel.desc}
      </p>
      <p className="mt-4 text-center font-sans text-[10px] text-[var(--text-muted)]">
        Click anywhere to read directory
      </p>
    </Link>
  );
}
