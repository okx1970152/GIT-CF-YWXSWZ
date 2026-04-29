from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from publisher.config import Settings
from publisher.logger import info, warn
from publisher.models import Selection


def publish_selection(settings: Settings, selection: Selection) -> None:
    if not settings.content_repo_url:
        raise SystemExit("未设置内容仓地址，请设置环境变量 CONTENT_REPO_URL 后重试。")
    if not settings.github_token:
        raise SystemExit("未设置 GitHub Token。")

    repo_dir = settings.repo_workdir
    repo_dir.parent.mkdir(parents=True, exist_ok=True)

    auth_url = _with_token(settings.content_repo_url, settings.github_token)
    if not (repo_dir / ".git").exists():
        info("正在克隆内容仓...")
        _run_git(["clone", auth_url, str(repo_dir)], settings, allow_fallback=True, cwd=settings.runtime_root)
    else:
        info("检测到本地内容仓，准备更新...")
        _run_git(["remote", "set-url", "origin", auth_url], settings, allow_fallback=True, cwd=repo_dir)
        _run_git(["fetch", "origin"], settings, allow_fallback=True, cwd=repo_dir)

    _run_git(["checkout", "main"], settings, allow_fallback=True, cwd=repo_dir)
    _run_git(["pull", "--rebase", "origin", "main"], settings, allow_fallback=True, cwd=repo_dir)

    target_dir = repo_dir / "novels" / selection.category_slug / selection.novel_slug
    source_dir = selection.source_dir
    file_count = sum(1 for p in source_dir.rglob("*") if p.is_file())

    info(f"正在同步目录到内容仓：novels/{selection.category_slug}/{selection.novel_slug}")
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source_dir, target_dir)
    info(f"已复制 {file_count} 个文件。")

    rel_path = Path("novels") / selection.category_slug / selection.novel_slug
    _run_git(["add", str(rel_path)], settings, allow_fallback=False, cwd=repo_dir)

    status = _run_git(
        ["status", "--porcelain", str(rel_path)],
        settings,
        allow_fallback=False,
        cwd=repo_dir,
        capture_output=True,
    )
    if not status.strip():
        warn("未检测到文件变化，本次无需提交。")
        return

    message = (
        f"publish: update {selection.category_slug}/{selection.novel_slug}\n\n"
        "同步 novel_publisher 选择的小说目录到内容仓。"
    )
    _run_git(["commit", "-m", message], settings, allow_fallback=False, cwd=repo_dir)
    info("提交完成，正在推送 main...")
    _run_git(["push", "origin", "main"], settings, allow_fallback=True, cwd=repo_dir)
    info("推送成功，已触发前端部署流水线。")


def _run_git(
    args: list[str],
    settings: Settings,
    allow_fallback: bool,
    cwd: Path,
    capture_output: bool = False,
) -> str:
    proxies = settings.proxy_candidates if allow_fallback else ("",)
    last_err: RuntimeError | None = None
    for proxy in proxies:
        env = os.environ.copy()
        if proxy:
            env["HTTP_PROXY"] = proxy
            env["HTTPS_PROXY"] = proxy
            info(f"使用代理执行 git：{proxy}")
        cmd = ["git", *args]
        try:
            cp = subprocess.run(
                cmd,
                cwd=str(cwd),
                env=env,
                check=True,
                text=True,
                capture_output=capture_output,
            )
            return (cp.stdout or "").strip()
        except subprocess.CalledProcessError as ex:
            last_err = RuntimeError(ex.stderr or ex.stdout or str(ex))
            if proxy:
                warn(f"当前代理失败：{proxy}，尝试下一个。")
                continue
            raise last_err
    if last_err:
        raise last_err
    return ""


def _with_token(repo_url: str, token: str) -> str:
    parsed = urlsplit(repo_url)
    if not parsed.scheme or not parsed.netloc:
        raise SystemExit(f"内容仓地址不合法：{repo_url}")
    netloc = f"x-access-token:{token}@{parsed.netloc}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))

