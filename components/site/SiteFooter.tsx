import type { SiteFooterProps } from "@/components/site/site-footer-types";
import { SiteFooterClient } from "@/components/site/SiteFooterClient";

export type { SiteFooterProps } from "@/components/site/site-footer-types";

export function SiteFooter(props: SiteFooterProps) {
  return <SiteFooterClient {...props} />;
}
