import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/seo";

/**
 * 动态生成 /robots.txt：Disallow/Allow 规则固定；Sitemap 随 NEXT_PUBLIC_SITE_URL 变化。
 * （与此前 public/robots.txt 中 1–18 行指令一致；# 注释不会出现在 HTTP 响应里。）
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/user/",
          "/login/",
          "/register/",
          "/api/",
        ],
      },
    ],
    sitemap: toAbsoluteUrl("/sitemap.xml"),
  };
}
