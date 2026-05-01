import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { normalizeAdsJson, type AdsJson } from "@/lib/ads/schema";
import { getAds, writeAdsLocal, writeAdsToKv } from "@/lib/ads/store";
import { verifyAdminSession } from "@/lib/auth";
import { commitAdsJsonToGithub } from "@/lib/github";

async function requireAdsAuth(): Promise<boolean> {
  return verifyAdminSession();
}

export async function GET() {
  if (!(await requireAdsAuth())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json(await getAds());
}

export async function POST(request: Request) {
  if (!(await requireAdsAuth())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let parsed: AdsJson;
  try {
    const raw = (await request.json()) as unknown;
    parsed = normalizeAdsJson(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "广告数据格式不正确";
    return NextResponse.json({ error: `广告数据格式不正确：${msg}` }, { status: 400 });
  }

  const payload = `${JSON.stringify(parsed, null, 2)}\n`;

  try {
    // 1）Cloudflare KV（与 SITE_STATS_KV 同命名空间，键 site:ads_json）：无需 GITHUB_TOKEN，不触发仓库提交与重复部署
    const kvOk = await writeAdsToKv(parsed);
    if (kvOk) {
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, storage: "kv" });
    }

    // 2）本地开发：写 data/ads.json
    if (process.env.NODE_ENV !== "production") {
      writeAdsLocal(parsed);
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, storage: "local" });
    }

    // 3）生产环境若未绑定 KV（异常）：可选回写 GitHub（需仓库与 token）
    const token = process.env.APP_GH_TOKEN ?? process.env.GITHUB_TOKEN;
    const repo = process.env.APP_GITHUB_REPO ?? process.env.GITHUB_REPO;
    const branch = process.env.APP_GITHUB_BRANCH ?? process.env.GITHUB_BRANCH ?? "main";
    const githubPath =
      process.env.APP_GITHUB_ADS_PATH ?? process.env.GITHUB_ADS_PATH ?? "data/ads.json";

    if (token && repo) {
      await commitAdsJsonToGithub({
        token,
        repo,
        branch,
        path: githubPath,
        contentJson: payload,
        message: "chore(admin): update ads.json"
      });
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, storage: "github" });
    }

    return NextResponse.json(
      {
        error:
          "无法保存：生产环境未检测到 Workers KV 绑定，且未配置 GitHub 回写。请在 Wrangler 中绑定 SITE_STATS_KV，或使用本地开发保存。"
      },
      { status: 503 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
