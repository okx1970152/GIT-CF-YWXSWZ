from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CategoryDef:
    slug: str
    source_dir_name: str
    output_dir_name: str
    label: str


CATEGORY_DEFS: tuple[CategoryDef, ...] = (
    CategoryDef("xuanhuan", "Xuanhuan（玄幻）", "xuanhuan", "Xuanhuan（玄幻）"),
    CategoryDef("wuxia", "Wuxia（武侠）", "wuxia", "Wuxia（武侠）"),
    CategoryDef("urban", "Urban（城市）", "urban", "Urban（城市）"),
    CategoryDef("historical", "Historical（历史）", "historical", "Historical（历史）"),
    CategoryDef("gaming", "Gaming（游戏）", "gaming", "Gaming（游戏）"),
    CategoryDef("sci-fi", "Sci-Fi（科幻）", "sci-fi", "Sci-Fi（科幻）"),
    CategoryDef("female", "Female（女性）", "female", "Female（女性）"),
    CategoryDef("ranking", "Ranking（排名）", "ranking", "Ranking（排名）"),
    CategoryDef("completed", "Completed（完本）", "completed", "Completed（完本）"),
    CategoryDef("hot-essays", "Hot Essays（热门散文）", "hot-essays", "Hot Essays（热门散文）"),
)

