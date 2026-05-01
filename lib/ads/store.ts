import fs from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { defaultAdsJson, normalizeAdsJson, type AdsJson } from "@/lib/ads/schema";

const ADS_PATH = path.join(process.cwd(), "data", "ads.json");

/** 与统计 `stats:*` 隔离；整份 ads.json 序列化存一条，体量极小 */
export const ADS_KV_KEY = "site:ads_json";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
};

async function getAdsKvBinding(): Promise<KvBinding | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return ctx.env.SITE_STATS_KV ?? null;
  } catch {
    return null;
  }
}

async function readAdsFromKv(): Promise<AdsJson | null> {
  const kv = await getAdsKvBinding();
  if (!kv) return null;
  const raw = await kv.get(ADS_KV_KEY);
  if (!raw) return null;
  try {
    return normalizeAdsJson(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** 生产环境保存广告用；绑定存在即写入成功 */
export async function writeAdsToKv(data: AdsJson): Promise<boolean> {
  const kv = await getAdsKvBinding();
  if (!kv) return false;
  await kv.put(ADS_KV_KEY, JSON.stringify(data));
  return true;
}

/** Always read fresh so admin saves show up without stale React cache. */
export async function getAds(): Promise<AdsJson> {
  noStore();

  const fromKv = await readAdsFromKv();
  if (fromKv) return fromKv;

  const remote = await readAdsFromGithub();
  if (remote) return remote;

  try {
    if (!fs.existsSync(ADS_PATH)) {
      return defaultAdsJson();
    }
    const raw = fs.readFileSync(ADS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeAdsJson(parsed);
  } catch {
    return defaultAdsJson();
  }
}

async function readAdsFromGithub(): Promise<AdsJson | null> {
  const repo = process.env.APP_GITHUB_REPO ?? process.env.GITHUB_REPO;
  const branch = process.env.APP_GITHUB_BRANCH ?? process.env.GITHUB_BRANCH ?? "main";
  const adsPath = process.env.APP_GITHUB_ADS_PATH ?? process.env.GITHUB_ADS_PATH ?? "data/ads.json";
  const token = process.env.APP_GH_TOKEN ?? process.env.GITHUB_TOKEN;

  if (!repo || !token) return null;

  try {
    const encodedPath = adsPath
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const url = `https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
    const authValue = token.startsWith("github_pat_") ? `token ${token}` : `Bearer ${token}`;
    const res = await fetch(url, {
      headers: {
        Authorization: authValue,
        Accept: "application/vnd.github+json",
        "User-Agent": "novel-portal-cf-worker/1.0",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      cache: "no-store"
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as { content?: string; encoding?: string };
    if (!payload.content || payload.encoding !== "base64") return null;

    const text = Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf8");
    const parsed = JSON.parse(text) as unknown;
    return normalizeAdsJson(parsed);
  } catch {
    return null;
  }
}

export function writeAdsLocal(data: AdsJson): void {
  const dir = path.dirname(ADS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ADS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
