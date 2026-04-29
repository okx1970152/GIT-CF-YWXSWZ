import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth";
import { readDashboard } from "@/lib/stats/store";

export async function GET(request: Request) {
  if (!(await verifyAdminSession())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const url = new URL(request.url);
  const rawDays = Number(url.searchParams.get("days") ?? "7");
  const days = Number.isFinite(rawDays) ? Math.min(30, Math.max(1, Math.trunc(rawDays))) : 7;

  const data = await readDashboard(days);
  return NextResponse.json({ ok: true, days, ...data });
}
