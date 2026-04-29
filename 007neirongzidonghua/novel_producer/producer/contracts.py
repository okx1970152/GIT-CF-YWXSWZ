from __future__ import annotations

import json
import re
from typing import Any


def extract_json_object(text: str) -> dict[str, Any]:
    fenced = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL | re.IGNORECASE)
    candidate = fenced.group(1) if fenced else _find_braced_json(text)
    if not candidate:
        raise ValueError("No JSON object found in model response.")
    data = json.loads(candidate)
    if not isinstance(data, dict):
        raise ValueError("Top-level JSON must be object.")
    return data


def ensure_string(value: Any, default: str = "") -> str:
    text = str(value).strip() if value is not None else ""
    return text or default


def ensure_list_of_strings(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _find_braced_json(text: str) -> str | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]
