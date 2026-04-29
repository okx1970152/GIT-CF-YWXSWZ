# novel_publisher

发布项目：只负责将 `novel_producer/novels` 下选定的小说目录上传到内容仓并推送 `main`。

## 使用方式

1. 设置内容仓地址（必须）

```powershell
$env:CONTENT_REPO_URL="https://github.com/<owner>/<repo>.git"
```

2. 可选：覆盖默认 token

```powershell
$env:GITHUB_TOKEN="你的token"
```

3. 启动

```powershell
python main.py
```

## 交互流程

- 先选分类
- 再选小说
- 二次确认
- 同步到内容仓 `novels/<category>/<novel>/`
- `git add/commit/push origin main`

## 代理策略

- 优先：`http://127.0.0.1:10809`
- 回退：`http://127.0.0.1:10808`

