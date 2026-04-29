from __future__ import annotations

from publisher.config import get_settings
from publisher.gitops import publish_selection
from publisher.logger import info, warn
from publisher.selector import choose_novel, confirm_publish


def run() -> None:
    settings = get_settings()
    settings.runtime_root.mkdir(parents=True, exist_ok=True)

    info("novel_publisher 启动。")
    info(f"生产目录：{settings.producer_novels_root}")
    if not settings.content_repo_url:
        warn("未设置 CONTENT_REPO_URL，后续确认上传时会直接报错。")

    selection = choose_novel(settings.producer_novels_root)
    if not confirm_publish(selection):
        warn("已取消，本次不上传。")
        return

    publish_selection(settings, selection)

