"use client";

import { useRef } from "react";
import type { NovelInfo } from "@/lib/content/schema";
import { NovelCard } from "@/components/novel/NovelCard";
import { cn } from "@/lib/cn";

type SectionRailProps = {
  title: string;
  novels: NovelInfo[];
  id?: string;
  className?: string;
};

export function SectionRail({ title, novels, id, className }: SectionRailProps) {
  const first = novels[0];
  const rest = novels.slice(1);
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollRail = (delta: number) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section id={id} className={cn("mb-14", className)} aria-labelledby={id ? `${id}-heading` : undefined}>
      <h2
        id={id ? `${id}-heading` : undefined}
        className="mb-4 font-serif text-2xl font-semibold text-[var(--text-deep)]"
      >
        {title}
      </h2>
      {novels.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-surface)] px-6 py-10 text-center text-[var(--text-soft)]">
          No novels in this section yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
          {first ? (
            <div className="flex shrink-0 justify-center lg:w-[500px] lg:justify-start">
              <NovelCard novel={first} className="w-full sm:max-w-[500px]" />
            </div>
          ) : null}
          {rest.length > 0 ? (
            <div className="min-h-0 min-w-0 flex-1 lg:min-w-0">
              <div className="mb-3 hidden justify-end gap-2 lg:flex">
                <button
                  type="button"
                  onClick={() => scrollRail(-560)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                  aria-label={`Scroll ${title} left`}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(560)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                  aria-label={`Scroll ${title} right`}
                >
                  Next
                </button>
              </div>
              <div
                ref={railRef}
                className="scrollbar-hide min-h-0 min-w-0 snap-x snap-mandatory overflow-x-auto scroll-smooth"
              >
                <div className="flex w-max gap-6 pb-2">
                {rest.map((novel) => (
                  <NovelCard
                    key={`${novel.categorySlug}-${novel.novelId}`}
                    novel={novel}
                    className="snap-start"
                  />
                ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
