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

  return (
    <div className="min-w-0">
      <button
        type="button"
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-emerald-900/15 bg-white/90 px-4 py-3 text-left font-serif text-base font-semibold text-emerald-950 shadow-sm lg:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Essential Guide</span>
        <span className="text-sm font-normal text-slate-600">{open ? "Hide" : "Show"}</span>
      </button>

      <aside
        className={cn(
          "annotation-box rounded-2xl border border-emerald-900/10 bg-white/95 p-4 shadow-sm lg:sticky lg:top-28 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto",
          open ? "block" : "hidden"
        )}
        aria-label="Annotation track"
      >
        {slotTop}
        <h2 className="font-serif text-xl font-semibold text-emerald-950">{title}</h2>
        <div
          className="prose prose-sm mt-4 max-w-none prose-slate font-serif leading-relaxed text-inherit"
          dangerouslySetInnerHTML={{ __html: guideHtml }}
        />
        {slotMid}
        {relatedTopicsSlot}
        {slotBottom}
      </aside>
    </div>
  );
}
