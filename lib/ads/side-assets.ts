import fs from "node:fs";
import path from "node:path";
import { SIDE_SLOT_LABEL_CN, type SideSlotCode } from "@/components/ads/adPositions";

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"]);
const BASE_PUBLIC_DIR = path.join(process.cwd(), "public", "LiangCeIMG");

export type SideImageOption = {
  fileName: string;
  imageUrl: string;
  label: string;
};

export type SideImageManifest = Record<SideSlotCode, SideImageOption[]>;

export function emptySideImageManifest(): SideImageManifest {
  return Object.fromEntries(
    (Object.keys(SIDE_SLOT_LABEL_CN) as SideSlotCode[]).map((code) => [code, []])
  ) as SideImageManifest;
}

export function readSideImageManifest(): SideImageManifest {
  const result = emptySideImageManifest();
  for (const slotCode of Object.keys(SIDE_SLOT_LABEL_CN) as SideSlotCode[]) {
    const dirPath = path.join(BASE_PUBLIC_DIR, slotCode);
    if (!fs.existsSync(dirPath)) continue;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true, sensitivity: "base" }));

    result[slotCode] = files.map((fileName) => {
      const encodedName = encodeURIComponent(fileName);
      return {
        fileName,
        imageUrl: `/LiangCeIMG/${slotCode}/${encodedName}`,
        label: `${SIDE_SLOT_LABEL_CN[slotCode]} / ${fileName}`
      };
    });
  }

  return result;
}
