from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    slug: str
    label: str


CATEGORIES: tuple[Category, ...] = (
    Category("xuanhuan", "Xuanhuan（玄幻）"),
    Category("wuxia", "Wuxia（武侠）"),
    Category("urban", "Urban（城市）"),
    Category("historical", "Historical（历史）"),
    Category("gaming", "Gaming（游戏）"),
    Category("sci-fi", "Sci-Fi（科幻）"),
    Category("female", "Female（女性）"),
    Category("ranking", "Ranking（排名）"),
    Category("completed", "Completed（完本）"),
    Category("hot-essays", "Hot Essays（热门散文）"),
)

