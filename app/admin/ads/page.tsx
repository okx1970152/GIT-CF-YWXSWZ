import type { Metadata } from "next";
import { AdsAdminClient } from "@/components/admin/AdsAdminClient";
import { getAds } from "@/lib/ads/store";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "广告位管理",
  robots: { index: false, follow: false }
};

export default async function AdminAdsPage() {
  await requireAdmin();
  const ads = await getAds();
  return <AdsAdminClient initial={ads} />;
}
