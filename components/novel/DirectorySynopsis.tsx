"use client";

import { useMemo, useState } from "react";

const DEFAULT_COLLAPSED_CHARS = 459;

function truncateForPreview(text: string, maxChars: number): { preview: string; needsExpand: boolean } {
  const t = text.trim();
  if (!t) return { preview: "", needsExpand: false };
  if (t.length <= maxChars) return { preview: t, needsExpand: false };
  const slice = t.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace > Math.floor(maxChars * 0.55) ? slice.slice(0, lastSpace).trimEnd() : slice.trimEnd();
  return { preview: `${cut}...`, needsExpand: true };
}

type DirectorySynopsisProps = {
  summary: string;
  collapsedChars?: number;
};

export function DirectorySynopsis({ summary, collapsedChars = DEFAULT_COLLAPSED_CHARS }: DirectorySynopsisProps) {
  const [expanded, setExpanded] = useState(false);

  const { preview, needsExpand } = useMemo(
    () => truncateForPreview(summary, collapsedChars),
    [summary, collapsedChars]
  );

  if (!summary.trim()) return null;

  return (
    <div className="font-serif text-lg leading-relaxed text-[var(--text-soft)]">
      <p className="whitespace-pre-wrap">{expanded ? summary.trim() : preview}</p>
      {needsExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center font-sans text-sm font-semibold text-[var(--accent-green)] underline decoration-[var(--accent-green)] decoration-2 underline-offset-2 hover:text-[#059669] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </div>
  );
}
