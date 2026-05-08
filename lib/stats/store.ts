import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { HitPayload } from "@/lib/stats/types";

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
