from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    source_root: Path
    output_novels_root: Path
    runtime_root: Path
    update_info_every_n_chapters: int
    deepseek_model: str
    deepseek_base_url: str
    max_chapters_per_run: int


def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[1]
    source_root = project_root / "data" / "01-sucai"
    max_chapters = int(os.environ.get("PRODUCER_MAX_CHAPTERS", "0"))
    return Settings(
        project_root=project_root,
        source_root=source_root,
        output_novels_root=project_root / "novels",
        runtime_root=project_root / "runtime",
        update_info_every_n_chapters=100,
        deepseek_model="deepseek-v4-flash",
        deepseek_base_url="https://api.deepseek.com",
        max_chapters_per_run=max_chapters,
    )
