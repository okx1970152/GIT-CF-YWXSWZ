/** 后台展示用（中文）；key 对应 ads.json 路径 */

export type PageKey = "directory" | "reading" | "guide";
export type SlotKey = "top" | "mid" | "bottom";
export type SideSlotCode =
  | "szs" | "szz" | "szx"
  | "sys" | "syz" | "syx"
  | "fzs" | "fzz" | "fzx"
  | "fys" | "fyz" | "fyx"
  | "mzs" | "mzz" | "mzx"
  | "mys" | "myz" | "myx"
  | "yzs" | "yzz" | "yzx"
  | "yys" | "yyz" | "yyx";

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

export const SIDE_SLOT_LABEL_CN: Record<SideSlotCode, string> = {
  szs: "首页左上",
  szz: "首页左中",
  szx: "首页左下",
  sys: "首页右上",
  syz: "首页右中",
  syx: "首页右下",
  fzs: "分类页左上",
  fzz: "分类页左中",
  fzx: "分类页左下",
  fys: "分类页右上",
  fyz: "分类页右中",
  fyx: "分类页右下",
  mzs: "目录页左上",
  mzz: "目录页左中",
  mzx: "目录页左下",
  mys: "目录页右上",
  myz: "目录页右中",
  myx: "目录页右下",
  yzs: "正文阅读左上",
  yzz: "正文阅读左中",
  yzx: "正文阅读左下",
  yys: "正文阅读右上",
  yyz: "正文阅读右中",
  yyx: "正文阅读右下"
};

export const SIDE_SLOT_CODES_BY_PAGE = {
  home: {
    left: ["szs", "szz", "szx"],
    right: ["sys", "syz", "syx"]
  },
  category: {
    left: ["fzs", "fzz", "fzx"],
    right: ["fys", "fyz", "fyx"]
  },
  directory: {
    left: ["mzs", "mzz", "mzx"],
    right: ["mys", "myz", "myx"]
  },
  reading: {
    left: ["yzs", "yzz", "yzx"],
    right: ["yys", "yyz", "yyx"]
  }
} as const satisfies Record<
  "home" | "category" | "directory" | "reading",
  { left: SideSlotCode[]; right: SideSlotCode[] }
>;
