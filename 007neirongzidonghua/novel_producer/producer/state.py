from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_progress(progress_path: Path) -> dict[str, Any]:
    if not progress_path.exists():
        return {
            "last_chapter_code": "",
            "chapters": {},
        }
    return json.loads(progress_path.read_text(encoding="utf-8"))


def save_progress(progress_path: Path, payload: dict[str, Any]) -> None:
    progress_path.parent.mkdir(parents=True, exist_ok=True)
    progress_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
