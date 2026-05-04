"use client";

import { useEffect, useRef } from "react";
import type { NovelInfo } from "@/lib/content/schema";
import { NovelCard } from "@/components/novel/NovelCard";
import { cn } from "@/lib/cn";

type SectionRailProps = {
  title: string;
  novels: NovelInfo[];
  id?: string;
  className?: string;
};

/** 自动向左推进（scrollLeft 增大）；与手动 Next 步长一致 */
const SCROLL_STEP_PX = 560;
const AUTO_ADVANCE_MS = 5000;

export function SectionRail({ title, novels, id, className }: SectionRailProps) {
  const first = novels[0];
  const rest = novels.slice(1);
  const railRef = useRef<HTMLDivElement | null>(null);
  const hoverPauseRef = useRef(false);

  const scrollRail = (delta: number) => {
    if (!railRef.current) return;
    railRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    if (rest.length === 0) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tick = () => {
      if (hoverPauseRef.current) return;
      const el = railRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 8) return;
      const nextLeft = el.scrollLeft + SCROLL_STEP_PX;
      if (nextLeft >= maxScroll - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: SCROLL_STEP_PX, behavior: "smooth" });
      }
    };

    const idTimer = window.setInterval(tick, AUTO_ADVANCE_MS);
    return () => window.clearInterval(idTimer);
  }, [rest.length]);

  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section id={id} className={cn("mb-14", className)} aria-labelledby={headingId}>
      {novels.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--bg-surface)] px-6 py-10 text-center text-[var(--text-soft)]">
          No novels in this section yet.
        </p>
      ) : (
        <div
          onMouseEnter={() => {
            hoverPauseRef.current = true;
          }}
          onMouseLeave={() => {
            hoverPauseRef.current = false;
          }}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2
              id={headingId}
              className="font-serif text-2xl font-semibold leading-tight text-[var(--text-deep)]"
            >
              {title}
            </h2>
            {rest.length > 0 ? (
              <div className="flex shrink-0 gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => scrollRail(-SCROLL_STEP_PX)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                  aria-label={`Scroll ${title} backward`}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(SCROLL_STEP_PX)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                  aria-label={`Scroll ${title} forward`}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
            {first ? (
              <div className="flex shrink-0 justify-center self-start lg:w-[500px] lg:justify-start">
                <NovelCard novel={first} className="w-full sm:max-w-[500px]" />
              </div>
            ) : null}
            {rest.length > 0 ? (
              <div className="min-h-0 min-w-0 flex-1 self-start lg:min-w-0">
                <div
                  ref={railRef}
                  className="scrollbar-hide min-h-0 min-w-0 snap-x snap-mandatory overflow-x-auto scroll-smooth"
                >
                  <div className="flex w-max items-start gap-6 pb-2">
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
        </div>
      )}
    </section>
  );
}
