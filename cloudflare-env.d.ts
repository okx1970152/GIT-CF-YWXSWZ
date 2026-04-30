/* eslint-disable */
// Generated stub. Run `npx wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts`
// inside Cloudflare Workers Builds (or locally) to refresh with real bindings.
interface CloudflareEnv {
  SITE_STATS_KV?: KVNamespace;
  /** 与 wrangler.jsonc vars 同步，供 Worker / OpenNext 运行时读取 */
  NEXT_PUBLIC_SITE_URL?: string;
  APP_GITHUB_REPO?: string;
  APP_GITHUB_BRANCH?: string;
  APP_GITHUB_ADS_PATH?: string;
}
