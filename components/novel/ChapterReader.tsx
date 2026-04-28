"use client";

import type { ReactNode } from "react";
import { ReaderPreferences, ReaderThemeProvider } from "@/components/novel/reader-theme";

export function ChapterReader({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 pt-4">
      <ReaderThemeProvider>
        <ReaderPreferences />
        {children}
      </ReaderThemeProvider>
    </div>
  );
}
