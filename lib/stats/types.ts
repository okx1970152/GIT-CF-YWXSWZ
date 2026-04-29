export type StatsScope = "site" | "category" | "novel" | "chapter";

export type HitPayload = {
  path: string;
  category?: string;
  novelId?: string;
  chapterNo?: string;
};

export type StatPoint = {
  key: string;
  value: number;
};

export type CountryCategoryRow = {
  country: string;
  countryNameZh: string;
  total: number;
  categories: Record<string, number>;
};
