import { NextResponse } from "next/server";
import { parsePathDimensions, resolveCountryCode, trackHit } from "@/lib/stats/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string } | null;
    const path = typeof body?.path === "string" ? body.path : "/";
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    if (ua.includes("bot") || ua.includes("spider") || ua.includes("crawler")) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const dims = parsePathDimensions(path);
    const country = resolveCountryCode(request.headers);
    await trackHit(dims, country);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
