"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORY_NAV } from "@/lib/content/categories";
import { SearchBar } from "@/components/site/SearchBar";

const categoryInactive =
  "shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm font-medium text-[var(--text-soft)] transition hover:bg-[#ddeedd] hover:text-[var(--text-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]";

const categoryActive =
  "relative z-[2] -mb-px shrink-0 rounded-full border border-[var(--accent-green)] bg-[var(--accent-green)] px-3 py-1.5 text-sm font-bold text-white shadow-[0_1px_0_0_var(--bg-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]";

const homeInactive =
  "shrink-0 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-deep)] transition hover:bg-[#ddeedd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]";

const homeActive =
  "shrink-0 rounded-lg border border-[var(--accent-green)] bg-[var(--accent-green)] px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]";

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

  const categoryRail = (
    <nav
      aria-label="Categories"
      className="scrollbar-hide relative -mx-1 flex w-full min-w-0 flex-wrap items-end justify-center gap-2 border-b border-[var(--border-soft)] px-1 pb-3 pt-1 text-sm"
    >
      {CATEGORY_NAV.map((cat) => {
        const active = activeCategory === cat.slug;
        return (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            className={active ? categoryActive : categoryInactive}
          >
            {cat.label}
          </Link>
        );
      })}
    </nav>
  );

  const tools = (
    <div className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
      <Link href="/" className={isHome ? homeActive : homeInactive}>
        Home
      </Link>
      <SearchBar className="max-w-[min(100vw-10rem,280px)] shrink sm:max-w-[300px] lg:max-w-[320px]" />
      <button
        type="button"
        onClick={toggleImageAds}
        className="shrink-0 rounded-lg bg-[var(--accent-green)] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#06a552] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-green)]"
      >
        {hideImageAds ? "Open Ads" : "Close Ads"}
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--bg-surface)]/95 backdrop-blur">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Mobile / tablet: categories row, then tools */}
        <div className="flex flex-col gap-3 lg:hidden">
          {categoryRail}
          {tools}
        </div>

        {/* Desktop: spacer | centered categories | right tools */}
        <div className="hidden items-end gap-4 lg:flex">
          <div className="min-w-0 flex-1" aria-hidden />
          <div className="flex w-full min-w-0 flex-[1.4] justify-center px-1">
            {categoryRail}
          </div>
          <div className="flex min-w-0 flex-1 justify-end pb-3">{tools}</div>
        </div>
      </div>
    </header>
  );
}
