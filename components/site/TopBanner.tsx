"use client";

import { usePathname } from "next/navigation";

/**
 * 全站顶部动态背景横幅：
 * - 默认显示图1
 * - 鼠标移入后平滑切换图2
 * - 正文阅读页与后台页隐藏
 */
export function TopBanner() {
  const pathname = usePathname();

  const isReadingPage = pathname.includes("/chapters/");
  const isAdminPage = pathname.startsWith("/admin");

  if (isReadingPage || isAdminPage) {
    return null;
  }

  return (
    <section className="mx-auto mt-3 w-full max-w-[1400px] px-3 sm:mt-4 sm:px-4" aria-label="Site hero banner">
      <div className="group relative h-[220px] overflow-hidden rounded-2xl border border-[var(--border-soft)] sm:h-[240px]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-300 ease-out"
          style={{ backgroundImage: "url('/top-banner-1.png')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          style={{ backgroundImage: "url('/top-banner-2.png')" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#e8f3e8]/35 via-transparent to-[#e8f3e8]/15" aria-hidden />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="max-w-[12ch] text-balance font-serif text-[32px] font-bold leading-[1.08] text-[var(--text-deep)] sm:max-w-none sm:text-[50px] sm:leading-tight">
            Xianxia Unveiled - Fellow Daoist, Please Stay!
          </h1>
          <p className="mt-2 max-w-[22ch] text-balance font-serif text-[16px] leading-[1.2] text-[var(--text-soft)] sm:max-w-none sm:text-[25px] sm:leading-tight">
            The Intelligence Hub for Eastern Wuxia &amp; Xianxia Worlds.
          </p>
        </div>
        <p className="sr-only">
          Eastern fantasy reading portal banner. Hover transition switches between two themed images.
        </p>
      </div>
    </section>
  );
}
