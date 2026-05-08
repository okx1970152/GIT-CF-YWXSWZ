"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const ITEMS = [{ href: "/admin/ads", label: "广告管理" }];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
      <ul className="flex flex-wrap gap-2">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={clsx(
                  "inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-emerald-900 hover:bg-emerald-100"
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
