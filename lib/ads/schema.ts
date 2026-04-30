import { z } from "zod";

export const adItemSchema = z
  .object({
    enabled: z.boolean(),
    type: z.enum(["empty", "text", "image", "html"]),
    text: z.string().optional(),
    link: z.string().optional(),
    imageUrl: z.string().optional(),
    html: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.enabled || data.type === "empty") return;

    if (data.type === "image") {
      if (!data.imageUrl) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "image 类型需要 imageUrl" });
    }
    if (data.type === "text") {
      if (!data.text) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "text 类型需要 text" });
    }
    if (data.type === "html") {
      if (!data.html) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "html 类型需要 html" });
    }
  });

export type AdItemConfig = z.infer<typeof adItemSchema>;

export const adDisplayModeSchema = z.enum(["rotate", "slide", "multi"]);
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

export const adsJsonSchema = z.object({
  directory: pageSlots,
  reading: pageSlots,
  guide: pageSlots
});

export type AdsJson = z.infer<typeof adsJsonSchema>;

export function defaultAdsJson(): AdsJson {
  const slot = (): AdSlotConfig => ({ mode: "rotate", items: [] });
  const block = () => ({ top: slot(), mid: slot(), bottom: slot() });
  return {
    directory: block(),
    reading: block(),
    guide: block()
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

  return adsJsonSchema.parse(normalized);
}
