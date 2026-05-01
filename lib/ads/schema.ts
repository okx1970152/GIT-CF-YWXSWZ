import { z } from "zod";
import type { SideSlotCode } from "@/components/ads/adPositions";

export const adItemSchema = z
  .object({
    enabled: z.boolean(),
    type: z.enum(["empty", "text", "image", "html"]),
    text: z.string().optional(),
    link: z.string().optional(),
    imageUrl: z.string().optional(),
    imageAsset: z.string().optional(),
    html: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.enabled || data.type === "empty") return;

    if (data.type === "image") {
      if (!data.imageUrl && !data.imageAsset) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "image 类型需要 imageUrl 或 imageAsset" });
      }
    }
    if (data.type === "text") {
      if (!data.text) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "text 类型需要 text" });
    }
    if (data.type === "html") {
      if (!data.html) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "html 类型需要 html" });
    }
  });

export type AdItemConfig = z.infer<typeof adItemSchema>;

export const adDisplayModeSchema = z.enum(["rotate", "slide", "multi", "random", "sequence"]);
export type AdDisplayMode = z.infer<typeof adDisplayModeSchema>;

export const adSlotSchema = z.object({
  mode: adDisplayModeSchema.default("rotate"),
  items: z.array(adItemSchema).max(10, "每个广告位最多 10 条").default([])
});

export type AdSlotConfig = z.infer<typeof adSlotSchema>;

const pageSlots = z.object({
  top: adSlotSchema,
  mid: adSlotSchema,
  bottom: adSlotSchema
});

const sideSlotCodeList = [
  "szs", "szz", "szx", "sys", "syz", "syx",
  "fzs", "fzz", "fzx", "fys", "fyz", "fyx",
  "mzs", "mzz", "mzx", "mys", "myz", "myx",
  "yzs", "yzz", "yzx", "yys", "yyz", "yyx"
] as const satisfies readonly SideSlotCode[];

const sideSlotsSchema = z.object(
  Object.fromEntries(sideSlotCodeList.map((code) => [code, adSlotSchema])) as Record<SideSlotCode, typeof adSlotSchema>
);

export const adsJsonSchema = z.object({
  directory: pageSlots,
  reading: pageSlots,
  guide: pageSlots,
  side: sideSlotsSchema
});

export type AdsJson = z.infer<typeof adsJsonSchema>;

export function defaultAdsJson(): AdsJson {
  const slot = (): AdSlotConfig => ({ mode: "rotate", items: [] });
  const block = () => ({ top: slot(), mid: slot(), bottom: slot() });
  const side = Object.fromEntries(sideSlotCodeList.map((code) => [code, slot()])) as Record<SideSlotCode, AdSlotConfig>;
  return {
    directory: block(),
    reading: block(),
    guide: block(),
    side
  };
}

type LegacyAdSlot = AdItemConfig;

function isLegacySlot(value: unknown): value is LegacyAdSlot {
  if (!value || typeof value !== "object") return false;
  return "type" in value && "enabled" in value;
}

function normalizeSlot(raw: unknown): AdSlotConfig {
  if (isLegacySlot(raw)) {
    return {
      mode: "rotate",
      items: [adItemSchema.parse(raw)]
    };
  }
  return adSlotSchema.parse(raw);
}

export function normalizeAdsJson(raw: unknown): AdsJson {
  const input = (raw ?? {}) as Record<string, unknown>;
  const fallback = defaultAdsJson();
  const pages = ["directory", "reading", "guide"] as const;
  const slots = ["top", "mid", "bottom"] as const;

  const normalized = Object.fromEntries(
    pages.map((page) => {
      const pageRaw = (input[page] ?? {}) as Record<string, unknown>;
      const pageVal = Object.fromEntries(
        slots.map((slot) => {
          const rawSlot = pageRaw[slot] ?? fallback[page][slot];
          return [slot, normalizeSlot(rawSlot)];
        })
      );
      return [page, pageVal];
    })
  );
  const sideRaw = (input.side ?? {}) as Record<string, unknown>;
  const sideNormalized = Object.fromEntries(
    sideSlotCodeList.map((code) => [code, normalizeSlot(sideRaw[code] ?? fallback.side[code])])
  ) as Record<SideSlotCode, AdSlotConfig>;

  return adsJsonSchema.parse({ ...normalized, side: sideNormalized });
}
