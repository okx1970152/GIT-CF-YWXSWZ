import type { ReactNode } from "react";
import type { AdItemConfig, AdSlotConfig } from "@/lib/ads/schema";
import { getAds } from "@/lib/ads/store";
import type { SideSlotCode } from "@/components/ads/adPositions";

type AdPage = "directory" | "reading" | "guide";
type AdPosition = "top" | "mid" | "bottom";

export async function AdSlot(props: { page: AdPage; position: AdPosition }) {
  const ads = await getAds();
  const cfg = ads[props.page][props.position];
  return <>{renderSlot(cfg, `${props.page}:${props.position}`, "center")}</>;
}

export async function SideAdSlot(props: { code: SideSlotCode }) {
  const ads = await getAds();
  const cfg = ads.side[props.code];
  return <>{renderSlot(cfg, `side:${props.code}`, "side")}</>;
}

function renderSlot(cfg: AdSlotConfig, slotKey: string, style: "center" | "side"): ReactNode {
  const enabledItems = cfg.items.filter((item) => item.enabled && item.type !== "empty");
  if (!enabledItems.length) return null;

  if (cfg.mode === "rotate") {
    const selected = enabledItems[pickRotateIndex(slotKey, enabledItems.length)];
    return <div className="w-full">{renderItem(selected, style)}</div>;
  }

  if (cfg.mode === "random") {
    const selected = enabledItems[pickRandomIndex(slotKey, enabledItems.length)];
    return <div className="w-full">{renderItem(selected, style)}</div>;
  }

  if (cfg.mode === "sequence") {
    const selected = enabledItems[pickSequenceIndex(slotKey, enabledItems.length)];
    return <div className="w-full">{renderItem(selected, style)}</div>;
  }

  if (cfg.mode === "slide") {
    return (
      <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 py-1">
        {enabledItems.map((item, idx) => (
          <div key={`${slotKey}-slide-${idx}`} className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white/70 p-2">
            {renderItem(item, style)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {enabledItems.map((item, idx) => (
        <div key={`${slotKey}-multi-${idx}`} className="rounded-lg border border-slate-200 bg-white/70 p-2">
          {renderItem(item, style)}
        </div>
      ))}
    </div>
  );
}

function renderItem(cfg: AdItemConfig, style: "center" | "side"): ReactNode {
  if (cfg.type === "text") {
    if (!cfg.text) return null;
    const textClass =
      style === "side"
        ? "break-words text-center font-sans text-sm text-slate-700"
        : "break-words text-center font-sans text-sm text-slate-700";
    const inner = (
      <span className={textClass}>{cfg.text}</span>
    );
    return (
      <div className="flex min-h-[30px] items-center justify-center px-2">
        {cfg.link ? (
          <a
            href={normalizeAdHref(cfg.link)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="underline decoration-slate-400 underline-offset-2 hover:text-emerald-900"
          >
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
    );
  }

  if (cfg.type === "image") {
    const src = cfg.imageAsset || cfg.imageUrl;
    if (!src) return null;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote ad URLs
      <img
        src={src}
        alt=""
        className={style === "side" ? "mx-auto h-[400px] max-w-full object-contain" : "mx-auto max-h-40 max-w-full object-contain"}
        loading="lazy"
      />
    );
    return (
      <div className="text-center">
        {cfg.link ? (
          <a
            href={normalizeAdHref(cfg.link)}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-block"
          >
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    );
  }

  if (cfg.type === "html") {
    if (!cfg.html) return null;
    return (
      <div
        className="ad-html max-w-full overflow-hidden text-left font-sans text-sm text-slate-800 [&_img]:max-w-full"
        dangerouslySetInnerHTML={{ __html: cfg.html }}
      />
    );
  }

  return null;
}

function pickRotateIndex(slotKey: string, size: number): number {
  if (size <= 1) return 0;
  const minuteSeed = Math.floor(Date.now() / 60000);
  let hash = minuteSeed;
  for (let i = 0; i < slotKey.length; i += 1) {
    hash = (hash * 33 + slotKey.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

function pickRandomIndex(slotKey: string, size: number): number {
  if (size <= 1) return 0;
  const seed = `${slotKey}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % size;
}

function pickSequenceIndex(slotKey: string, size: number): number {
  if (size <= 1) return 0;
  const minuteSeed = Math.floor(Date.now() / 30000);
  let hash = minuteSeed;
  for (let i = 0; i < slotKey.length; i += 1) {
    hash = (hash * 131 + slotKey.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

function normalizeAdHref(raw: string): string {
  const value = raw.trim();
  if (!value) return "#";
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("?")) return value;
  return `https://${value}`;
}
