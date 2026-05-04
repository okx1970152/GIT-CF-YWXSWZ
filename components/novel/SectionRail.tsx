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

const AUTO_ADVANCE_MS = 5000;
/** 测量失败时的兜底（约等于 400px 卡 + gap-6） */
const FALLBACK_CARD_STEP_PX = 424;

/** 轨道内「一张卡 + flex gap」的步长，保证 Prev/Next / 自动轮播每次对齐下一张卡 */
function getRailScrollStep(railEl: HTMLElement): number {
  const track = railEl.firstElementChild as HTMLElement | null;
  if (!track?.firstElementChild) return FALLBACK_CARD_STEP_PX;
  const card = track.firstElementChild as HTMLElement;
  const gapRaw = getComputedStyle(track).gap;
  const gap = parseFloat(gapRaw) || 24;
  const w = card.getBoundingClientRect().width;
  return Math.max(1, Math.round(w + gap));
}

/** 横向卡片固定近似宽度 + shrink-0，避免 flex 把多张卡压进一屏导致无法滚动 */
const RAIL_CARD_WIDTH =
  "snap-start shrink-0 !w-[min(calc(100vw-2.5rem),22rem)] sm:!w-[400px] sm:max-w-[500px]";

export function SectionRail({ title, novels, id, className }: SectionRailProps) {
  const first = novels[0];
  const rest = novels.slice(1);
  const railRef = useRef<HTMLDivElement | null>(null);
  const hoverPauseRef = useRef(false);
  const novelsKey = novels.map((n) => `${n.categorySlug}:${n.novelId}`).join("|");

  const scrollRail = (direction: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const step = getRailScrollStep(el);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
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

      const step = getRailScrollStep(el);
      const left = el.scrollLeft;

      // 已在最右端：回到开头，让所有卡片周期性都能轮到「主视觉位」
      if (left >= maxScroll - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      const remaining = maxScroll - left;
      const delta = remaining <= step ? remaining : step;
      el.scrollBy({ left: delta, behavior: "smooth" });
    };

    const idTimer = window.setInterval(tick, AUTO_ADVANCE_MS);
    return () => window.clearInterval(idTimer);
  }, [rest.length, novelsKey]);

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
                  onClick={() => scrollRail(-1)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                  aria-label={`Scroll ${title} backward`}
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => scrollRail(1)}
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
                  className="scrollbar-hide min-h-0 min-w-0 snap-x snap-proximity overflow-x-auto scroll-smooth"
                >
                  <div className="flex w-max items-start gap-6 pb-2">
                    {rest.map((novel) => (
                      <NovelCard
                        key={`${novel.categorySlug}-${novel.novelId}`}
                        novel={novel}
                        className={RAIL_CARD_WIDTH}
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
