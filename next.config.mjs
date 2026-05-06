import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * 仅追踪运行时需要的路径：正文 .md、索引 JSON、广告 JSON。
   * 避免对整个 data 目录做宽 glob；大索引由 fs 读取，不静态 import 进 bundle。
   */
  outputFileTracingIncludes: {
    "/**/*": [
      "./novels/**/*",
      "./data/content-index.json",
      "./data/wiki-index.json",
      "./data/ads.json"
    ]
  }
};

export default nextConfig;
