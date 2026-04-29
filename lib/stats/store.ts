import { getCloudflareContext } from "@opennextjs/cloudflare";
import { countryZh } from "@/lib/stats/country-zh";
import type { CountryCategoryRow, HitPayload } from "@/lib/stats/types";

const TZ = "Asia/Shanghai";
const memory = new Map<string, number>();
type StatsKv = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string) => Promise<void>;
  list: (opts: { prefix: string; cursor?: string }) => Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
};

function nowInShanghai(now = new Date()): { day: string; hour: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  return { day: `${year}-${month}-${day}`, hour };
}

function keyFor(scope: string, ...rest: string[]): string {
  return ["stats", scope, ...rest].join(":");
}

function safePart(v: string | undefined): string {
  return (v || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}

async function kv(): Promise<StatsKv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env.SITE_STATS_KV ?? null;
  } catch {
    return null;
  }
}

async function increment(key: string): Promise<void> {
  const bucket = await kv();
  if (!bucket) {
    memory.set(key, (memory.get(key) ?? 0) + 1);
    return;
  }
  const raw = await bucket.get(key);
  const cur = Number(raw ?? "0");
  await bucket.put(key, String(cur + 1));
}

async function getCount(bucket: StatsKv | null, key: string): Promise<number> {
  if (!bucket) return memory.get(key) ?? 0;
  const raw = await bucket.get(key);
  return Number(raw ?? "0");
}

async function listCounts(prefix: string): Promise<Array<{ key: string; value: number }>> {
  const bucket = await kv();
  if (!bucket) {
    const rows: Array<{ key: string; value: number }> = [];
    for (const [k, v] of memory.entries()) {
      if (k.startsWith(prefix)) rows.push({ key: k, value: v });
    }
    return rows;
  }

  const rows: Array<{ key: string; value: number }> = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, cursor });
    for (const k of page.keys) {
      rows.push({ key: k.name, value: await getCount(bucket, k.name) });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return rows;
}

export function resolveCountryCode(headers: Headers): string {
  const raw = headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country") || "ZZ";
  const v = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(v)) return "ZZ";
  return v;
}

export function parsePathDimensions(pathname: string): HitPayload {
  const clean = pathname.split("?")[0];
  const seg = clean.split("/").filter(Boolean);
  const payload: HitPayload = { path: clean || "/" };

  if (seg[0] === "category" && seg[1]) {
    payload.category = seg[1];
    return payload;
  }

  if (seg[0] === "novels" && seg[1] && seg[2]) {
    payload.category = seg[1];
    payload.novelId = seg[2];
    if (seg[3] === "chapters" && seg[4]) payload.chapterNo = seg[4];
  }
  return payload;
}

export async function trackHit(payload: HitPayload, country: string): Promise<void> {
  const dims = parsePathDimensions(payload.path);
  const category = safePart(payload.category ?? dims.category);
  const novelId = safePart(payload.novelId ?? dims.novelId);
  const chapterNo = safePart(payload.chapterNo ?? dims.chapterNo);
  const cc = safePart(country.toUpperCase()) || "zz";
  const { day, hour } = nowInShanghai();

  await increment(keyFor("site", "total"));
  await increment(keyFor("site", "day", day));
  await increment(keyFor("site", "hour", day, hour));
  await increment(keyFor("country", cc, "day", day));

  if (category) {
    await increment(keyFor("category", category, "total"));
    await increment(keyFor("category", category, "day", day));
    await increment(keyFor("country", cc, "category", category, "day", day));
  }
  if (category && novelId) {
    await increment(keyFor("novel", category, novelId, "total"));
    await increment(keyFor("novel", category, novelId, "day", day));
  }
  if (category && novelId && chapterNo) {
    await increment(keyFor("chapter", category, novelId, chapterNo, "total"));
    await increment(keyFor("chapter", category, novelId, chapterNo, "day", day));
  }
}

function topN<T extends { total: number }>(rows: T[], n = 10): T[] {
  return [...rows].sort((a, b) => b.total - a.total).slice(0, n);
}

export async function readDashboard(days: number): Promise<{
  siteTotal: number;
  daily: Array<{ day: string; total: number }>;
  hourlyToday: Array<{ hour: string; total: number }>;
  topCountries: Array<{ country: string; countryNameZh: string; total: number }>;
  topCategories: Array<{ category: string; total: number }>;
  topNovels: Array<{ category: string; novelId: string; total: number }>;
  countryCategoryRows: CountryCategoryRow[];
}> {
  const bucket = await kv();
  const now = new Date();
  const daysList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    daysList.push(nowInShanghai(d).day);
  }
  const today = daysList[daysList.length - 1];

  const siteTotal = await getCount(bucket, keyFor("site", "total"));
  const daily = await Promise.all(
    daysList.map(async (day) => ({
      day,
      total: await getCount(bucket, keyFor("site", "day", day))
    }))
  );

  const hourlyToday = await Promise.all(
    Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map(async (hour) => ({
      hour,
      total: await getCount(bucket, keyFor("site", "hour", today, hour))
    }))
  );

  const allCategory = await listCounts(keyFor("category"));
  const categoryMap = new Map<string, number>();
  for (const row of allCategory) {
    const p = row.key.split(":");
    if (p[4] !== "day" || !daysList.includes(p[5])) continue;
    const c = p[2];
    categoryMap.set(c, (categoryMap.get(c) ?? 0) + row.value);
  }
  const topCategories = topN(
    [...categoryMap.entries()].map(([category, total]) => ({ category, total })),
    10
  );

  const allNovel = await listCounts(keyFor("novel"));
  const novelMap = new Map<string, number>();
  for (const row of allNovel) {
    const p = row.key.split(":");
    if (p[5] !== "day" || !daysList.includes(p[6])) continue;
    const key = `${p[2]}::${p[3]}`;
    novelMap.set(key, (novelMap.get(key) ?? 0) + row.value);
  }
  const topNovels = topN(
    [...novelMap.entries()].map(([k, total]) => {
      const [category, novelId] = k.split("::");
      return { category, novelId, total };
    }),
    10
  );

  const allCountry = await listCounts(keyFor("country"));
  const countryMap = new Map<string, number>();
  const matrix = new Map<string, Map<string, number>>();
  for (const row of allCountry) {
    const p = row.key.split(":");
    const cc = p[2].toUpperCase();
    if (p[3] === "day" && daysList.includes(p[4])) {
      countryMap.set(cc, (countryMap.get(cc) ?? 0) + row.value);
      continue;
    }
    if (p[3] === "category" && p[5] === "day" && daysList.includes(p[6])) {
      const category = p[4];
      if (!matrix.has(cc)) matrix.set(cc, new Map());
      const cm = matrix.get(cc)!;
      cm.set(category, (cm.get(category) ?? 0) + row.value);
    }
  }

  const topCountries = topN(
    [...countryMap.entries()].map(([country, total]) => ({
      country,
      countryNameZh: countryZh(country),
      total
    })),
    12
  );

  const countryCategoryRows: CountryCategoryRow[] = topCountries.map((c) => {
    const categories = Object.fromEntries(matrix.get(c.country)?.entries() ?? []);
    return {
      country: c.country,
      countryNameZh: c.countryNameZh,
      total: c.total,
      categories
    };
  });

  return { siteTotal, daily, hourlyToday, topCountries, topCategories, topNovels, countryCategoryRows };
}
