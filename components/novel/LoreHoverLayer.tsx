"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type LorePreviewMap = Record<string, { title: string; preview: string }>;

const FALLBACK_PREVIEW = "Open the guide for the full explanation.";

/** 侧栏监听：展开移动端面板并滚动到对应 h2#id */
export const LORE_JUMP_EVENT = "lore-jump-to-section";

export function LoreHoverLayer({
  lorePreviews,
  children
}: {
  lorePreviews: LorePreviewMap;
  children: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setActiveId(null), 220);
  }, [clearCloseTimer]);

  const showForEl = useCallback(
    (el: HTMLElement, id: string) => {
      clearCloseTimer();
      const r = el.getBoundingClientRect();
      const cardW = 300;
      const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - cardW - 8));
      setPos({ top: r.bottom + 8, left });
      setActiveId(id);
    },
    [clearCloseTimer]
  );

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const onOver = (e: MouseEvent) => {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = (e.target as HTMLElement | null)?.closest?.("[data-lore-id]");
      if (!el || !root.contains(el)) return;
      const id = el.getAttribute("data-lore-id");
      if (id) showForEl(el as HTMLElement, id);
    };

    const onOut = (e: MouseEvent) => {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const related = e.relatedTarget as Node | null;
      if (cardRef.current?.contains(related)) return;
      const from = (e.target as HTMLElement | null)?.closest?.("[data-lore-id]");
      if (from && root.contains(from)) scheduleClose();
    };

    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseout", onOut);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseout", onOut);
      clearCloseTimer();
    };
  }, [showForEl, scheduleClose, clearCloseTimer]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const onTap = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) return;
      const el = (e.target as HTMLElement | null)?.closest?.("[data-lore-id]");
      if (!el || !root.contains(el)) return;
      const id = el.getAttribute("data-lore-id");
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      if (activeId === id) setActiveId(null);
      else showForEl(el as HTMLElement, id);
    };

    root.addEventListener("pointerdown", onTap);
    return () => root.removeEventListener("pointerdown", onTap);
  }, [activeId, showForEl]);

  useEffect(() => {
    if (!activeId) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (cardRef.current?.contains(t)) return;
      setActiveId(null);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [activeId]);

  const jump = () => {
    if (!activeId) return;
    window.dispatchEvent(new CustomEvent(LORE_JUMP_EVENT, { detail: { id: activeId }, bubbles: true }));
    setActiveId(null);
  };

  const entry = activeId ? lorePreviews[activeId] : undefined;
  const previewText =
    entry?.preview?.trim() || (activeId ? FALLBACK_PREVIEW : "");

  const card =
    mounted && activeId ? (
      <div
        ref={cardRef}
        role="tooltip"
        className="fixed z-[90] w-[min(300px,calc(100vw-16px))] rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-3 shadow-lg"
        style={{ top: pos.top, left: pos.left }}
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        {entry?.title ? (
          <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {entry.title}
          </p>
        ) : null}
        <p className="font-serif text-sm leading-relaxed text-[var(--text-soft)]">{previewText}</p>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-2 text-center font-sans text-sm font-medium text-[var(--text-deep)] hover:bg-[var(--bg-card)]"
          onClick={jump}
        >
          View in guide
        </button>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="min-w-0">
      {children}
      {card ? createPortal(card, document.body) : null}
    </div>
  );
}
