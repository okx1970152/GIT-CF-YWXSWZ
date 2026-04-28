/** 后台展示用（中文）；key 对应 ads.json 路径 */

export type PageKey = "directory" | "reading" | "guide";
export type SlotKey = "top" | "mid" | "bottom";

export const PAGE_LABEL_CN: Record<PageKey, string> = {
  directory: "目录页",
  reading: "正文阅读",
  guide: "导读栏"
};

export const SLOT_LABEL_CN: Record<SlotKey, string> = {
  top: "顶部",
  mid: "中部",
  bottom: "底部"
};

export function describeSlot(page: PageKey, slot: SlotKey): string {
  return `${PAGE_LABEL_CN[page]} · ${SLOT_LABEL_CN[slot]}`;
}
