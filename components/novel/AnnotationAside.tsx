"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ShareAndFavoriteBar } from "@/components/novel/ShareAndFavoriteBar";
import { LORE_JUMP_EVENT } from "@/components/novel/LoreHoverLayer";
import type { CulturalNotesFaqItem } from "@/lib/content/meta";

type AnnotationAsideProps = {
  title: string;
  guideHtml: string;
  relatedTopicsSlot: ReactNode;
  slotTop: ReactNode;
  slotMid: ReactNode;
  slotBottom: ReactNode;
  /** 与 meta cultural_notes_faq / FAQPage JSON-LD 同源（须先 sanitize） */
  culturalNotesFaq?: CulturalNotesFaqItem[];
  /** Current chapter share (absolute URL + title) */
  shareUrl?: string;
  shareTitle?: string;
};

export function AnnotationAside({
  title,
  guideHtml,
  relatedTopicsSlot,
  slotTop,
  slotMid,
  slotBottom,
  culturalNotesFaq,
  shareUrl,
  shareTitle
}: AnnotationAsideProps) {
  const [open, setOpen] = useState(false);
  const panelId = "essential-guide-panel";

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (!id || typeof id !== "string") return;
      setOpen(true);
      requestAnimationFrame(() => {
        const panel = document.getElementById(panelId);
        const target = panel?.querySelector(`#${CSS.escape(id)}`);
        target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };
    window.addEventListener(LORE_JUMP_EVENT, handler);
    return () => window.removeEventListener(LORE_JUMP_EVENT, handler);
  }, []);

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
          open ? "max-h-[2200px] overflow-y-auto opacity-100" : "max-h-0 border-transparent p-0 opacity-0",
          "lg:max-h-[calc(100vh-7rem)] lg:opacity-100 lg:p-4 lg:border-[var(--border-soft)]"
        )}
        aria-label="Annotation track"
      >
        {shareUrl && shareTitle ? (
          <div className="mb-4 w-full max-w-[460px] lg:mx-0">
            <ShareAndFavoriteBar
              shareUrl={shareUrl}
              shareTitle={shareTitle}
              variant="compact"
              className="justify-center sm:justify-start"
            />
          </div>
        ) : null}
        <div className="mb-3 flex w-full justify-center">
          <span className="inline-flex items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-2 text-center font-sans text-sm font-semibold text-[var(--text-deep)] shadow-sm">
            Reading Guide Decoding
          </span>
        </div>
        {slotTop}
        <h2 className="font-serif text-[30px] font-semibold leading-tight text-[var(--text-deep)]">{title}</h2>
        <div
          className="prose mt-4 max-w-none font-serif leading-relaxed text-inherit prose-headings:text-[var(--text-deep)] prose-p:text-[var(--text-soft)] [&_p]:!text-[length:inherit] [&_li]:!text-[length:inherit] [&_ul]:!text-[length:inherit] [&_ol]:!text-[length:inherit] [&_blockquote]:!text-[length:inherit] [&_h1]:!text-[length:inherit] [&_h2]:!text-[length:inherit] [&_h3]:!text-[length:inherit] [&_h4]:!text-[length:inherit]"
          style={{ fontSize: "var(--reader-content-font-size, 20px)" }}
          dangerouslySetInnerHTML={{ __html: guideHtml }}
        />
        {slotMid}
        {relatedTopicsSlot}
        {culturalNotesFaq && culturalNotesFaq.length > 0 ? (
          <section
            className="mt-8 border-t-2 border-[var(--accent-green)]/35 pt-6"
            aria-labelledby="cultural-notes-faq-heading"
          >
            <h3
              id="cultural-notes-faq-heading"
              className="font-serif text-xl font-semibold tracking-tight text-[var(--text-deep)]"
            >
              Quick Q&A
            </h3>
            <p className="mt-1 font-sans text-sm leading-snug text-[var(--text-muted)]">
              Lore recap (TL;DR) drawn from this chapter&apos;s Cultural / Xianxia Notes — same text
              as the FAQ structured data on this page.
            </p>
            <dl className="mt-5 space-y-5">
              {culturalNotesFaq.map((item, index) => (
                <div key={`cultural-faq-${index}`}>
                  <dt
                    className="font-serif font-bold text-[var(--text-deep)]"
                    style={{ fontSize: "var(--reader-content-font-size, 20px)" }}
                  >
                    {item.q}
                  </dt>
                  <dd
                    className="mt-2 font-serif leading-relaxed text-[var(--text-soft)]"
                    style={{ fontSize: "var(--reader-content-font-size, 20px)" }}
                  >
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {slotBottom}
      </aside>
    </div>
  );
}
