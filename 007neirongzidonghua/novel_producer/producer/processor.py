from __future__ import annotations

from datetime import date
from pathlib import Path
import re

from producer.chapters import discover_chapters
from producer.config import Settings
from producer.contracts import ensure_list_of_strings, ensure_string, extract_json_object
from producer.deepseek_client import DeepSeekClient
from producer.logger import error, info, warn
from producer.models import Workspace
from producer.outputs import save_json, save_text, slugify
from producer.prompts import append_incremental_rules, load_guide_prompt_bundle, load_story_prompt_bundle
from producer.state import load_progress, save_progress
from producer.validator import (
    validate_chapter_artifacts,
    validate_commentary_contract,
    validate_workspace_contract,
    word_count,
)


def process_workspace(settings: Settings, workspace: Workspace) -> None:
    chapters = discover_chapters(workspace.prompt_prefix_dir.parent)
    if not chapters:
        error(f"未发现章节 txt 文件：{workspace.prompt_prefix_dir.parent}")
        raise SystemExit(1)
    if settings.max_chapters_per_run > 0:
        chapters = chapters[: settings.max_chapters_per_run]

    progress = load_progress(workspace.progress_path)
    chapter_state: dict = progress.get("chapters", {})

    client = DeepSeekClient(settings)
    created_info = _ensure_novel_info(workspace, len(chapters))
    _ensure_novel_meta(workspace, len(chapters))

    if created_info or _info_has_placeholder(workspace.info_dir / "index.md"):
        seed = chapters[0]
        seed_text = seed.source_path.read_text(encoding="utf-8").strip()
        info("正在生成小说级信息（首章初始化/占位兜底修复）...")
        _refresh_novel_info(
            client=client,
            workspace=workspace,
            chapter_code=seed.chapter_code,
            chapter_text=seed_text,
            chapter_title_en="",
            chapter_keywords=[],
            total_chapters=len(chapters),
        )

    story_bundle = load_story_prompt_bundle(workspace.prompt_prefix_dir)
    guide_bundle = load_guide_prompt_bundle(workspace.prompt_prefix_dir)

    info(f"共发现 {len(chapters)} 章，开始执行章节处理...")
    for chapter in chapters:
        rec = chapter_state.get(chapter.chapter_code, {})
        if rec.get("ready_for_publish"):
            warn(f"[{chapter.chapter_code}] 已完成，跳过。")
            continue

        source_text = chapter.source_path.read_text(encoding="utf-8").strip()
        chapter_slug = ensure_string(rec.get("chapter_slug"), "")

        info(f"[{chapter.chapter_code}] 正在调用大模型翻译正文：{chapter.source_path.name}")
        story_payload = _run_story_pass(client, chapter.chapter_code, source_text, story_bundle)

        chapter_title_en = ensure_string(story_payload.get("chapter_title_en"), f"Chapter {chapter.chapter_code}")
        chapter_slug = chapter_slug or slugify(chapter_title_en, f"chapter-{chapter.chapter_code}")

        info(f"[{chapter.chapter_code}] 正在调用大模型生成导读：{chapter.source_path.name}")
        guide_payload = _run_guide_pass(client, chapter.chapter_code, source_text, guide_bundle)

        guide_text = ensure_string(guide_payload.get("commentary_text"), "").strip()
        commentary_errors = validate_commentary_contract(guide_text)
        if commentary_errors:
            warn(f"[{chapter.chapter_code}] 导读结构校验失败，尝试重试一次：{'; '.join(commentary_errors)}")
            guide_payload = _run_guide_pass(client, chapter.chapter_code, source_text, guide_bundle)
            guide_text = ensure_string(guide_payload.get("commentary_text"), "").strip()
            commentary_errors = validate_commentary_contract(guide_text)
            if commentary_errors:
                error(f"[{chapter.chapter_code}] 导读结构仍不合规：{'; '.join(commentary_errors)}")
                raise SystemExit(1)

        incremental_updates = (
            ensure_list_of_strings(story_payload.get("glossary_updates"))
            + ensure_list_of_strings(story_payload.get("style_updates"))
            + ensure_list_of_strings(story_payload.get("character_updates"))
            + ensure_list_of_strings(guide_payload.get("glossary_updates"))
            + ensure_list_of_strings(guide_payload.get("style_updates"))
            + ensure_list_of_strings(guide_payload.get("character_updates"))
        )
        append_incremental_rules(workspace.prompt_prefix_dir, incremental_updates)

        keywords = ensure_list_of_strings(guide_payload.get("chapter_keywords"))
        guide_tags = ensure_list_of_strings(guide_payload.get("guide_tags"))
        today = date.today().isoformat()
        story_text = ensure_string(story_payload.get("story_text"), source_text)
        story_word_count = word_count(story_text)

        story_md = (
            "---\n"
            f'title: "{_yaml_safe(chapter_title_en)}"\n'
            f'chapter_no: "{chapter.chapter_code}"\n'
            f'published_at: "{today}"\n'
            f'updated_at: "{today}"\n'
            f"word_count: {story_word_count}\n"
            "---\n\n"
            f"{story_text}\n"
        )
        guide_body = guide_text + _related_topics_footer_from_tags(guide_tags)
        guide_md = (
            "---\n"
            f'title: "{_yaml_safe(ensure_string(guide_payload.get("guide_title"), "Essential Guide"))}"\n'
            f'chapter_no: "{chapter.chapter_code}"\n'
            f'updated_at: "{today}"\n'
            "---\n\n"
            f"{guide_body}\n"
        )

        chapter_seo_title = ensure_string(guide_payload.get("chapter_seo_title"), chapter_title_en)
        chapter_meta_description = ensure_string(
            guide_payload.get("chapter_meta_description"),
            ensure_string(story_payload.get("chapter_meta_description"), ""),
        )
        og_title = ensure_string(guide_payload.get("og_title"), chapter_seo_title)
        og_description = ensure_string(guide_payload.get("og_description"), chapter_meta_description)
        twitter_title = ensure_string(guide_payload.get("twitter_title"), og_title)
        twitter_description = ensure_string(guide_payload.get("twitter_description"), og_description)

        chapter_meta = {
            "chapter_no": chapter.chapter_code,
            "chapter_code": chapter.chapter_code,
            "chapter_slug": chapter_slug,
            "chapter_title_en": chapter_title_en,
            "chapter_keywords": keywords,
            "guide_tags": guide_tags,
            "chapter_seo_title": chapter_seo_title,
            "chapter_meta_description": chapter_meta_description,
            "og_title": og_title,
            "og_description": og_description,
            "twitter_title": twitter_title,
            "twitter_description": twitter_description,
            "updated_at": today,
        }

        story_path = workspace.chapters_dir / f"{chapter.chapter_code}-{chapter_slug}.md"
        guide_path = workspace.annotations_dir / f"{chapter.chapter_code}.md"
        meta_path = workspace.meta_dir / f"{chapter.chapter_code}.json"

        _cleanup_legacy_outputs(workspace, chapter.chapter_code, keep_story_name=story_path.name)
        save_text(story_path, story_md)
        save_text(guide_path, guide_md)
        save_json(meta_path, chapter_meta)

        artifact_errors = validate_chapter_artifacts(story_path, guide_path, meta_path)
        if artifact_errors:
            error(f"[{chapter.chapter_code}] 落盘后校验失败：{'; '.join(artifact_errors)}")
            raise SystemExit(1)

        chapter_state[chapter.chapter_code] = {
            "chapter_code": chapter.chapter_code,
            "chapter_slug": chapter_slug,
            "source_file": str(chapter.source_path),
            "story_file": str(story_path),
            "guide_file": str(guide_path),
            "meta_file": str(meta_path),
            "story_done": True,
            "guide_done": True,
            "meta_done": True,
            "ready_for_publish": True,
        }
        progress["last_chapter_code"] = chapter.chapter_code
        progress["chapters"] = chapter_state
        save_progress(workspace.progress_path, progress)
        info(f"[{chapter.chapter_code}] 已接收并保存正文/导读/meta。")

        if _should_refresh_novel_info(workspace.info_dir / "index.md", chapter.chapter_number):
            info(f"[{chapter.chapter_code}] 触发小说级信息刷新...")
            _refresh_novel_info(
                client=client,
                workspace=workspace,
                chapter_code=chapter.chapter_code,
                chapter_text=source_text,
                chapter_title_en=chapter_title_en,
                chapter_keywords=keywords,
                total_chapters=len(chapters),
            )

    workspace_errors = validate_workspace_contract(workspace)
    if workspace_errors:
        error(f"工作区严格校验失败：{'; '.join(workspace_errors)}")
        raise SystemExit(1)
    info("章节处理完成。")


def _cleanup_legacy_outputs(workspace: Workspace, chapter_code: str, keep_story_name: str) -> None:
    for old in workspace.annotations_dir.glob(f"{chapter_code}-*-guide.md"):
        try:
            old.unlink()
        except Exception:
            pass
    for old in workspace.meta_dir.glob(f"{chapter_code}-*.json"):
        try:
            old.unlink()
        except Exception:
            pass
    for old in workspace.chapters_dir.glob(f"{chapter_code}-*.md"):
        if old.name == keep_story_name:
            continue
        try:
            old.unlink()
        except Exception:
            pass


def _ensure_novel_info(workspace: Workspace, total_chapters: int) -> bool:
    info_path = workspace.info_dir / "index.md"
    if info_path.exists():
        _patch_existing_info_contract(info_path, workspace.novel_slug)
        return False
    content = (
        "---\n"
        f'title: "{workspace.cn_novel_name}"\n'
        'title_en: ""\n'
        'author: "Anonymous"\n'
        f'category: "{workspace.category.title()}"\n'
        f'novel_id: "{workspace.novel_slug}"\n'
        'summary: "TBD by model on first full pass."\n'
        'desc: "TBD by model on first full pass."\n'
        f"total_chapters: {total_chapters}\n"
        'status: "Ongoing"\n'
        'cover: ""\n'
        'hero: ""\n'
        "featured: false\n"
        "hot: false\n"
        "ranking: 0\n"
        f'updated_at: "{date.today().isoformat()}"\n'
        "tags: []\n"
        "---\n"
    )
    save_text(info_path, content)
    return True


def _patch_existing_info_contract(info_path: Path, novel_slug: str) -> None:
    raw = info_path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        return

    lines = raw.splitlines()
    if len(lines) < 3:
        return

    changed = False

    def _ensure_line(prefix: str, line_value: str, insert_at: int = 1) -> None:
        nonlocal changed
        for idx, line in enumerate(lines):
            if line.startswith(prefix):
                if not line.strip().split(":", 1)[1].strip():
                    lines[idx] = line_value
                    changed = True
                return
        lines.insert(insert_at, line_value)
        changed = True

    insert_at = 2 if len(lines) > 2 and lines[1].startswith("title:") else 1
    _ensure_line("title_en:", 'title_en: ""', insert_at)
    _ensure_line("author:", 'author: "Anonymous"', insert_at + 1)
    _ensure_line("summary:", 'summary: ""', insert_at + 2)

    desc_value = ""
    summary_idx = -1
    desc_idx = -1
    for idx, line in enumerate(lines):
        if line.startswith("summary:"):
            summary_idx = idx
        if line.startswith("desc:"):
            desc_idx = idx
            desc_value = line.split(":", 1)[1].strip()
    if summary_idx != -1 and desc_idx != -1:
        summary_value = lines[summary_idx].split(":", 1)[1].strip()
        if (not summary_value or summary_value in ('""', "''")) and desc_value:
            lines[summary_idx] = f"summary: {desc_value}"
            changed = True
    if desc_idx == -1 and summary_idx != -1:
        summary_value = lines[summary_idx].split(":", 1)[1].strip() or '""'
        lines.insert(summary_idx + 1, f"desc: {summary_value}")
        changed = True

    for idx, line in enumerate(lines):
        if line.startswith("novel_id:"):
            desired = f'novel_id: "{novel_slug}"'
            if line != desired:
                lines[idx] = desired
                changed = True
            break

    if changed:
        info_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _ensure_novel_meta(workspace: Workspace, total_chapters: int) -> None:
    novel_meta_path = workspace.meta_dir / "novel.json"
    if novel_meta_path.exists():
        return
    payload = {
        "title": workspace.cn_novel_name,
        "title_en": workspace.novel_slug.replace("-", " ").title(),
        "slug": workspace.novel_slug,
        "category": workspace.category,
        "summary": "",
        "status": "Ongoing",
        "featured": False,
        "hot": False,
        "tags": [],
        "keywords": [],
        "seo_title": "",
        "meta_description": "",
        "og_title": "",
        "og_description": "",
        "twitter_title": "",
        "twitter_description": "",
        "chapter_count": total_chapters,
        "updated_at": date.today().isoformat(),
    }
    save_json(novel_meta_path, payload)


def _should_refresh_novel_info(info_path: Path, chapter_number: int) -> bool:
    if chapter_number == 1 or chapter_number % 100 == 0:
        return True
    return _info_has_placeholder(info_path)


def _info_has_placeholder(info_path: Path) -> bool:
    if not info_path.exists():
        return True
    raw = info_path.read_text(encoding="utf-8")
    for key in ("summary", "desc"):
        m = re.search(rf'^\s*{key}:\s*"?(.*?)"?\s*$', raw, flags=re.MULTILINE)
        if m:
            value = m.group(1).strip().lower()
            if not value or "tbd" in value or "first full pass" in value:
                return True
    return False


def _refresh_novel_info(
    client: DeepSeekClient,
    workspace: Workspace,
    chapter_code: str,
    chapter_text: str,
    chapter_title_en: str,
    chapter_keywords: list[str],
    total_chapters: int,
) -> None:
    info_path = workspace.info_dir / "index.md"
    preserved = _read_preserved_info_fields(info_path)

    payload = _run_novel_info_pass(
        client=client,
        chapter_code=chapter_code,
        chapter_text=chapter_text,
        cn_novel_name=workspace.cn_novel_name,
        category=workspace.category.title(),
        novel_slug=workspace.novel_slug,
        chapter_title_en=chapter_title_en,
        chapter_keywords=chapter_keywords,
    )
    title_cn = ensure_string(payload.get("title"), workspace.cn_novel_name).strip() or workspace.cn_novel_name
    title_en = ensure_string(payload.get("title_en"), "").strip() or workspace.novel_slug.replace("-", " ").title()
    summary = ensure_string(payload.get("summary"), "").strip()
    if not summary:
        summary = f"{title_en} is an ongoing {workspace.category.title()} web novel with cultivation themes."
    tags = [item for item in ensure_list_of_strings(payload.get("tags")) if item.strip()]
    if not tags and chapter_keywords:
        tags = chapter_keywords[:10]
    keywords = [item.strip() for item in tags if item.strip()][:15]
    seo_title = f"{title_en} - {workspace.category.title()} Novel Directory".strip()
    meta_description = summary[:160]
    today = date.today().isoformat()
    tags_yaml = ", ".join(f'"{_yaml_safe(item)}"' for item in tags[:20])

    cover_val = preserved.get("cover") if isinstance(preserved.get("cover"), str) else ""
    hero_val = preserved.get("hero") if isinstance(preserved.get("hero"), str) else ""
    featured_val = bool(preserved.get("featured", False))
    hot_val = bool(preserved.get("hot", False))
    ranking_val = int(preserved.get("ranking") or 0)

    info_content = (
        "---\n"
        f'title: "{_yaml_safe(title_cn)}"\n'
        f'title_en: "{_yaml_safe(title_en)}"\n'
        'author: "Anonymous"\n'
        f'category: "{_yaml_safe(workspace.category.title())}"\n'
        f'novel_id: "{_yaml_safe(workspace.novel_slug)}"\n'
        f'summary: "{_yaml_safe(summary)}"\n'
        f'desc: "{_yaml_safe(summary)}"\n'
        f"total_chapters: {total_chapters}\n"
        f'status: "{_yaml_safe(ensure_string(payload.get("status"), "Ongoing"))}"\n'
        f'cover: "{_yaml_safe(cover_val)}"\n'
        f'hero: "{_yaml_safe(hero_val)}"\n'
        f"featured: {str(featured_val).lower()}\n"
        f"hot: {str(hot_val).lower()}\n"
        f"ranking: {ranking_val}\n"
        f'updated_at: "{today}"\n'
        f"tags: [{tags_yaml}]\n"
        "---\n"
    )
    save_text(info_path, info_content)

    novel_meta_path = workspace.meta_dir / "novel.json"
    meta_payload = {
        "title": title_cn,
        "title_en": title_en,
        "slug": workspace.novel_slug,
        "category": workspace.category,
        "summary": summary,
        "status": ensure_string(payload.get("status"), "Ongoing"),
        "featured": featured_val,
        "hot": hot_val,
        "tags": tags[:20],
        "keywords": keywords,
        "seo_title": seo_title,
        "meta_description": meta_description,
        "og_title": seo_title,
        "og_description": meta_description,
        "twitter_title": seo_title,
        "twitter_description": meta_description,
        "chapter_count": total_chapters,
        "updated_at": today,
    }
    save_json(novel_meta_path, meta_payload)


def _yaml_safe(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _parse_fm_string(rest: str) -> str:
    rest = rest.strip()
    if len(rest) >= 2 and rest[0] == rest[-1] and rest[0] in "\"'":
        return rest[1:-1].replace('\\"', '"')
    return rest


def _read_preserved_info_fields(info_path: Path) -> dict[str, object]:
    """刷新小说级 YAML 时保留运营字段（封面/精选等多为空字符串）。"""
    result: dict[str, object] = {
        "cover": "",
        "hero": "",
        "featured": False,
        "hot": False,
        "ranking": 0,
    }
    if not info_path.exists():
        return result
    raw = info_path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        return result
    start = 4 if raw.startswith("---\n") else 3
    fm_end = raw.find("\n---", start)
    if fm_end == -1:
        return result
    fm = raw[start:fm_end].strip()
    for raw_line in fm.splitlines():
        line = raw_line.strip()
        if ":" not in line:
            continue
        key, rest = line.split(":", 1)
        key = key.strip()
        rest = rest.strip()
        if key == "cover":
            result["cover"] = _parse_fm_string(rest)
        elif key == "hero":
            result["hero"] = _parse_fm_string(rest)
        elif key == "featured":
            result["featured"] = rest.lower() in ("true", "yes", "1")
        elif key == "hot":
            result["hot"] = rest.lower() in ("true", "yes", "1")
        elif key == "ranking":
            try:
                result["ranking"] = int(float(rest))
            except ValueError:
                pass
    return result


def _related_topics_footer_from_tags(guide_tags: list[str]) -> str:
    """与索引脚本 parseRelatedTopics 兼容；站点纯文字，标签来自 meta guide_tags。"""
    cleaned = [t.strip() for t in guide_tags if t.strip()][:20]
    if not cleaned:
        return ""
    parts: list[str] = []
    for t in cleaned:
        token = re.sub(r"[^A-Za-z0-9_-]+", "-", t)
        token = token.strip("-") or "topic"
        parts.append(f"#{token}")
    return "\n\nRelated Topics: " + " ".join(parts) + "\n"


def _run_story_pass(
    client: DeepSeekClient,
    chapter_code: str,
    chapter_text: str,
    prompt_bundle: str,
) -> dict:
    system_prompt = "You are a professional Chinese-to-English web novel translator. Reply with one valid JSON object only."
    user_prompt = f"""
Task: Translate one chapter into polished English story prose.

Prompt prefix documents:
{prompt_bundle}

Return JSON fields:
- chapter_title_en
- story_text
- glossary_updates
- style_updates
- character_updates
- chapter_meta_description

Chapter code: {chapter_code}
Source chapter text:
{chapter_text}
""".strip()
    return _call_json_with_retry(client, system_prompt, user_prompt)


def _run_guide_pass(
    client: DeepSeekClient,
    chapter_code: str,
    chapter_text: str,
    prompt_bundle: str,
) -> dict:
    system_prompt = "You are a novel commentary writer for English readers. Reply with one valid JSON object only."
    user_prompt = f"""
Task: Generate one chapter guide/commentary.

Prompt prefix documents:
{prompt_bundle}

Return JSON fields:
- guide_title
- chapter_title_en
- commentary_text
- chapter_keywords
- guide_tags
- chapter_seo_title
- chapter_meta_description
- og_title
- og_description
- twitter_title
- twitter_description
- glossary_updates
- style_updates
- character_updates

Chapter code: {chapter_code}
Source chapter text:
{chapter_text}
""".strip()
    return _call_json_with_retry(client, system_prompt, user_prompt)


def _run_novel_info_pass(
    client: DeepSeekClient,
    chapter_code: str,
    chapter_text: str,
    cn_novel_name: str,
    category: str,
    novel_slug: str,
    chapter_title_en: str,
    chapter_keywords: list[str],
) -> dict:
    system_prompt = "You are an English web novel metadata editor. Reply with one valid JSON object only."
    user_prompt = f"""
Task: Generate novel-level metadata for directory card and SEO.

Return JSON fields:
- title
- title_en
- summary
- status
- tags

Rules:
- title keeps Chinese novel name if available.
- title_en must be concise natural English novel title.
- summary must be 2-4 English sentences and not use placeholder wording.
- status should be Ongoing or Completed.
- tags should be 5-12 concise English tags.

Known values:
- cn_novel_name: {cn_novel_name}
- category: {category}
- novel_slug: {novel_slug}
- chapter_code: {chapter_code}
- chapter_title_en: {chapter_title_en}
- chapter_keywords: {", ".join(chapter_keywords)}

Source chapter excerpt:
{chapter_text[:6000]}
""".strip()
    return _call_json_with_retry(client, system_prompt, user_prompt)


def _call_json_with_retry(client: DeepSeekClient, system_prompt: str, user_prompt: str) -> dict:
    first = client.complete_json(system_prompt=system_prompt, user_prompt=user_prompt)
    try:
        return extract_json_object(first["content"])
    except Exception:
        warn("模型返回非JSON格式，触发一次重试纠正。")
        retry_prompt = user_prompt + "\n\nYour previous response was invalid JSON. Reply again with one valid JSON object only."
        second = client.complete_json(system_prompt=system_prompt, user_prompt=retry_prompt)
        return extract_json_object(second["content"])
