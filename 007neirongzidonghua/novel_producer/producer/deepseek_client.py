from __future__ import annotations

import os
from typing import Any

import requests

from producer.config import Settings


class DeepSeekClient:
    def __init__(self, settings: Settings):
        self.model = settings.deepseek_model
        self.base_url = settings.deepseek_base_url.rstrip("/")
        self.api_key = os.environ.get("DEEPSEEK_API_KEY", "").strip()
        if not self.api_key:
            raise SystemExit("缺少 DEEPSEEK_API_KEY 环境变量，无法调用模型。")

    def complete_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "thinking": {"type": "enabled"},
            "show_thinking": False,
        }
        resp = requests.post(
            url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=180,
        )
        resp.raise_for_status()
        data = resp.json()
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )
        return {"content": content, "raw": data}
