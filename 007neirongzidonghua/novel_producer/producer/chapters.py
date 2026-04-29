from __future__ import annotations

import re
from pathlib import Path

from producer.models import ChapterSource

CHAPTER_TXT_PATTERN = re.compile(r"^(?P<num>\d+)-(?P<title>.+)\.txt$", re.IGNORECASE)


def discover_chapters(source_dir: Path) -> list[ChapterSource]:
    chapters: list[ChapterSource] = []
    for path in sorted(source_dir.glob("*.txt"), key=lambda p: p.name.lower()):
        parsed = parse_chapter(path)
        if parsed:
            chapters.append(parsed)
    chapters.sort(key=lambda c: c.chapter_number)
    return chapters


def parse_chapter(path: Path) -> ChapterSource | None:
    match = CHAPTER_TXT_PATTERN.match(path.name)
    if not match:
        return None
    num = int(match.group("num"))
    title = match.group("title").strip()
    chapter_code = str(num).zfill(4)
    return ChapterSource(
        chapter_number=num,
        chapter_code=chapter_code,
        chapter_title_cn=title,
        source_path=path,
    )
