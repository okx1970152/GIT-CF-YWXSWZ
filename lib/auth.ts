import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";

const COOKIE = "admin_session";
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

function getSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  return s && s.length > 0 ? s : null;
}

export function signSessionPayload(expMs: number): string {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: expMs }), "utf8");
  const payloadB64 = payload.toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const json = Buffer.from(payloadB64, "base64url").toString("utf8");
    const data = JSON.parse(json) as { exp?: number };
    if (typeof data.exp !== "number" || Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;
  return verifySessionToken(raw);
}

export async function requireAdmin(): Promise<void> {
  if (!(await verifyAdminSession())) redirect("/admin/login");
}

export function adminCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC
  };
}

export function createSessionCookieValue(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  return signSessionPayload(exp);
}

export const ADMIN_SESSION_COOKIE_NAME = COOKIE;
