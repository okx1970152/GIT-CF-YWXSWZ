from __future__ import annotations

from producer.config import get_settings
from producer.processor import process_workspace
from producer.prompts import ensure_prompt_prefix_files
from producer.filesystem import ensure_workspace
from producer.logger import info
from producer.selector import choose_source_novel, ensure_category_directories
from producer.state import load_progress, save_progress


def run() -> None:
    settings = get_settings()
    ensure_category_directories(settings.source_root, settings.output_novels_root)
    settings.runtime_root.mkdir(parents=True, exist_ok=True)

    selected = choose_source_novel(settings.source_root)
    workspace = ensure_workspace(settings.output_novels_root, settings.runtime_root, selected)

    progress = load_progress(workspace.progress_path)
    save_progress(workspace.progress_path, progress)
    ensure_prompt_prefix_files(workspace.prompt_prefix_dir)

    info("")
    info("novel_producer 准备完成：")
    info(f"- 源目录: {selected.source_dir}")
    info(f"- 分类: {workspace.category}")
    info(f"- 中文名: {workspace.cn_novel_name}")
    info(f"- 目标 slug: {workspace.novel_slug}")
    info(f"- 输出根目录: {workspace.novel_root}")
    info(f"- 章节目录: {workspace.chapters_dir}")
    info(f"- 导读目录: {workspace.annotations_dir}")
    info(f"- meta目录: {workspace.meta_dir}")
    info(f"- 进度文件: {workspace.progress_path}")
    info("")
    info("开始执行章节处理（正文+导读+meta）...")
    process_workspace(settings, workspace)
