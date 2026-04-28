import { z } from "zod";

export const adSlotSchema = z
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
  const slot = (): AdSlotConfig => ({ enabled: false, type: "empty" });
  const block = () => ({ top: slot(), mid: slot(), bottom: slot() });
  return {
    directory: block(),
    reading: block(),
    guide: block()
  };
}
