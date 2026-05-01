import type { Metadata } from "next";
import { AdsAdminClient } from "@/components/admin/AdsAdminClient";
import { getAds } from "@/lib/ads/store";
import { readSideImageManifest } from "@/lib/ads/side-assets";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "广告位管理",
  robots: { index: false, follow: false }
};

export default async function AdminAdsPage() {
  await requireAdmin();
  const ads = await getAds();
  const sideImageManifest = readSideImageManifest();
  return <AdsAdminClient initial={ads} sideImageManifest={sideImageManifest} />;
}
