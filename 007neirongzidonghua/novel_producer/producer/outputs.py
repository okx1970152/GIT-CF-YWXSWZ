from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def save_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


def save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def slugify(value: str, fallback: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9]+", "-", value.strip())
    normalized = normalized.strip("-")
    return normalized or fallback
