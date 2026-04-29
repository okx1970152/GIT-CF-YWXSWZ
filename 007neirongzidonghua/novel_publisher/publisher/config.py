from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


DEFAULT_CONTENT_REPO_URL = "https://github.com/okx1970152/GIT-CF-YWXS.git"


@dataclass(frozen=True)
class Settings:
    project_root: Path
    producer_novels_root: Path
    runtime_root: Path
    repo_workdir: Path
    content_repo_url: str
    github_token: str
    proxy_candidates: tuple[str, str]


def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[1]
    _load_dotenv_file(project_root / ".env")
    runtime_root = project_root / "runtime"
    return Settings(
        project_root=project_root,
        producer_novels_root=project_root.parent / "novel_producer" / "novels",
        runtime_root=runtime_root,
        repo_workdir=runtime_root / "_content_repo",
        content_repo_url=os.environ.get("CONTENT_REPO_URL", DEFAULT_CONTENT_REPO_URL).strip(),
        github_token=os.environ.get("GITHUB_TOKEN", "").strip(),
        proxy_candidates=("http://127.0.0.1:10809", "http://127.0.0.1:10808"),
    )


def _load_dotenv_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue
        key, value = text.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value

