"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
  save: () => void;
  dirty: boolean;
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
  const savedBg = useRef("");
  const savedFg = useRef("");
  const savedFs = useRef<number | null>(null);
  useEffect(() => {
    try {
      const rawBg = localStorage.getItem(STORAGE_BG);
      const rawFg = localStorage.getItem(STORAGE_FG);
      const rawFs = localStorage.getItem(STORAGE_FS);
      if (rawBg) {
        setBgState(rawBg);
        savedBg.current = rawBg;
      }
      if (rawFg) {
        setFgState(rawFg);
        savedFg.current = rawFg;
      }
      if (rawFs) {
        const n = Number.parseInt(rawFs, 10);
        if (!Number.isNaN(n)) {
          setFontSizeState(n);
          savedFs.current = n;
        }
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
    },
    []
  );

  const setFg = useCallback(
    (v: string) => {
      setFgState(v);
    },
    []
  );

  const setFontSize = useCallback(
    (v: number | null) => {
      setFontSizeState(v);
    },
    []
  );

  const save = useCallback(() => {
    savedBg.current = bg;
    savedFg.current = fg;
    savedFs.current = fontSize;
    persist(STORAGE_BG, bg || null);
    persist(STORAGE_FG, fg || null);
    persist(STORAGE_FS, fontSize === null ? null : String(fontSize));
  }, [bg, fg, fontSize, persist]);

  const reset = useCallback(() => {
    setBgState("");
    setFgState("");
    setFontSizeState(null);
    savedBg.current = "";
    savedFg.current = "";
    savedFs.current = null;
    persist(STORAGE_BG, null);
    persist(STORAGE_FG, null);
    persist(STORAGE_FS, null);
  }, [persist]);

  const dirty = bg !== savedBg.current || fg !== savedFg.current || fontSize !== savedFs.current;

  const value = useMemo(
    () => ({ bg, fg, fontSize, setBg, setFg, setFontSize, save, dirty, reset }),
    [bg, fg, fontSize, setBg, setFg, setFontSize, save, dirty, reset]
  );

  return (
    <ReaderThemeContext.Provider value={value}>
      <div
        className="reader-themed rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] px-3 py-5 shadow-sm sm:px-6"
        style={{
          ["--reader-fg" as string]: fg || "var(--text-deep)",
          ["--reader-content-font-size" as string]: fontSize ? `${fontSize}px` : "20px",
          backgroundColor: bg || undefined,
          color: fg || undefined
        }}
      >
        {children}
      </div>
    </ReaderThemeContext.Provider>
  );
}

const PRESET_BACKGROUNDS = [
  { label: "Site Default", value: "", fallback: "#f3f6f1" },
  { label: "Eye Comfort Green", value: "#d9e6d2" },
  { label: "Willow Green", value: "#e6f4e8" },
  { label: "Pure Black", value: "#000000" },
  { label: "Pure White", value: "#ffffff" },
  { label: "Cream White", value: "#f5ecd9" }
];

const PRESET_FOREGROUNDS = [
  { label: "Site Default", value: "", fallback: "#0f172a" },
  { label: "Deep Black", value: "#111111" },
  { label: "Soft Gray", value: "#475569" },
  { label: "Pure White", value: "#ffffff" },
  { label: "Willow Green", value: "#2d6a4f" },
  { label: "Cream Brown", value: "#6b4f2d" }
];

const FONT_SIZE_OPTIONS = [
  { label: "Small", value: 20 },
  { label: "Medium", value: 30 },
  { label: "Large", value: 40 }
] as const;

function isPresetColor(value: string, presets: ReadonlyArray<{ value: string }>): boolean {
  return presets.some((preset) => preset.value === value);
}

function swatchOuterClass(selected: boolean): string {
  return selected
    ? "border-[#9cd8b5] bg-[#e9f8ef]"
    : "border-[var(--border-soft)] bg-white hover:bg-[#eef7f0]";
}

export function ReaderPreferences() {
  const { bg, fg, fontSize, setBg, setFg, setFontSize, save, dirty, reset } = useReaderTheme();
  const bgPresetSelected = isPresetColor(bg, PRESET_BACKGROUNDS);
  const fgPresetSelected = isPresetColor(fg, PRESET_FOREGROUNDS);
  const activeFontSize = fontSize ?? 20;

  return (
    <section
      className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-900/15 bg-white/70 p-3 text-sm text-slate-800 shadow-sm backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-4"
      aria-label="Reading preferences"
    >
      <div className="flex items-center gap-2">
        <span className="text-slate-600">Background</span>
        <div className="flex items-center gap-1.5">
          {PRESET_BACKGROUNDS.map((item) => {
            const selected = bg === item.value;
            return (
              <button
                key={`bg-${item.label}`}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setBg(item.value)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border p-0.5 transition ${swatchOuterClass(selected)}`}
              >
                <span
                  className="block h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: item.value || item.fallback }}
                />
              </button>
            );
          })}
          <label
            title="Custom Color"
            aria-label="Custom Color"
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border p-0.5 transition ${swatchOuterClass(!bgPresetSelected && !!bg)}`}
          >
            <span
              className="block h-5 w-5 rounded-full border border-black/10"
              style={{
                background: !bgPresetSelected && bg
                  ? bg
                  : "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ef4444)"
              }}
            />
            <input
              type="color"
              aria-label="Custom background color"
              className="sr-only"
              value={bg?.startsWith("#") && bg.length >= 4 ? bg : "#f3f6f1"}
              onChange={(e) => setBg(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-600">Text Color</span>
        <div className="flex items-center gap-1.5">
          {PRESET_FOREGROUNDS.map((item) => {
            const selected = fg === item.value;
            return (
              <button
                key={`fg-${item.label}`}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setFg(item.value)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border p-0.5 transition ${swatchOuterClass(selected)}`}
              >
                <span
                  className="block h-5 w-5 rounded-full border border-black/10"
                  style={{ backgroundColor: item.value || item.fallback }}
                />
              </button>
            );
          })}
          <label
            title="Custom Color"
            aria-label="Custom Color"
            className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border p-0.5 transition ${swatchOuterClass(!fgPresetSelected && !!fg)}`}
          >
            <span
              className="block h-5 w-5 rounded-full border border-black/10"
              style={{
                background: !fgPresetSelected && fg
                  ? fg
                  : "conic-gradient(from 0deg, #ef4444, #f59e0b, #10b981, #3b82f6, #a855f7, #ef4444)"
              }}
            />
            <input
              type="color"
              aria-label="Custom text color"
              className="sr-only"
              value={fg?.startsWith("#") && fg.length >= 4 ? fg : "#111827"}
              onChange={(e) => setFg(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-600">Font Size</span>
        <div className="inline-flex rounded-lg border border-[var(--border-soft)] bg-white p-1">
          {FONT_SIZE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setFontSize(option.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold",
                activeFontSize === option.value
                  ? "bg-[var(--accent-green)] text-white"
                  : "text-[var(--text-soft)] hover:bg-[#eef7f0]"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!dirty}
        className="rounded-lg bg-emerald-800 px-3 py-1.5 font-medium text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        Save
      </button>
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
