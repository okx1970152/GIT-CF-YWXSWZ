from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Selection:
    category_slug: str
    category_label: str
    novel_slug: str
    source_dir: Path

