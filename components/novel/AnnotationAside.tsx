"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type AnnotationAsideProps = {
  title: string;
  guideHtml: string;
  relatedTopicsSlot: ReactNode;
  slotTop: ReactNode;
  slotMid: ReactNode;
  slotBottom: ReactNode;
};

export function AnnotationAside({
  title,
  guideHtml,
  relatedTopicsSlot,
  slotTop,
  slotMid,
  slotBottom
}: AnnotationAsideProps) {
  const [open, setOpen] = useState(false);
  const panelId = "essential-guide-panel";

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-3 text-left font-serif text-base font-semibold text-[var(--text-deep)] shadow-sm lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Reading Guide Decoding</span>
        <span className="text-sm font-normal text-slate-600">{open ? "Hide" : "Show"}</span>
      </button>

      <aside
        id={panelId}
        className={cn(
          "annotation-box overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-sm transition-all duration-300 lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto",
          open ? "max-h-[2200px] opacity-100" : "max-h-0 border-transparent p-0 opacity-0",
          "lg:max-h-[calc(100vh-7rem)] lg:opacity-100 lg:p-4 lg:border-[var(--border-soft)]"
        )}
        aria-label="Annotation track"
      >
        {slotTop}
        <p className="mb-2 inline-flex items-center rounded-full border border-[#9cd8b5] bg-[#e9f8ef] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#058c46]">
          Reading Guide Decoding
        </p>
        <h2 className="font-serif text-[30px] font-semibold leading-tight text-[var(--text-deep)]">{title}</h2>
        <div
          className="prose mt-4 max-w-none font-serif leading-relaxed text-inherit prose-headings:text-[var(--text-deep)] prose-p:text-[var(--text-soft)]"
          style={{ fontSize: "var(--reader-content-font-size, 20px)" }}
          dangerouslySetInnerHTML={{ __html: guideHtml }}
        />
        {slotMid}
        {relatedTopicsSlot}
        {slotBottom}
      </aside>
    </div>
  );
}
