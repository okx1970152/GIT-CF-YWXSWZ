from __future__ import annotations

from datetime import date
from pathlib import Path

from producer.chapters import discover_chapters
from producer.config import Settings
from producer.contracts import ensure_list_of_strings, ensure_string, extract_json_object
from producer.deepseek_client import DeepSeekClient
from producer.logger import error, info, warn
from producer.models import Workspace
from producer.outputs import save_json, save_text, slugify
from producer.prompts import (
    append_incremental_rules,
    load_guide_prompt_bundle,
    load_story_prompt_bundle,
)
from producer.state import load_progress, save_progress


def process_workspace(settings: Settings, workspace: Workspace) -> None:
    chapters = discover_chapters(workspace.prompt_prefix_dir.parent)
    if not chapters:
        error(f"未发现章节 txt 文件：{workspace.prompt_prefix_dir.parent}")
        raise SystemExit(1)
    if settings.max_chapters_per_run > 0:
        chapters = chapters[: settings.max_chapters_per_run]

    progress = load_progress(workspace.progress_path)
    chapter_state: dict = progress.get("chapters", {})

    _ensure_novel_info(workspace, len(chapters))
    _ensure_novel_meta(workspace, len(chapters))

    client = DeepSeekClient(settings)

    info(f"共发现 {len(chapters)} 章，开始执行章节处理...")
    for chapter in chapters:
        rec = chapter_state.get(chapter.chapter_code, {})
        if rec.get("ready_for_publish"):
            warn(f"[{chapter.chapter_code}] 已完成，跳过。")
            continue

        chapter_slug = rec.get("chapter_slug", "")
        source_text = chapter.source_path.read_text(encoding="utf-8").strip()
        story_payload = {}
        guide_payload = {}

        story_bundle = load_story_prompt_bundle(workspace.prompt_prefix_dir)
        guide_bundle = load_guide_prompt_bundle(workspace.prompt_prefix_dir)

        if rec.get("story_done") and rec.get("guide_done") and rec.get("meta_done"):
            warn(f"[{chapter.chapter_code}] 发现完整断点产物，标记完成。")
            rec["ready_for_publish"] = True
            chapter_state[chapter.chapter_code] = rec
            progress["chapters"] = chapter_state
            save_progress(workspace.progress_path, progress)
            continue

        info(f"[{chapter.chapter_code}] 正在调用大模型翻译正文：{chapter.source_path.name}")
        story_payload = _run_story_pass(client, chapter.chapter_code, source_text, story_bundle)
        chapter_title_en = ensure_string(story_payload.get("chapter_title_en"), f"Chapter {chapter.chapter_code}")
        chapter_slug = chapter_slug or slugify(chapter_title_en, f"chapter-{chapter.chapter_code}")

        info(f"[{chapter.chapter_code}] 正在调用大模型生成导读：{chapter.source_path.name}")
        guide_payload = _run_guide_pass(client, chapter.chapter_code, source_text, guide_bundle)

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
        related_topics = " ".join(f"#{slugify(k, 'Topic')}" for k in keywords[:10] if k.strip())
        guide_text = ensure_string(guide_payload.get("commentary_text"), "")
        if related_topics:
            guide_text = guide_text.rstrip() + f"\n\nRelated Topics: {related_topics}\n"

        story_md = (
            "---\n"
            f'title: "{chapter_title_en}"\n'
            f'chapter_no: "{chapter.chapter_code}"\n'
            f'published_at: "{date.today().isoformat()}"\n'
            f'updated_at: "{date.today().isoformat()}"\n'
            "---\n\n"
            f"{ensure_string(story_payload.get('story_text'), source_text)}\n"
        )
        guide_md = (
            "---\n"
            f'title: "{ensure_string(guide_payload.get("guide_title"), "Essential Guide")}"\n'
            "---\n\n"
            f"{guide_text}\n"
        )
        chapter_meta = {
            "chapter_code": chapter.chapter_code,
            "chapter_slug": chapter_slug,
            "chapter_title_en": chapter_title_en,
            "chapter_keywords": keywords,
            "chapter_seo_title": ensure_string(guide_payload.get("chapter_seo_title"), chapter_title_en),
            "chapter_meta_description": ensure_string(
                guide_payload.get("chapter_meta_description"),
                ensure_string(story_payload.get("chapter_meta_description"), ""),
            ),
            "updated_at": date.today().isoformat(),
        }

        story_path = workspace.chapters_dir / f"{chapter.chapter_code}-{chapter_slug}.md"
        guide_path = workspace.annotations_dir / f"{chapter.chapter_code}-{chapter_slug}-guide.md"
        meta_path = workspace.meta_dir / f"{chapter.chapter_code}-{chapter_slug}.json"

        save_text(story_path, story_md)
        save_text(guide_path, guide_md)
        save_json(meta_path, chapter_meta)

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

    info("章节处理完成。")


def _ensure_novel_info(workspace: Workspace, total_chapters: int) -> None:
    info_path = workspace.info_dir / "index.md"
    if info_path.exists():
        _patch_existing_info_contract(info_path, workspace.novel_slug)
        return
    content = (
        "---\n"
        f'title: "{workspace.cn_novel_name}"\n'
        'author: "Anonymous"\n'
        f'category: "{workspace.category.title()}"\n'
        f'novel_id: "{workspace.novel_slug}"\n'
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


def _patch_existing_info_contract(info_path: Path, novel_slug: str) -> None:
    raw = info_path.read_text(encoding="utf-8")
    if not raw.startswith("---\n"):
        return

    lines = raw.splitlines()
    if len(lines) < 3:
        return

    changed = False
    author_idx = -1
    for idx, line in enumerate(lines):
        if line.startswith("author:"):
            author_idx = idx
            break
    if author_idx == -1:
        insert_at = 2 if len(lines) > 2 and lines[1].startswith("title:") else 1
        lines.insert(insert_at, 'author: "Anonymous"')
        changed = True
    else:
        if lines[author_idx].strip() in ('author: ""', "author: ''"):
            lines[author_idx] = 'author: "Anonymous"'
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
        "slug": workspace.novel_slug,
        "category": workspace.category,
        "summary": "Skeleton stage novel metadata.",
        "status": "Ongoing",
        "featured": False,
        "chapter_count": total_chapters,
        "updated_at": date.today().isoformat(),
    }
    save_json(novel_meta_path, payload)


def _run_story_pass(
    client: DeepSeekClient,
    chapter_code: str,
    chapter_text: str,
    prompt_bundle: str,
) -> dict:
    system_prompt = (
        "You are a professional Chinese-to-English web novel translator. "
        "Reply with one valid JSON object only."
    )
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
    system_prompt = (
        "You are a novel commentary writer for English readers. "
        "Reply with one valid JSON object only."
    )
    user_prompt = f"""
Task: Generate one chapter guide/commentary.

Prompt prefix documents:
{prompt_bundle}

Return JSON fields:
- guide_title
- chapter_title_en
- commentary_text
- chapter_keywords
- chapter_seo_title
- chapter_meta_description
- glossary_updates
- style_updates
- character_updates

Chapter code: {chapter_code}
Source chapter text:
{chapter_text}
""".strip()
    return _call_json_with_retry(client, system_prompt, user_prompt)


def _call_json_with_retry(client: DeepSeekClient, system_prompt: str, user_prompt: str) -> dict:
    first = client.complete_json(system_prompt=system_prompt, user_prompt=user_prompt)
    try:
        return extract_json_object(first["content"])
    except Exception:
        warn("模型返回非JSON格式，触发一次重试纠正。")
        retry_prompt = (
            user_prompt
            + "\n\nYour previous response was invalid JSON. Reply again with one valid JSON object only."
        )
        second = client.complete_json(system_prompt=system_prompt, user_prompt=retry_prompt)
        return extract_json_object(second["content"])
