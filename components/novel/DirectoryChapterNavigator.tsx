"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChapterItem } from "@/lib/content/chapters";
import { padChapterNo } from "@/lib/content/chapters";
import { cn } from "@/lib/cn";

type Props = {
  chapters: ChapterItem[];
  categorySlug: string;
  novelId: string;
};

type RangeOption = { start: number; end: number; label: string };
const PAGE_SIZE = 50;

function parseChapterNo(input: string): number | null {
  const n = Number.parseInt(input.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buildRanges(maxNo: number, step: number): RangeOption[] {
  const ranges: RangeOption[] = [];
  for (let start = 1; start <= maxNo; start += step) {
    const end = Math.min(start + step - 1, maxNo);
    ranges.push({ start, end, label: `${start}-${end}` });
  }
  return ranges;
}

export function DirectoryChapterNavigator({ chapters, categorySlug, novelId }: Props) {
  const router = useRouter();
  const [jumpInput, setJumpInput] = useState("");
  const [activeRange, setActiveRange] = useState<{ start: number; end: number } | null>(null);
  const [range10Value, setRange10Value] = useState("");
  const [range100Value, setRange100Value] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageNo, setPageNo] = useState(1);
  const [jumpError, setJumpError] = useState<string | null>(null);

  const maxChapterNo = useMemo(() => {
    return chapters.reduce((max, item) => {
      const n = Number.parseInt(item.chapterNo, 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
  }, [chapters]);

  const range10Options = useMemo(() => buildRanges(maxChapterNo, 10), [maxChapterNo]);
  const range100Options = useMemo(() => buildRanges(maxChapterNo, 100), [maxChapterNo]);

  const filteredAndSorted = useMemo(() => {
    const filtered = activeRange
      ? chapters.filter((chapter) => {
          const n = Number.parseInt(chapter.chapterNo, 10);
          return Number.isFinite(n) && n >= activeRange.start && n <= activeRange.end;
        })
      : chapters;
    const sorted = [...filtered].sort((a, b) =>
      sortOrder === "asc"
        ? a.chapterNo.localeCompare(b.chapterNo)
        : b.chapterNo.localeCompare(a.chapterNo)
    );
    return sorted;
  }, [chapters, activeRange, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const pageOptions = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, idx) => ({
        value: idx + 1,
        label: `Page ${idx + 1}`
      })),
    [totalPages]
  );

  useEffect(() => {
    setPageNo(1);
  }, [activeRange, sortOrder, chapters.length]);

  useEffect(() => {
    if (pageNo > totalPages) {
      setPageNo(totalPages);
    }
  }, [pageNo, totalPages]);

  const pagedChapters = useMemo(() => {
    const start = (pageNo - 1) * PAGE_SIZE;
    return filteredAndSorted.slice(start, start + PAGE_SIZE);
  }, [filteredAndSorted, pageNo]);
  const showingStart = filteredAndSorted.length ? (pageNo - 1) * PAGE_SIZE + 1 : 0;
  const showingEnd = filteredAndSorted.length ? Math.min(pageNo * PAGE_SIZE, filteredAndSorted.length) : 0;

  const firstChapterNo = chapters[0]?.chapterNo;
  const latestChapterNo = chapters[chapters.length - 1]?.chapterNo;

  function chapterHref(chapterNo: string): string {
    return `/novels/${categorySlug}/${novelId}/chapters/${chapterNo}`;
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

  function applyRange(value: string, step: 10 | 100) {
    if (!value) {
      setActiveRange(null);
      if (step === 10) setRange10Value("");
      if (step === 100) setRange100Value("");
      return;
    }
    const [startRaw, endRaw] = value.split("-");
    const start = Number.parseInt(startRaw, 10);
    const end = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    setActiveRange({ start, end });
    if (step === 10) {
      setRange10Value(value);
      setRange100Value("");
    } else {
      setRange100Value(value);
      setRange10Value("");
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1.5fr)_minmax(140px,1fr)_minmax(160px,1fr)_minmax(130px,0.8fr)_auto]">
          <form onSubmit={onJumpSubmit} className="grid gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">Jump to chapter</label>
            <div className="flex gap-2">
              <input
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder="e.g. 123"
                className="w-full rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-deep)]"
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

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">Range by 10</label>
            <select
              value={range10Value}
              onChange={(e) => applyRange(e.target.value, 10)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-deep)]"
            >
              <option value="">All chapters</option>
              {range10Options.map((opt) => (
                <option key={`10-${opt.label}`} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">Range by 100</label>
            <select
              value={range100Value}
              onChange={(e) => applyRange(e.target.value, 100)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-deep)]"
            >
              <option value="">All chapters</option>
              {range100Options.map((opt) => (
                <option key={`100-${opt.label}`} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">Page</label>
            <select
              value={String(pageNo)}
              onChange={(e) => setPageNo(Number.parseInt(e.target.value, 10) || 1)}
              className="rounded-lg border border-[var(--border-soft)] bg-white px-3 py-2 text-sm text-[var(--text-deep)]"
            >
              {pageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Order</span>
            <div className="inline-flex rounded-lg border border-[var(--border-soft)] bg-white p-1">
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold",
                  sortOrder === "asc"
                    ? "bg-[var(--accent-green)] text-white"
                    : "text-[var(--text-soft)] hover:bg-[#eef7f0]"
                )}
              >
                Asc
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold",
                  sortOrder === "desc"
                    ? "bg-[var(--accent-green)] text-white"
                    : "text-[var(--text-soft)] hover:bg-[#eef7f0]"
                )}
              >
                Desc
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Showing {showingStart}-{showingEnd} of {filteredAndSorted.length} chapters (total {chapters.length})
      </p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pagedChapters.map((chapter) => (
          <li key={chapter.chapterNo} className="min-w-0">
            <Link
              href={chapterHref(chapter.chapterNo)}
              className="flex h-full items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 font-serif text-[var(--text-deep)] hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
            >
              <span className="min-w-0">
                <span className="line-clamp-2 block font-medium">
                  {chapter.chapterNo} — {chapter.title}
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
              <span className="shrink-0 text-sm text-[#058c46]">Read →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
