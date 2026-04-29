from __future__ import annotations

from pathlib import Path

REQUIRED_PREFIX_FILES = (
    "1-风格与世界观指南 (Style & Lore Guide).md",
    "2-核心角色关系与性格文档 (Character Profiles & Voice Guide).md",
    "3-核心术语表 (Core Glossary & Lexicon).md",
    "4-高质量翻译提示词.md",
    "5-高质量解说提示词.md",
    "6-增量术语与临时规则.md",
)


def ensure_prompt_prefix_files(prompt_prefix_dir: Path) -> None:
    missing = [name for name in REQUIRED_PREFIX_FILES if not (prompt_prefix_dir / name).exists()]
    if missing:
        joined = "\n".join(f"- {name}" for name in missing)
        raise SystemExit(
            "提示词前缀目录缺少必要文件，请补齐后再运行：\n"
            f"{joined}\n"
            f"目录: {prompt_prefix_dir}"
        )


def load_story_prompt_bundle(prompt_prefix_dir: Path) -> str:
    return _join_files(
        prompt_prefix_dir,
        [
            "1-风格与世界观指南 (Style & Lore Guide).md",
            "2-核心角色关系与性格文档 (Character Profiles & Voice Guide).md",
            "3-核心术语表 (Core Glossary & Lexicon).md",
            "4-高质量翻译提示词.md",
            "6-增量术语与临时规则.md",
        ],
    )


def load_guide_prompt_bundle(prompt_prefix_dir: Path) -> str:
    return _join_files(
        prompt_prefix_dir,
        [
            "1-风格与世界观指南 (Style & Lore Guide).md",
            "2-核心角色关系与性格文档 (Character Profiles & Voice Guide).md",
            "3-核心术语表 (Core Glossary & Lexicon).md",
            "5-高质量解说提示词.md",
            "6-增量术语与临时规则.md",
        ],
    )


def append_incremental_rules(prompt_prefix_dir: Path, lines: list[str]) -> None:
    if not lines:
        return
    incremental = prompt_prefix_dir / "6-增量术语与临时规则.md"
    existing = incremental.read_text(encoding="utf-8").rstrip() if incremental.exists() else ""
    block = "\n".join(f"- {line}" for line in lines if line.strip())
    if not block:
        return
    merged = (existing + "\n\n" + block).strip() + "\n"
    incremental.write_text(merged, encoding="utf-8")


def _join_files(prompt_prefix_dir: Path, names: list[str]) -> str:
    parts: list[str] = []
    for name in names:
        content = (prompt_prefix_dir / name).read_text(encoding="utf-8").strip()
        if not content:
            continue
        parts.append(f"[FILE: {name}]\n{content}")
    return "\n\n".join(parts)
