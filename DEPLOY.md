# 部署：GitHub + Cloudflare Workers（含 Pages 体验）

本项目已升级为 **Next.js 15 + OpenNext Cloudflare Adapter**。  
**唯一的部署目标**：代码托管在 GitHub，**Cloudflare 自动构建并发布到 Workers/Pages**。
> Cloudflare 现已统一以 Workers Builds 承载 Next.js 等框架；UI 上你既可以从 “Workers”，也可以从 “Pages” 入口连接 Git，效果一致。

---

## 0. 一次性准备

1. 一个 **GitHub 账号**（公开或私有仓库都行）。
2. 一个 **Cloudflare 账号**（免费版即可）。
3. 一个域名（可选；先用 Cloudflare 给的 `*.workers.dev` 子域也能跑）。

> 你不需要把任何 Token 发给我；下面所有授权操作都在你自己的浏览器里完成。

---

## 1. 把项目推到 GitHub

在项目根目录（已含 `.gitignore`、`wrangler.jsonc`、`open-next.config.ts`）执行：

```bash
git init
git add .
git commit -m "init: novel portal"
git branch -M main
git remote add origin https://github.com/你的名字/novel-portal.git
git push -u origin main
```

---

## 2. 在 Cloudflare 控制台连接仓库（Workers Builds）

打开 Cloudflare Dashboard，按以下任一路径：

- **Workers & Pages** → **Create** → **Connect to Git**  
  或
- **Pages** → **Create a project** → **Connect to Git**

然后：

1. 选择 **GitHub**，授权 Cloudflare 读取你的仓库。
2. 选中本仓库，**Production branch** 一般是 `main`。
3. **Build configuration** 按下表填写：

| 字段 | 填写 |
|------|------|
| Framework preset | `Next.js` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |
| Output / non-static asset upload directory | `.open-next` |
| Root directory | （仓库根） |

> Cloudflare 模板若把 build/deploy 拆成两个步骤的输入框，按上面分别填即可。  
> 也可在 “Build environment variables” 中加 `NODE_VERSION = 20`。

4. 点 **Save and Deploy**，CF 会自动跑构建并发布。

---

## 3. 必要的环境变量（在 Cloudflare 项目设置里加）

| 变量 | 用途 | 何时必填 |
|------|------|----------|
| `NEXT_PUBLIC_SITE_URL` | canonical / sitemap / OG 用的站点地址，例如 `https://你的域名` | 推荐**始终**填（即使先用 `*.workers.dev`） |
| `CONTENT_REPO` | 私有内容仓地址（`owner/repo`） | **双仓库必填**，本项目填 `okx1970152/GIT-CF-YWXS` |
| `CONTENT_REPO_REF` | 内容分支 | 双仓库建议填 `main` |
| `CONTENT_REPO_TOKEN` | GitHub Fine-grained PAT（只需读内容仓） | **双仓库必填** |
| `CONTENT_REPO_NOVELS_PATH` | 内容仓中小说目录路径 | 双仓库建议填 `novels` |
| `ADMIN_PASSWORD` | 后台 `/admin/login` 密码 | 只要用后台就要填 |
| `ADMIN_SESSION_SECRET` | 给会话 Cookie 签名用的随机串（建议 32+ 字节） | 同上 |
| `GITHUB_TOKEN` | 生产环境保存广告时用 GitHub Contents API 写 `data/ads.json` | 仅当你想在线上点「保存广告」时填 |
| `GITHUB_REPO` | `owner/repo` 形式，例如 `myname/novel-portal` | 同上 |
| `GITHUB_BRANCH` | 默认 `main` | 可选 |
| `GITHUB_ADS_PATH` | 默认 `data/ads.json` | 可选 |

设置位置：
- Cloudflare → 你的 Worker 项目 → **Settings** → **Variables and Secrets** → 区分 **Production / Preview**。

---

## 4. 自定义域名

1. CF 控制台 → 项目 → **Domains** → **Add Custom Domain**。
2. 把要用的域名（必须已托管在该 Cloudflare 账号 DNS）添加上去；CF 会自动帮你做 DNS 解析与证书。
3. 加完后记得把 `NEXT_PUBLIC_SITE_URL` 改为该域名，重新部署一次（push 一次或在 Cloudflare 上点 “Retry deployment” 即可）。

---

## 5. 双仓库内容更新流程（你当前就是这个）

你的仓库分工：

- 程序仓（公开）：`okx1970152/GIT-CF-YWXSWZ`
- 内容仓（私有）：`okx1970152/GIT-CF-YWXS`

构建时流程（已在脚本中实现）：

1. Cloudflare 构建程序仓。
2. 构建前执行 `npm run sync:content`。
3. 脚本通过 `CONTENT_REPO_TOKEN` 克隆内容仓（sparse-checkout 仅拉 `novels/`）。
4. 将内容仓 `novels/` 覆盖到程序仓构建目录，再执行 OpenNext 构建。

你后续更新小说时有两种触发发布方式：

- **手动触发（推荐先用）**：内容仓 push 后，在 Cloudflare 项目页面点 “Retry deployment”。
- **自动触发**：创建 Cloudflare Deploy Hook，然后在内容仓 GitHub Actions 中调用该 Hook（需要的话我可继续给你生成该工作流文件模板）。

---

## 6. 常见问题

- **Q：本地 `npx opennextjs-cloudflare build` 在 Windows 上报错？**  
  A：OpenNext 官方提示 Windows 仅有限支持，建议在 WSL 中跑。**Cloudflare 的构建机器是 Linux，不受影响。** 你不需要本地跑通它，只要 `npm run build` 通过即可推送。

- **Q：会不会因为 Worker 大小限制部署失败？**  
  A：本项目已通过 `outputFileTracingIncludes` 让小说 `.md` 与 `data/ads.json` 进入 Worker 资源。若小说极多（百万字级）将来超额，可以再切换为 R2 + 远端读取，本仓库结构便于扩展。

- **Q：可以不用 Cloudflare Workers Builds，改用 GitHub Actions 部署吗？**  
  A：可以，但更麻烦：需要在 GitHub Secrets 里放 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`，并在工作流里跑 `wrangler deploy`。若要走这条线再开口我加文件。**默认推荐就是 CF Workers Builds**，零脚本、零密钥泄露风险。

---

## 7. 这次升级改了哪些项目侧的文件（备查）

- `next.config.mjs`：接入 `initOpenNextCloudflareForDev()`、`outputFileTracingIncludes` 把 `novels/`、`data/` 打进 Worker。
- `open-next.config.ts`、`wrangler.jsonc`、`cloudflare-env.d.ts`：OpenNext 与 Wrangler 标配。
- `package.json`：新增 `sync:content`，并让 `preview`/`deploy`/`cf-build` 在构建前自动同步私有内容仓。
- `scripts/sync-content-repo.mjs`：双仓库同步脚本（支持 sparse-checkout，只取 `novels/`）。
- `.env.example`：补齐 `CONTENT_REPO*` 相关变量示例。
- 所有动态路由（`/category/[category]`、`/novels/[category]/[novelId]`、`/novels/.../chapters/[chapterNo]`、`/search`）改为 **Next 15** 的 **`Promise<{...}>` `params` / `searchParams`**。
- `lib/auth.ts`：`cookies()` 改为 **`await`** 形式。
