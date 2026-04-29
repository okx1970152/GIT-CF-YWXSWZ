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
      <div className="group relative h-[180px] overflow-hidden rounded-2xl border border-[var(--border-soft)] sm:h-[240px]">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <h1 className="font-serif text-[50px] font-bold leading-tight text-[var(--text-deep)]">
            Xianxia Unveiled - Fellow Daoist, Please Stay!
          </h1>
          <p className="mt-2 font-serif text-[25px] leading-tight text-[var(--text-soft)]">
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
