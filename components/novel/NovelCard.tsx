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
        "group flex aspect-[5/4] max-h-[400px] w-full max-w-[500px] flex-col rounded-2xl bg-white p-6 shadow-sm outline-none ring-emerald-800/20 transition hover:shadow-md focus-visible:ring-2 sm:h-[400px] sm:max-h-[400px] sm:aspect-auto",
        className
      )}
    >
      <h2 className="font-serif text-[22px] font-bold leading-snug text-slate-900 group-hover:text-emerald-900">
        {novel.title}
      </h2>
      <div className="mt-2 space-y-0.5 font-sans text-sm text-slate-600">
        <p>
          <span className="text-slate-500">Author:</span> {novel.author}
        </p>
        <p>
          <span className="text-slate-500">Status:</span> {novel.status}
        </p>
        <p>
          <span className="text-slate-500">Category:</span> {novel.category}
        </p>
        <p>
          <span className="text-slate-500">Chapters:</span> {novel.total_chapters}
        </p>
      </div>
      <p className="mt-4 line-clamp-6 flex-1 overflow-hidden font-serif text-base leading-relaxed text-slate-700">
        {novel.desc}
      </p>
      <p className="mt-4 text-center font-sans text-[10px] text-slate-400">
        Click anywhere to read directory
      </p>
    </Link>
  );
}
