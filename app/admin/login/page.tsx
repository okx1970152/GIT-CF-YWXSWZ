import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { verifyAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "后台登录 · 广告管理",
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage() {
  if (await verifyAdminSession()) redirect("/admin/ads");

  return (
    <div className="min-h-screen px-4 pb-16 pt-10">
      <p className="text-center">
        <Link href="/" className="text-sm text-emerald-900 underline">
          ← 返回英文前台首页
        </Link>
      </p>
      <LoginForm />
    </div>
  );
}
