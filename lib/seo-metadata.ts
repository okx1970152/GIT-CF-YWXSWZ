import type { Metadata } from "next";
import { toAbsoluteUrl } from "@/lib/seo";

export const SITE_NAME = "Novel Portal";

/** Shared Open Graph site name + locale for English public pages. */
export function baseOpenGraph(): NonNullable<Metadata["openGraph"]> {
  return {
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website"
  };
}

export function absoluteOgUrl(path: string): string {
  return toAbsoluteUrl(path);
}

export function publicRobots(): Metadata["robots"] {
  return { index: true, follow: true };
}
