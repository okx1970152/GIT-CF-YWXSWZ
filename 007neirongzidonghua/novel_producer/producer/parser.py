from __future__ import annotations

import re
from pathlib import Path

from producer.models import SourceNovel


SLUG_SAFE = re.compile(r"[^a-z0-9-]+")


def parse_source_folder_name(folder_name: str) -> tuple[str, str]:
    if "-" not in folder_name:
        raise ValueError(
            f"目录名 {folder_name} 不符合 <category>-<中文小说名> 规则，例如 xuanhuan-长生界。"
        )
    category, cn_name = folder_name.split("-", 1)
    category = category.strip().lower()
    cn_name = cn_name.strip()
    if not category or not cn_name:
        raise ValueError(f"目录名 {folder_name} 缺少分类或中文小说名。")
    return category, cn_name


def make_fallback_slug(source: SourceNovel) -> str:
    """首版先给稳定兜底 slug，后续再接模型生成正式英文名。"""
    base = f"{source.category}-{source.cn_novel_name}"
    normalized = base.encode("ascii", "ignore").decode("ascii").strip().lower().replace(" ", "-")
    normalized = SLUG_SAFE.sub("-", normalized).strip("-")
    if normalized:
        return normalized
    return f"{source.category}-series"


def make_novel_slug_from_glossary(prompt_prefix_dir: Path, cn_novel_name: str) -> str:
    """
    从 3-核心术语表中提取小说英文名并转为 slug。
    优先顺序：
    1) 文件头部标题中的英文书名（例如 for "World of Immortality"）
    2) 术语表里与中文名匹配的行（例如 | 长生界 | **World of Immortality** |）
    """
    glossary_path = prompt_prefix_dir / "3-核心术语表 (Core Glossary & Lexicon).md"
    if not glossary_path.exists():
        return ""

    content = glossary_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    header_en = _extract_english_from_header(lines[:40])
    if header_en:
        return _to_slug(header_en)

    table_en = _extract_english_from_table(lines, cn_novel_name)
    if table_en:
        return _to_slug(table_en)

    return ""


def _extract_english_from_header(lines: list[str]) -> str:
    for line in lines:
        text = line.strip()
        if not text.startswith("#"):
            continue
        m = re.search(r'for\s+"([^"]+)"', text, flags=re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


def _extract_english_from_table(lines: list[str], cn_novel_name: str) -> str:
    target = cn_novel_name.strip()
    for line in lines:
        text = line.strip()
        if not text.startswith("|"):
            continue
        parts = [part.strip() for part in text.split("|")]
        if len(parts) < 4:
            continue
        cn_term = parts[1]
        en_term = parts[2]
        if cn_term != target:
            continue
        clean = re.sub(r"\*\*|`", "", en_term).strip()
        if clean:
            return clean
    return ""


def _to_slug(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", value.strip()).strip("-").lower()
    return normalized
