from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SourceNovel:
    category: str
    source_name: str
    source_dir: Path
    cn_novel_name: str


@dataclass(frozen=True)
class Workspace:
    category: str
    source_name: str
    cn_novel_name: str
    novel_slug: str
    novel_root: Path
    info_dir: Path
    chapters_dir: Path
    annotations_dir: Path
    meta_dir: Path
    runtime_dir: Path
    progress_path: Path
    prompt_prefix_dir: Path


@dataclass(frozen=True)
class ChapterSource:
    chapter_number: int
    chapter_code: str
    chapter_title_cn: str
    source_path: Path
