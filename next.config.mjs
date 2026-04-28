import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * Include the local Markdown content + ads JSON so runtime `fs` reads work
   * inside the OpenNext-built Worker (Workers + Static Assets, nodejs_compat).
   */
  outputFileTracingIncludes: {
    "/**/*": ["./novels/**/*", "./data/**/*"]
  }
};

export default nextConfig;
