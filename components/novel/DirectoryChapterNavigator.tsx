"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChapterItem } from "@/lib/content/chapters";
import { padChapterNo } from "@/lib/content/chapter-utils";
import { cn } from "@/lib/cn";

type Props = {
  chapters: ChapterItem[];
  categorySlug: string;
  novelId: string;
};

type MinorRange = {
  key: string;
  start: number;
  end: number;
  label: string;
  anchorId: string;
  chapters: ChapterItem[];
};

type MajorRange = {
  key: string;
  start: number;
  end: number;
  label: string;
  anchorId: string;
  children: MinorRange[];
};

function parseChapterNo(input: string): number | null {
  const n = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function formatPaddedRange(start: number, end: number): string {
  return `${padChapterNo(start)}-${padChapterNo(end)}`;
}

function formatPlainRange(start: number, end: number): string {
  return `${start}-${end}`;
}

function buildRangeTree(chapters: ChapterItem[]): MajorRange[] {
  const parsed = chapters
    .map((chapter) => ({
      chapter,
      no: Number.parseInt(chapter.chapterNo, 10)
    }))
    .filter((item) => Number.isFinite(item.no))
    .sort((a, b) => a.no - b.no);

  if (!parsed.length) return [];

  const ranges: MajorRange[] = [];
  const maxNo = parsed[parsed.length - 1]?.no ?? 0;

  for (let majorStart = 1; majorStart <= maxNo; majorStart += 100) {
    const majorEnd = Math.min(majorStart + 99, maxNo);
    const majorChapters = parsed.filter((item) => item.no >= majorStart && item.no <= majorEnd);
    if (!majorChapters.length) continue;

    const children: MinorRange[] = [];
    for (let minorStart = majorStart; minorStart <= majorEnd; minorStart += 10) {
      const minorEnd = Math.min(minorStart + 9, majorEnd);
      const minorChapters = majorChapters
        .filter((item) => item.no >= minorStart && item.no <= minorEnd)
        .map((item) => item.chapter);
      if (!minorChapters.length) continue;
      children.push({
        key: `${majorStart}-${minorStart}`,
        start: minorStart,
        end: minorEnd,
        label: formatPlainRange(minorStart, minorEnd),
        anchorId: `chapter-range-${padChapterNo(minorStart)}-${padChapterNo(minorEnd)}`,
        chapters: minorChapters
      });
    }

    ranges.push({
      key: `${majorStart}-${majorEnd}`,
      start: majorStart,
      end: majorEnd,
      label: formatPaddedRange(majorStart, majorEnd),
      anchorId: `chapter-range-${padChapterNo(majorStart)}-${padChapterNo(majorEnd)}`,
      children
    });
  }

  return ranges;
}

export function DirectoryChapterNavigator({ chapters, categorySlug, novelId }: Props) {
  const router = useRouter();
  const [jumpInput, setJumpInput] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [expandedMajorKey, setExpandedMajorKey] = useState<string | null>(null);
  const [activeMajorKey, setActiveMajorKey] = useState<string | null>(null);
  const [activeMinorKey, setActiveMinorKey] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flashAnchorId, setFlashAnchorId] = useState<string | null>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const userNavigatingRef = useRef(false);

  const firstChapterNo = chapters[0]?.chapterNo;
  const latestChapterNo = chapters[chapters.length - 1]?.chapterNo;
  const rangeTree = useMemo(() => buildRangeTree(chapters), [chapters]);

  useEffect(() => {
    const firstRange = rangeTree[0];
    if (!firstRange) {
      setExpandedMajorKey(null);
      setActiveMajorKey(null);
      setActiveMinorKey(null);
      return;
    }
    setExpandedMajorKey((prev) => prev ?? firstRange.key);
    setActiveMajorKey((prev) => prev ?? firstRange.key);
    setActiveMinorKey((prev) => prev ?? firstRange.children[0]?.key ?? null);
  }, [rangeTree]);

  useEffect(() => {
    if (!flashAnchorId) return;
    const timer = window.setTimeout(() => setFlashAnchorId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [flashAnchorId]);

  useEffect(() => {
    if (!rangeTree.length) return;

    const updateActiveRange = () => {
      if (userNavigatingRef.current) return;

      const viewportTop = window.scrollY + 180;
      let currentMajor: MajorRange | null = rangeTree[0] ?? null;
      let currentMinor: MinorRange | null = rangeTree[0]?.children[0] ?? null;

      for (const major of rangeTree) {
        const majorNode = sectionRefs.current.get(major.anchorId);
        if (majorNode && majorNode.offsetTop <= viewportTop) currentMajor = major;
        for (const minor of major.children) {
          const minorNode = sectionRefs.current.get(minor.anchorId);
          if (minorNode && minorNode.offsetTop <= viewportTop) {
            currentMajor = major;
            currentMinor = minor;
          }
        }
      }

      if (currentMajor) {
        setActiveMajorKey(currentMajor.key);
        setExpandedMajorKey(currentMajor.key);
      }
      if (currentMinor) setActiveMinorKey(currentMinor.key);
    };

    updateActiveRange();
    window.addEventListener("scroll", updateActiveRange, { passive: true });
    window.addEventListener("resize", updateActiveRange);
    return () => {
      window.removeEventListener("scroll", updateActiveRange);
      window.removeEventListener("resize", updateActiveRange);
    };
  }, [rangeTree]);

  function chapterHref(chapterNo: string): string {
    return `/novels/${categorySlug}/${novelId}/chapters/${chapterNo}`;
  }

  function setSectionRef(anchorId: string, node: HTMLElement | null) {
    if (!node) {
      sectionRefs.current.delete(anchorId);
      return;
    }
    sectionRefs.current.set(anchorId, node);
  }

  function scrollToAnchor(anchorId: string) {
    const node = sectionRefs.current.get(anchorId);
    if (!node) return;
    userNavigatingRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlashAnchorId(anchorId);
    window.setTimeout(() => {
      userNavigatingRef.current = false;
    }, 650);
  }

  function onMajorSelect(range: MajorRange) {
    setExpandedMajorKey(range.key);
    setActiveMajorKey(range.key);
    setActiveMinorKey(range.children[0]?.key ?? null);
    scrollToAnchor(range.anchorId);
  }

  function onMinorSelect(parent: MajorRange, range: MinorRange) {
    setExpandedMajorKey(parent.key);
    setActiveMajorKey(parent.key);
    setActiveMinorKey(range.key);
    scrollToAnchor(range.anchorId);
  }

  function onJumpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setJumpError(null);
    const parsed = parseChapterNo(jumpInput);
    if (!parsed) {
      setJumpError("Please enter a valid chapter number.");
      return;
    }
    const normalized = padChapterNo(parsed);
    const exists = chapters.some((item) => item.chapterNo === normalized);
    if (!exists) {
      setJumpError(`Chapter ${normalized} was not found.`);
      return;
    }
    router.push(chapterHref(normalized));
  }

  function renderNavigatorContent() {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm">
        <form onSubmit={onJumpSubmit} className="grid gap-2 border-b border-[var(--border-soft)] pb-4">
          <label className="text-xs font-semibold text-[var(--text-muted)]">Jump to chapter</label>
          <div className="flex gap-2">
            <input
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="e.g. 0007"
              className="w-[117px] rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-deep)]"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent-green)] px-3 py-2 text-sm font-semibold text-white"
            >
              Go
            </button>
          </div>
          {jumpError ? <p className="text-xs text-red-600">{jumpError}</p> : null}
        </form>

        <div className="mt-4 space-y-3">
          {rangeTree.map((major) => {
            const expanded = expandedMajorKey === major.key;
            const active = activeMajorKey === major.key;
            return (
              <div key={major.key} className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-surface)] p-2">
                <button
                  type="button"
                  onClick={() => onMajorSelect(major)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                    active
                      ? "bg-[var(--accent-green)] text-white"
                      : "text-[var(--text-deep)] hover:bg-[#eef7f0]"
                  )}
                >
                  <span>{major.label}</span>
                  <span className={cn("text-xs transition", expanded ? "rotate-0" : "-rotate-90")}>v</span>
                </button>

                {expanded ? (
                  <div className="mt-2 flex flex-wrap gap-2 px-1 pb-1">
                    {major.children.map((minor) => {
                      const minorActive = activeMinorKey === minor.key;
                      return (
                        <button
                          key={minor.key}
                          type="button"
                          onClick={() => onMinorSelect(major, minor)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                            minorActive
                              ? "border-[var(--accent-green)] bg-[#dff7e8] text-[#06783b]"
                              : "border-[var(--border-soft)] bg-white text-[var(--text-soft)] hover:border-[#9cd8b5] hover:bg-[#eef7f0]"
                          )}
                        >
                          {minor.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-full rounded-lg bg-[var(--accent-green)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#06a552]"
          >
            Back to top
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
      <div className="order-2 md:order-1">
        <div className="space-y-5">
          {rangeTree.map((major) => {
            const majorActive = activeMajorKey === major.key;
            const majorFlash = flashAnchorId === major.anchorId;
            return (
              <section
                key={major.key}
                id={major.anchorId}
                ref={(node) => setSectionRef(major.anchorId, node)}
                className={cn(
                  "scroll-mt-24 rounded-2xl border bg-[var(--bg-surface)] p-4 shadow-sm transition",
                  majorActive || majorFlash
                    ? "border-[var(--accent-green)] ring-2 ring-[#b7ebca]"
                    : "border-[var(--border-soft)]"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Chapter Range
                    </p>
                    <h3 className="font-serif text-2xl font-semibold text-[var(--text-deep)]">{major.label}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onMajorSelect(major)}
                    className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-soft)] hover:bg-[#eef7f0]"
                  >
                    Focus
                  </button>
                </div>

                <div className="space-y-4">
                  {major.children.map((minor) => {
                    const minorActive = activeMinorKey === minor.key;
                    const minorFlash = flashAnchorId === minor.anchorId;
                    return (
                      <div
                        key={minor.key}
                        id={minor.anchorId}
                        ref={(node) => setSectionRef(minor.anchorId, node)}
                        className={cn(
                          "scroll-mt-28 rounded-2xl border p-3 transition",
                          minorActive || minorFlash
                            ? "border-[var(--accent-green)] bg-[#f2fbf5] ring-2 ring-[#c8f0d6]"
                            : "border-[var(--border-soft)] bg-white"
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onMinorSelect(major, minor)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-semibold transition",
                              minorActive
                                ? "border-[var(--accent-green)] bg-[var(--accent-green)] text-white"
                                : "border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-soft)] hover:bg-[#eef7f0]"
                            )}
                          >
                            {minor.label}
                          </button>
                          <span className="text-xs text-[var(--text-muted)]">{minor.chapters.length} chapters</span>
                        </div>

                        <ul className="grid gap-3 md:grid-cols-2">
                          {minor.chapters.map((chapter) => (
                            <li key={chapter.chapterNo} className="min-w-0">
                              <Link
                                href={chapterHref(chapter.chapterNo)}
                                className="flex h-full items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 font-serif text-[var(--text-deep)] transition hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
                              >
                                <span className="min-w-0">
                                  <span className="line-clamp-2 block font-medium">
                                    {chapter.chapterNo} - {chapter.title}
                                  </span>
                                  {chapter.wordCount != null && chapter.wordCount > 0 ? (
                                    <span className="mt-0.5 block font-sans text-[11px] text-[var(--text-muted)]">
                                      {chapter.wordCount.toLocaleString("en-US")} words
                                    </span>
                                  ) : null}
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {firstChapterNo === chapter.chapterNo ? (
                                      <span className="rounded-full border border-[#9cd8b5] bg-[#e9f8ef] px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-[#058c46]">
                                        Start
                                      </span>
                                    ) : null}
                                    {latestChapterNo === chapter.chapterNo ? (
                                      <span className="rounded-full border border-[#9cd8b5] bg-[#e9f8ef] px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-[#058c46]">
                                        Latest
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                                <span className="shrink-0 text-sm text-[#058c46]">Read -&gt;</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <aside className="order-1 md:order-2 md:self-start">
        <div className="sticky top-24">
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 text-left shadow-sm"
            >
              <span className="text-sm font-semibold text-[var(--text-deep)]">Chapter Navigator</span>
              <span className="text-xs font-semibold text-[var(--text-soft)]">{mobileOpen ? "Hide" : "Show"}</span>
            </button>
            {mobileOpen ? <div className="mt-3">{renderNavigatorContent()}</div> : null}
          </div>

          <div className="hidden md:block">{renderNavigatorContent()}</div>
        </div>
      </aside>
    </div>
  );
}
