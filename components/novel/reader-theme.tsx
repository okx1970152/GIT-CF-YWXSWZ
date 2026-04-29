"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

const STORAGE_BG = "novelReaderBg";
const STORAGE_FG = "novelReaderFg";
const STORAGE_FS = "novelReaderFontPx";

type ReaderThemeState = {
  bg: string;
  fg: string;
  fontSize: number | null;
  setBg: (v: string) => void;
  setFg: (v: string) => void;
  setFontSize: (v: number | null) => void;
  reset: () => void;
};

const ReaderThemeContext = createContext<ReaderThemeState | null>(null);

export function useReaderTheme(): ReaderThemeState {
  const ctx = useContext(ReaderThemeContext);
  if (!ctx) throw new Error("useReaderTheme must be used within ReaderThemeProvider");
  return ctx;
}

export function ReaderThemeProvider({ children }: { children: ReactNode }) {
  const [bg, setBgState] = useState("");
  const [fg, setFgState] = useState("");
  const [fontSize, setFontSizeState] = useState<number | null>(null);
  useEffect(() => {
    try {
      const rawBg = localStorage.getItem(STORAGE_BG);
      const rawFg = localStorage.getItem(STORAGE_FG);
      const rawFs = localStorage.getItem(STORAGE_FS);
      if (rawBg) setBgState(rawBg);
      if (rawFg) setFgState(rawFg);
      if (rawFs) {
        const n = Number.parseInt(rawFs, 10);
        if (!Number.isNaN(n)) setFontSizeState(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((key: string, value: string | null) => {
    try {
      if (value === null || value === "") localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const setBg = useCallback(
    (v: string) => {
      setBgState(v);
      persist(STORAGE_BG, v);
    },
    [persist]
  );

  const setFg = useCallback(
    (v: string) => {
      setFgState(v);
      persist(STORAGE_FG, v);
    },
    [persist]
  );

  const setFontSize = useCallback(
    (v: number | null) => {
      setFontSizeState(v);
      if (v === null) persist(STORAGE_FS, null);
      else persist(STORAGE_FS, String(v));
    },
    [persist]
  );

  const reset = useCallback(() => {
    setBgState("");
    setFgState("");
    setFontSizeState(null);
    persist(STORAGE_BG, null);
    persist(STORAGE_FG, null);
    persist(STORAGE_FS, null);
  }, [persist]);

  const value = useMemo(
    () => ({ bg, fg, fontSize, setBg, setFg, setFontSize, reset }),
    [bg, fg, fontSize, setBg, setFg, setFontSize, reset]
  );

  return (
    <ReaderThemeContext.Provider value={value}>
      <div
        className="reader-themed rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-5 shadow-sm sm:px-6"
        style={{
          backgroundColor: bg || undefined,
          color: fg || undefined,
          fontSize: fontSize ? `${fontSize}px` : undefined
        }}
      >
        {children}
      </div>
    </ReaderThemeContext.Provider>
  );
}

const PRESET_BACKGROUNDS = [
  { label: "Willow", value: "#f5faf4" },
  { label: "Page", value: "#f7f5f0" },
  { label: "Night", value: "#0f172a" },
  { label: "Sepia", value: "#f4ecd8" }
];

const PRESET_FOREGROUNDS = [
  { label: "Default", value: "" },
  { label: "Ink", value: "#111827" },
  { label: "Soft", value: "#e2e8f0" }
];

export function ReaderPreferences() {
  const { bg, fg, fontSize, setBg, setFg, setFontSize, reset } = useReaderTheme();

  return (
    <section
      className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-900/15 bg-white/70 p-3 text-sm text-slate-800 shadow-sm backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center"
      aria-label="Reading preferences"
    >
      <span className="font-medium text-emerald-950">Reading</span>
      <label className="flex items-center gap-2">
        <span className="text-slate-600">Background</span>
        <select
          className="rounded-md border border-emerald-900/20 bg-white px-2 py-1 text-sm"
          value={PRESET_BACKGROUNDS.some((p) => p.value === bg) ? bg : bg ? "__custom__" : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") return;
            setBg(v);
          }}
        >
          <option value="">Site default</option>
          {PRESET_BACKGROUNDS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="__custom__">Custom (use picker)</option>
        </select>
        <input
          type="color"
          aria-label="Custom background color"
          className="h-8 w-12 cursor-pointer rounded border border-emerald-900/20 bg-white p-0"
          value={bg?.startsWith("#") && bg.length >= 4 ? bg : "#f7f5f0"}
          onChange={(e) => setBg(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-slate-600">Text</span>
        <select
          className="rounded-md border border-emerald-900/20 bg-white px-2 py-1 text-sm"
          value={PRESET_FOREGROUNDS.some((p) => p.value === fg) ? fg : fg ? "__custom__" : ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") return;
            setFg(v);
          }}
        >
          <option value="">Default</option>
          {PRESET_FOREGROUNDS.filter((p) => p.value).map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="__custom__">Custom (picker)</option>
        </select>
        <input
          type="color"
          aria-label="Custom text color"
          className="h-8 w-12 cursor-pointer rounded border border-emerald-900/20 bg-white p-0"
          value={fg?.startsWith("#") && fg.length >= 4 ? fg : "#111827"}
          onChange={(e) => setFg(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="text-slate-600">Font size</span>
        <input
          type="range"
          min={16}
          max={26}
          step={1}
          value={fontSize ?? 20}
          onChange={(e) => setFontSize(Number.parseInt(e.target.value, 10))}
          className="w-36"
        />
        <span className="tabular-nums text-slate-600">{fontSize ?? 20}px</span>
      </label>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg border border-emerald-900/25 bg-[#f3f6f1] px-3 py-1.5 font-medium text-emerald-950 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Reset
      </button>
    </section>
  );
}
