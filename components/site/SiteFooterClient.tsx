"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CONTACT_EMAIL, FRIEND_LINKS, SITE_BRAND } from "@/components/site/footer-constants";
import type { SiteFooterProps } from "@/components/site/site-footer-types";

const TOAST_MS = 7000;

function legalLead(props: SiteFooterProps): string {
  switch (props.variant) {
    case "category":
      return `All ${props.categoryLabel ?? "category"} novels featured on ${SITE_BRAND} are contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
    case "directory":
      return `All chapter content for “${props.novelTitle ?? "this novel"}” on ${SITE_BRAND} is generously contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
    case "reading":
      return `All chapter content for “${props.novelTitle ?? "this novel"}” on ${SITE_BRAND} is contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
    case "search":
    case "home":
    default:
      return `All novel works featured on ${SITE_BRAND} are contributed by readers or reproduced from other websites; copyright remains with the original authors. If you believe your rights have been infringed, please contact us and we will remove the relevant material without delay.`;
  }
}

export function SiteFooterClient(props: SiteFooterProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      setToast("Could not access the clipboard. Please copy the address manually: " + CONTACT_EMAIL);
      return;
    }
    setToast(
      `Copied ${CONTACT_EMAIL}. You can paste it into your email to reach us — we usually reply within 24 hours.`
    );
  }, []);

  return (
    <footer className="mt-12 w-full border-t border-[var(--border-soft)] bg-[var(--bg-surface)]/95">
      <div className="mx-auto max-w-[1400px] px-3 py-10 sm:px-4">
        <h2 className="text-center font-sans text-sm font-semibold tracking-wide text-[var(--text-deep)]">
          Friend links (see contact email in footer)
        </h2>

        <div className="mt-6 flex justify-center overflow-x-auto pb-1 sm:justify-start">
          <div className="flex min-w-0 flex-nowrap items-stretch justify-start gap-2">
            {FRIEND_LINKS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${item.label}`}
                className="inline-flex shrink-0 min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-deep)] shadow-sm transition hover:border-[#9cd8b5] hover:bg-[#e9f8ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
              >
                {!broken[item.id] ? (
                  <Image
                    src={item.icon}
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 shrink-0 object-contain"
                    unoptimized
                    onError={() => setBroken((b) => ({ ...b, [item.id]: true }))}
                  />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#dcefdc] text-[10px] font-bold text-[var(--text-deep)]">
                    {item.label.slice(0, 1)}
                  </span>
                )}
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-dashed border-[var(--border-soft)] pt-8">
          <p className="font-sans text-sm leading-relaxed text-[var(--text-soft)]">{legalLead(props)}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2 font-sans text-xs text-[var(--text-muted)] sm:text-sm">
            <span>Copyright 2026 – {SITE_BRAND}</span>
            <span className="text-[var(--border-soft)]" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={copyEmail}
              className="font-medium text-[#058c46] underline decoration-[#9cd8b5] underline-offset-2 hover:text-[#047038]"
            >
              Contact email: {CONTACT_EMAIL}
            </button>
            <span className="text-[var(--border-soft)]" aria-hidden>
              |
            </span>
            <button
              type="button"
              onClick={copyEmail}
              className="font-medium text-[#058c46] underline decoration-[#9cd8b5] underline-offset-2 hover:text-[#047038]"
            >
              Request author access
            </button>
            <span className="text-[var(--border-soft)]" aria-hidden>
              |
            </span>
            <span>Free online reading</span>
          </p>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-[200] max-w-[min(100vw-2rem,28rem)] -translate-x-1/2 rounded-xl border border-[#9cd8b5] bg-[#0f2e1f] px-4 py-3 text-center text-sm leading-snug text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </footer>
  );
}
