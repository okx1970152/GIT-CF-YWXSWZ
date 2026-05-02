export type SiteFooterVariant = "home" | "category" | "directory" | "reading" | "search";

export type SiteFooterProps = {
  variant: SiteFooterVariant;
  /** English category label, e.g. "Xuanhuan" */
  categoryLabel?: string;
  /** Display novel title for directory / reading footers */
  novelTitle?: string;
};
