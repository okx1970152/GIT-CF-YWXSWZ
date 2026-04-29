from __future__ import annotations

import json
from pathlib import Path

from producer.models import SourceNovel, Workspace
from producer.parser import make_fallback_slug, make_novel_slug_from_glossary


def ensure_workspace(
    output_novels_root: Path,
    runtime_root: Path,
    source_novel: SourceNovel,
) -> Workspace:
    mapping_dir = runtime_root / "folder_mappings"
    mapping_dir.mkdir(parents=True, exist_ok=True)
    mapping_path = mapping_dir / f"{source_novel.category}--{source_novel.source_name}.json"
    prompt_prefix_dir = source_novel.source_dir / "00-提示词前缀"

    slug = _resolve_slug(mapping_path, source_novel, prompt_prefix_dir)

    novel_root = output_novels_root / source_novel.category / slug
    info_dir = novel_root / "info"
    chapters_dir = novel_root / "chapters"
    annotations_dir = novel_root / "annotations"
    meta_dir = novel_root / "meta"
    for path in (info_dir, chapters_dir, annotations_dir, meta_dir):
        path.mkdir(parents=True, exist_ok=True)

    runtime_key = f"{source_novel.category}--{source_novel.source_name}"
    novel_runtime_dir = runtime_root / "chapter_progress" / runtime_key
    novel_runtime_dir.mkdir(parents=True, exist_ok=True)
    progress_path = novel_runtime_dir / "progress.json"

    _save_mapping(mapping_path, source_novel, slug)

    return Workspace(
        category=source_novel.category,
        source_name=source_novel.source_name,
        cn_novel_name=source_novel.cn_novel_name,
        novel_slug=slug,
        novel_root=novel_root,
        info_dir=info_dir,
        chapters_dir=chapters_dir,
        annotations_dir=annotations_dir,
        meta_dir=meta_dir,
        runtime_dir=novel_runtime_dir,
        progress_path=progress_path,
        prompt_prefix_dir=prompt_prefix_dir,
    )


def _resolve_slug(mapping_path: Path, source_novel: SourceNovel, prompt_prefix_dir: Path) -> str:
    preferred = make_novel_slug_from_glossary(prompt_prefix_dir, source_novel.cn_novel_name)
    existing = _load_existing_slug(mapping_path)
    # 修复历史错误：旧映射曾把分类名误用为小说目录名（如 xuanhuan）。
    if existing and existing != source_novel.category:
        return existing
    if preferred:
        return preferred
    if existing:
        return existing
    return make_fallback_slug(source_novel)


def _load_existing_slug(mapping_path: Path) -> str:
    if not mapping_path.exists():
        return ""
    try:
        payload = json.loads(mapping_path.read_text(encoding="utf-8"))
    except Exception:
        return ""
    return str(payload.get("novel_slug", "")).strip()


def _save_mapping(mapping_path: Path, source_novel: SourceNovel, slug: str) -> None:
    payload = {
        "category": source_novel.category,
        "source_name": source_novel.source_name,
        "cn_novel_name": source_novel.cn_novel_name,
        "novel_slug": slug,
    }
    mapping_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
