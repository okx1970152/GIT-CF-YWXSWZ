import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/auth";

export default async function AdminIndexPage() {
  if (await verifyAdminSession()) redirect("/admin/ads");
  redirect("/admin/login");
}
