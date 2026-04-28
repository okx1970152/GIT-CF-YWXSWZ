import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { adsJsonSchema, type AdsJson } from "@/lib/ads/schema";
import { getAds, writeAdsLocal } from "@/lib/ads/store";
import { verifyAdminSession } from "@/lib/auth";
import { commitAdsJsonToGithub } from "@/lib/github";

async function requireAdsAuth(): Promise<boolean> {
  return verifyAdminSession();
}

export async function GET() {
  if (!(await requireAdsAuth())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json(getAds());
}

export async function POST(request: Request) {
  if (!(await requireAdsAuth())) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let parsed: AdsJson;
  try {
    const raw = (await request.json()) as unknown;
    parsed = adsJsonSchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "广告数据格式不正确" }, { status: 400 });
  }

  const payload = `${JSON.stringify(parsed, null, 2)}\n`;

  try {
    if (process.env.NODE_ENV !== "production") {
      writeAdsLocal(parsed);
    } else {
      // 优先读取你当前在 GitHub 仓库中配置的 APP_* 变量名，同时兼容旧命名。
      const token = process.env.APP_GH_TOKEN ?? process.env.GITHUB_TOKEN;
      const repo = process.env.APP_GITHUB_REPO ?? process.env.GITHUB_REPO;
      const branch = process.env.APP_GITHUB_BRANCH ?? process.env.GITHUB_BRANCH ?? "main";
      const githubPath =
        process.env.APP_GITHUB_ADS_PATH ?? process.env.GITHUB_ADS_PATH ?? "data/ads.json";

      if (!token || !repo) {
        return NextResponse.json(
          { error: "生产环境未配置 GitHub 写入权限，无法保存广告。" },
          { status: 400 }
        );
      }

      await commitAdsJsonToGithub({
        token,
        repo,
        branch,
        path: githubPath,
        contentJson: payload,
        message: "chore(admin): update ads.json"
      });
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "保存失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
