from __future__ import annotations

import json
import re
from pathlib import Path

from producer.models import Workspace


def word_count(text: str) -> int:
    return len([token for token in re.split(r"\s+", text.strip()) if token])


def validate_commentary_contract(commentary_text: str) -> list[str]:
    errors: list[str] = []
    if not commentary_text.strip():
        return ["commentary_text 为空"]

    required_headings = [
        "## Chapter Overview",
        "## Key Plot Points",
        "## Cultural / Xianxia Notes",
        "## Reading Guide",
    ]
    indices = []
    for heading in required_headings:
        idx = commentary_text.find(heading)
        if idx == -1:
            errors.append(f"缺少分节标题：{heading}")
        indices.append(idx)
    if all(i >= 0 for i in indices):
        if indices != sorted(indices):
            errors.append("四个分节标题顺序不正确")
        heading_count = commentary_text.count("## ")
        if heading_count != 4:
            errors.append("commentary_text 只能包含四个二级标题")

    if word_count(commentary_text) < 450:
        errors.append("commentary_text 总词数低于 450")
    return errors


def validate_chapter_artifacts(story_path: Path, guide_path: Path, meta_path: Path) -> list[str]:
    errors: list[str] = []
    if not story_path.exists():
        errors.append(f"缺少正文文件：{story_path.name}")
    if not guide_path.exists():
        errors.append(f"缺少导读文件：{guide_path.name}")
    if not meta_path.exists():
        errors.append(f"缺少章节 meta：{meta_path.name}")

    if errors:
        return errors

    if not re.match(r"^\d{4}\.md$", guide_path.name):
        errors.append("导读文件命名必须为 <chapter_no>.md")
    if not re.match(r"^\d{4}\.json$", meta_path.name):
        errors.append("章节 meta 文件命名必须为 <chapter_no>.json")

    try:
        payload = json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception:
        return ["章节 meta 不是合法 JSON"]

    required_fields = [
        "chapter_seo_title",
        "chapter_meta_description",
        "chapter_keywords",
        "guide_tags",
        "og_title",
        "og_description",
        "twitter_title",
        "twitter_description",
    ]
    for key in required_fields:
        if key not in payload:
            errors.append(f"章节 meta 缺少字段：{key}")
    return errors


def validate_workspace_contract(workspace: Workspace) -> list[str]:
    errors: list[str] = []
    info_path = workspace.info_dir / "index.md"
    if not info_path.exists():
        errors.append("info/index.md 不存在")
    else:
        raw = info_path.read_text(encoding="utf-8")
        if "summary:" not in raw:
            errors.append("info/index.md 缺少 summary 字段")
        if "title_en:" not in raw:
            errors.append("info/index.md 缺少 title_en 字段")

    novel_meta_path = workspace.meta_dir / "novel.json"
    if not novel_meta_path.exists():
        errors.append("meta/novel.json 不存在")
    else:
        try:
            novel_meta = json.loads(novel_meta_path.read_text(encoding="utf-8"))
        except Exception:
            errors.append("meta/novel.json 非法 JSON")
            novel_meta = {}
        for key in ("seo_title", "meta_description", "keywords", "og_title", "og_description", "twitter_title", "twitter_description"):
            if key not in novel_meta:
                errors.append(f"meta/novel.json 缺少字段：{key}")

    chapter_numbers = set()
    for chapter_file in workspace.chapters_dir.glob("*.md"):
        m = re.match(r"^(\d{4})-[A-Za-z0-9-]+\.md$", chapter_file.name)
        if not m:
            continue
        chapter_no = m.group(1)
        if chapter_no in chapter_numbers:
            errors.append(f"发现重复章节号：{chapter_no}")
        chapter_numbers.add(chapter_no)
        guide_path = workspace.annotations_dir / f"{chapter_no}.md"
        meta_path = workspace.meta_dir / f"{chapter_no}.json"
        errors.extend(validate_chapter_artifacts(chapter_file, guide_path, meta_path))
    return errors
