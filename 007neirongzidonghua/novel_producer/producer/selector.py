from __future__ import annotations

from pathlib import Path

from producer.categories import CATEGORY_DEFS, CategoryDef
from producer.chapters import discover_chapters
from producer.logger import error, info, warn
from producer.models import SourceNovel


def ensure_category_directories(source_root: Path, output_novels_root: Path) -> None:
    source_root.mkdir(parents=True, exist_ok=True)
    output_novels_root.mkdir(parents=True, exist_ok=True)
    for cat in CATEGORY_DEFS:
        (source_root / cat.source_dir_name).mkdir(parents=True, exist_ok=True)
        (output_novels_root / cat.output_dir_name).mkdir(parents=True, exist_ok=True)


def discover_source_novels(source_root: Path) -> list[SourceNovel]:
    novels: list[SourceNovel] = []
    for cat in CATEGORY_DEFS:
        for item in _collect_novel_dirs(source_root, cat):
            novels.append(
                SourceNovel(
                    category=cat.output_dir_name,
                    source_name=item.name,
                    source_dir=item,
                    cn_novel_name=_resolve_cn_name(item, cat),
                )
            )
    return novels


def choose_source_novel(source_root: Path) -> SourceNovel:
    category_pick = _choose_category(source_root)
    return _choose_novel_in_category(source_root, category_pick)


def _choose_category(source_root: Path) -> CategoryDef:
    info("发现以下分类目录：")
    for idx, cat in enumerate(CATEGORY_DEFS, start=1):
        count = len(_collect_novel_dirs(source_root, cat))
        info(f"{idx}. {cat.label} 扫描到 {count} 部小说")

    while True:
        raw = input("请输入编号选择要处理的分类：").strip()
        if not raw.isdigit():
            warn("输入无效，请输入数字编号。")
            continue
        pos = int(raw)
        if pos < 1 or pos > len(CATEGORY_DEFS):
            warn("编号超出范围，请重试。")
            continue
        selected = CATEGORY_DEFS[pos - 1]
        info(f"已选择分类：{selected.label}")
        return selected


def _choose_novel_in_category(source_root: Path, cat: CategoryDef) -> SourceNovel:
    novels = _collect_novel_dirs(source_root, cat)

    if not novels:
        error(f"{cat.label} 下没有可处理小说，请先放入小说目录。")
        raise SystemExit(1)

    info(f"{cat.label} 下可处理小说如下：")
    for idx, novel_dir in enumerate(novels, start=1):
        txt_count = len(discover_chapters(novel_dir))
        info(f"{idx}. {novel_dir.name} 扫描到 {txt_count} 个TXT文件")

    while True:
        raw = input("请输入编号选择要处理的小说：").strip()
        if not raw.isdigit():
            warn("输入无效，请输入数字编号。")
            continue
        pos = int(raw)
        if pos < 1 or pos > len(novels):
            warn("编号超出范围，请重试。")
            continue
        chosen = novels[pos - 1]
        info(f"已选择小说：{chosen.name}")
        return SourceNovel(
            category=cat.output_dir_name,
            source_name=chosen.name,
            source_dir=chosen,
            cn_novel_name=_resolve_cn_name(chosen, cat),
        )


def _collect_novel_dirs(source_root: Path, cat: CategoryDef) -> list[Path]:
    cat_source_dir = source_root / cat.source_dir_name
    if not cat_source_dir.exists():
        return []
    return sorted([p for p in cat_source_dir.iterdir() if p.is_dir()], key=lambda p: p.name.lower())


def _resolve_cn_name(path: Path, cat: CategoryDef) -> str:
    if path.parent.name != cat.source_dir_name:
        warn(f"检测到目录位置不标准：{path}，将按目录名作为中文名。")
    return path.name
