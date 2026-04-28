import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  adminCookieOptions,
  createSessionCookieValue
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    const expected = process.env.ADMIN_PASSWORD ?? "";

    if (!expected) {
      return NextResponse.json(
        { error: "服务器未配置 ADMIN_PASSWORD，无法登录。" },
        { status: 500 }
      );
    }

    if (password !== expected) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    try {
      const token = createSessionCookieValue();
      const res = NextResponse.json({ ok: true });
      res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, adminCookieOptions());
      return res;
    } catch {
      return NextResponse.json(
        { error: "服务器未配置 ADMIN_SESSION_SECRET，无法签发会话。" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 });
  }
}
