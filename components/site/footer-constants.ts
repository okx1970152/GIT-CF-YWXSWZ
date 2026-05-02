/** Public site brand as shown in legal copy */
export const SITE_BRAND = "WX.0O0O.MOM";

export const CONTACT_EMAIL = "WX@0O0O.MOM";

/** SEO-oriented search: pages from this host in Google/Bing results */
export const SITE_SEARCH_QUERY = "site:wx.0o0o.mom";

export const FRIEND_LINKS: readonly {
  id: string;
  label: string;
  href: string;
  icon: string;
}[] = [
  { id: "x", label: "X", href: "https://x.com", icon: "/LOGO/x.png" },
  { id: "facebook", label: "Facebook", href: "https://www.facebook.com", icon: "/LOGO/facebook.png" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com", icon: "/LOGO/instagram.png" },
  { id: "telegram", label: "Telegram", href: "https://telegram.org", icon: "/LOGO/telegram.png" },
  { id: "reddit", label: "Reddit", href: "https://www.reddit.com", icon: "/LOGO/reddit.png" },
  { id: "quora", label: "Quora", href: "https://www.quora.com", icon: "/LOGO/quora.png" },
  { id: "threads", label: "Threads", href: "https://www.threads.net", icon: "/LOGO/threads.png" },
  {
    id: "google",
    label: "Google",
    href: `https://www.google.com/search?q=${encodeURIComponent("site:wx.0o0o.mom")}`,
    icon: "/LOGO/google.png"
  },
  {
    id: "bing",
    label: "Bing",
    href: `https://www.bing.com/search?q=${encodeURIComponent("site:wx.0o0o.mom")}`,
    icon: "/LOGO/bing.png"
  }
];

export const FRIEND_LINKS_ROW_SPLIT = 5;
