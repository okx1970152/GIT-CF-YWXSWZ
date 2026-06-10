import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/seo";

const privatePaths = [
  "/admin/",
  "/dashboard/",
  "/user/",
  "/login/",
  "/register/",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: [
          "GPTBot",
          "ClaudeBot",
          "Claude-SearchBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "Google-Extended",
          "PerplexityBot",
          "Perplexity-User",
          "OAI-AdsBot",
          "Amazonbot",
          "meta-externalagent",
          "Applebot-Extended",
        ],
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: toAbsoluteUrl("/sitemap-index.xml"),
  };
}
