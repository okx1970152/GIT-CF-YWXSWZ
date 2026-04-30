import type { ReactNode } from "react";
import type { AdSlotConfig } from "@/lib/ads/schema";
import { getAds } from "@/lib/ads/store";

type AdPage = "directory" | "reading" | "guide";
type AdPosition = "top" | "mid" | "bottom";

export async function AdSlot(props: { page: AdPage; position: AdPosition }) {
  const ads = await getAds();
  const cfg = ads[props.page][props.position];
  return <>{renderSlot(cfg)}</>;
}

function renderSlot(cfg: AdSlotConfig): ReactNode {
  if (!cfg.enabled || cfg.type === "empty") return null;

  if (cfg.type === "text") {
    if (!cfg.text) return null;
    const inner = (
      <span className="break-words text-center font-sans text-sm text-slate-700">{cfg.text}</span>
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
    if (!cfg.imageUrl) return null;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote ad URLs
      <img src={cfg.imageUrl} alt="" className="mx-auto max-h-40 max-w-full object-contain" loading="lazy" />
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

function normalizeAdHref(raw: string): string {
  const value = raw.trim();
  if (!value) return "#";
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/") || value.startsWith("#") || value.startsWith("?")) return value;
  return `https://${value}`;
}
