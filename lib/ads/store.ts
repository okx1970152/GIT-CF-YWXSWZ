import fs from "node:fs";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { adsJsonSchema, defaultAdsJson, type AdsJson } from "@/lib/ads/schema";

const ADS_PATH = path.join(process.cwd(), "data", "ads.json");

/** Always read fresh so admin saves show up without stale React cache. */
export function getAds(): AdsJson {
  noStore();
  try {
    if (!fs.existsSync(ADS_PATH)) {
      return defaultAdsJson();
    }
    const raw = fs.readFileSync(ADS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return adsJsonSchema.parse(parsed);
  } catch {
    return defaultAdsJson();
  }
}

export function writeAdsLocal(data: AdsJson): void {
  const dir = path.dirname(ADS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ADS_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
