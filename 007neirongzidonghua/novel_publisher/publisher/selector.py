from __future__ import annotations

from pathlib import Path

from publisher.categories import CATEGORIES
from publisher.logger import error, info, warn
from publisher.models import Selection


def choose_novel(novels_root: Path) -> Selection:
    if not novels_root.exists():
        raise SystemExit(f"未找到生产目录：{novels_root}")

    info("正在扫描可发布分类...")
    category_dirs: list[tuple[str, str, Path, int]] = []
    for cat in CATEGORIES:
        cdir = novels_root / cat.slug
        count = _count_novels(cdir)
        category_dirs.append((cat.slug, cat.label, cdir, count))

    for idx, (_, label, _, count) in enumerate(category_dirs, start=1):
        info(f"{idx}. {label} 扫描到 {count} 部小说")

    category_idx = _ask_index("请输入分类编号：", len(category_dirs))
    slug, label, cdir, _ = category_dirs[category_idx]
    if not cdir.exists():
        error(f"分类目录不存在：{cdir}")
        raise SystemExit(1)

    novels = sorted([p for p in cdir.iterdir() if p.is_dir()], key=lambda p: p.name.lower())
    if not novels:
        error(f"{label} 下没有可发布小说。")
        raise SystemExit(1)

    info(f"{label} 下可发布小说：")
    for idx, ndir in enumerate(novels, start=1):
        total_files = sum(1 for p in ndir.rglob("*") if p.is_file())
        info(f"{idx}. {ndir.name} 预计上传 {total_files} 个文件")

    novel_idx = _ask_index("请输入小说编号：", len(novels))
    chosen = novels[novel_idx]
    info(f"已选择：{slug}/{chosen.name}")
    return Selection(
        category_slug=slug,
        category_label=label,
        novel_slug=chosen.name,
        source_dir=chosen,
    )


def confirm_publish(selection: Selection) -> bool:
    info("")
    warn("请确认是否继续上传：")
    info(f"- 分类: {selection.category_label}")
    info(f"- 小说目录: {selection.novel_slug}")
    info("1. 确认上传并推送 main")
    info("2. 取消")
    while True:
        raw = input("请输入编号：").strip()
        if raw == "1":
            return True
        if raw == "2":
            return False
        warn("输入无效，请输入 1 或 2。")


def _count_novels(category_dir: Path) -> int:
    if not category_dir.exists():
        return 0
    return sum(1 for p in category_dir.iterdir() if p.is_dir())


def _ask_index(prompt: str, total: int) -> int:
    while True:
        raw = input(prompt).strip()
        if not raw.isdigit():
            warn("输入无效，请输入数字编号。")
            continue
        idx = int(raw) - 1
        if idx < 0 or idx >= total:
            warn("编号超出范围，请重试。")
            continue
        return idx

