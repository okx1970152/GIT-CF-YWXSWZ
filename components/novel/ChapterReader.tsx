"use client";

import type { ReactNode } from "react";
import { ReaderPreferences, ReaderThemeProvider } from "@/components/novel/reader-theme";

export function ChapterReader({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-4 sm:px-4">
      <ReaderThemeProvider>
        <ReaderPreferences />
        <div className="mt-3">{children}</div>
      </ReaderThemeProvider>
    </div>
  );
}
