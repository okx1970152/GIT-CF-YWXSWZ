import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { StatsAdminClient } from "@/components/admin/StatsAdminClient";

export const metadata: Metadata = {
  title: "访问统计中心",
  robots: { index: false, follow: false }
};

export default async function AdminStatsPage() {
  await requireAdmin();
  return <StatsAdminClient />;
}
