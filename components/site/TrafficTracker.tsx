"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "site-hit-last";
const WINDOW_MS = 30_000;

export function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      const now = Date.now();
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const [lastPath, lastTs] = raw.split("|");
        const ts = Number(lastTs || "0");
        if (lastPath === pathname && now - ts < WINDOW_MS) return;
      }
      sessionStorage.setItem(KEY, `${pathname}|${now}`);
      const body = JSON.stringify({ path: pathname });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/stats/hit", new Blob([body], { type: "application/json" }));
      } else {
        fetch("/api/stats/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch {
      // no-op
    }
  }, [pathname]);

  return null;
}
