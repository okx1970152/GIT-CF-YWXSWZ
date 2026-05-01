"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_NAV } from "@/lib/content/categories";
import { cn } from "@/lib/cn";
import { SearchBar } from "@/components/site/SearchBar";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const [hideImageAds, setHideImageAds] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const activeCategory =
    segments[0] === "category"
      ? segments[1]
      : segments[0] === "novels"
        ? segments[1]
        : null;

  useEffect(() => {
    const hasCookie = document.cookie.split("; ").some((token) => token === "hide_image_ads=1");
    setHideImageAds(hasCookie);
  }, []);

  function toggleImageAds() {
    const next = !hideImageAds;
    document.cookie = `hide_image_ads=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setHideImageAds(next);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]",
              isHome
                ? "border-[#9cd8b5] bg-[#e9f8ef] text-[#058c46]"
                : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-deep)] hover:bg-[#ddeedd]"
            )}
          >
            Home
          </Link>
          <SearchBar className={cn("w-full lg:hidden")} />
        </div>
        <nav
          aria-label="Main"
          className="scrollbar-hide -mx-1 flex items-center gap-2 overflow-x-auto px-1 text-sm font-medium"
        >
          {CATEGORY_NAV.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]",
                  active
                    ? "border-[#9cd8b5] bg-[#e9f8ef] text-[#058c46]"
                    : "border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-soft)] hover:bg-[#ddeedd] hover:text-[var(--text-deep)]"
                )}
            >
              {cat.label}
            </Link>
            );
          })}
          <button
            type="button"
            onClick={toggleImageAds}
            className="shrink-0 rounded-lg bg-[var(--accent-green)] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
          >
            {hideImageAds ? "Open Ads" : "Close Ads"}
          </button>
        </nav>
        <SearchBar className={cn("hidden lg:flex lg:w-auto lg:max-w-[320px]")} />
      </div>
    </header>
  );
}
