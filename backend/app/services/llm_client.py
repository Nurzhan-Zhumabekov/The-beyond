"""Single LLM client used by the content pipeline.

Configuration is read from environment variables only — no hardcoded
API keys:

    GEMINI_API_KEY=
    TEXT_MODEL=gemini-3.1-flash-lite
    LLM_MOCK_MODE=true

When ``LLM_MOCK_MODE`` is true (the default), no network call is made
and a mock payload with the same JSON shape as a real response is
returned. This keeps the test suite free of real, paid API calls.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass

import httpx

DEFAULT_TIMEOUT_SECONDS = 30.0
DEFAULT_MODEL = "gemini-3.1-flash-lite"
GEMINI_GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

TRANSIENT_ERRORS = (httpx.TimeoutException, httpx.TransportError)


class LLMError(Exception):
    """Raised when the LLM call fails or returns an unusable response."""


@dataclass
class LLMResult:
    content: dict
    input_tokens: int
    output_tokens: int
    model: str


def _is_mock_mode() -> bool:
    return os.getenv("LLM_MOCK_MODE", "true").strip().lower() in {"1", "true", "yes"}


def _get_api_key() -> str | None:
    return os.getenv("GEMINI_API_KEY") or None


def _get_model() -> str:
    return os.getenv("TEXT_MODEL") or DEFAULT_MODEL


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _guess_language(text: str) -> str:
    if re.search(r"[әғқңөұүһӘҒҚҢӨҰҮҺ]", text):
        return "kk"
    if re.search(r"[а-яёА-ЯЁ]", text):
        return "ru"
    return "en"


class LLMClient:
    """Thin wrapper around the chat-completions API with retry + mock mode."""

    def __init__(self, timeout: float = DEFAULT_TIMEOUT_SECONDS, max_retries: int = 1):
        self.timeout = timeout
        self.max_retries = max_retries

    def generate_json(self, prompt: str) -> LLMResult:
        if _is_mock_mode():
            return self._mock_generate(prompt)
        return self._call_gemini_with_retry(prompt)

    # -- mock mode -----------------------------------------------------

    def _mock_generate(self, prompt: str) -> LLMResult:
        payload = _build_mock_payload(prompt)
        return LLMResult(
            content=payload,
            input_tokens=_estimate_tokens(prompt),
            output_tokens=_estimate_tokens(json.dumps(payload, ensure_ascii=False)),
            model="mock",
        )

    # -- real mode -------------------------------------------------------

    def _call_gemini_with_retry(self, prompt: str) -> LLMResult:
        api_key = _get_api_key()
        if not api_key:
            raise LLMError("GEMINI_API_KEY is not configured")
        model = _get_model()

        attempts_allowed = self.max_retries + 1
        last_error: Exception | None = None

        for attempt in range(attempts_allowed):
            try:
                return self._request_gemini(prompt, api_key, model)
            except TRANSIENT_ERRORS as exc:
                last_error = exc
                if attempt + 1 < attempts_allowed:
                    continue
                raise LLMError(
                    f"LLM request failed after {attempts_allowed} attempt(s): {exc}"
                ) from exc

        raise LLMError(f"LLM request failed: {last_error}")

    def _request_gemini(self, prompt: str, api_key: str, model: str) -> LLMResult:
        try:
            response = httpx.post(
                GEMINI_GENERATE_CONTENT_URL.format(model=model),
                headers={"x-goog-api-key": api_key},
                json={
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json", "temperature": 0.7},
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise LLMError(
                f"Gemini API returned an error ({exc.response.status_code})"
            ) from exc

        data = response.json()
        try:
            message_content = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(message_content)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise LLMError(f"Unexpected Gemini response format: {exc}") from exc

        usage = data.get("usageMetadata") or {}
        return LLMResult(
            content=parsed,
            input_tokens=usage.get("promptTokenCount", _estimate_tokens(prompt)),
            output_tokens=usage.get("candidatesTokenCount", _estimate_tokens(message_content)),
            model=model,
        )


def _build_mock_payload(prompt: str) -> dict:
    language = _guess_language(prompt)
    snippet = _extract_snippet(prompt)

    titles = {
        "ru": f"Мок-заголовок: {snippet}",
        "kk": f"Мок-тақырып: {snippet}",
        "en": f"Mock title: {snippet}",
    }
    key_points = {
        "ru": [
            "Первый ключевой тезис из материала (мок).",
            "Второй ключевой тезис из материала (мок).",
            "Третий ключевой тезис из материала (мок).",
        ],
        "kk": [
            "Материалдың бірінші негізгі тезисі (мок).",
            "Материалдың екінші негізгі тезисі (мок).",
            "Материалдың үшінші негізгі тезисі (мок).",
        ],
        "en": [
            "First key takeaway from the material (mock).",
            "Second key takeaway from the material (mock).",
            "Third key takeaway from the material (mock).",
        ],
    }
    posts = {
        "ru": {
            "telegram": f"[MOCK] {titles['ru']}\n\nКраткий пересказ материала для Telegram.",
            "instagram": f"[MOCK] {titles['ru']} ✨ #контент #AI",
            "linkedin": f"[MOCK] {titles['ru']} — ключевые выводы для профессионалов.",
        },
        "kk": {
            "telegram": f"[MOCK] {titles['kk']}\n\nTelegram үшін қысқаша мазмұндама.",
            "instagram": f"[MOCK] {titles['kk']} ✨ #контент #AI",
            "linkedin": f"[MOCK] {titles['kk']} — мамандарға арналған негізгі қорытындылар.",
        },
        "en": {
            "telegram": f"[MOCK] {titles['en']}\n\nShort summary of the material for Telegram.",
            "instagram": f"[MOCK] {titles['en']} ✨ #content #AI",
            "linkedin": f"[MOCK] {titles['en']} — key takeaways for professionals.",
        },
    }

    return {
        "detected_language": language,
        "title": titles[language],
        "key_points": key_points[language],
        "telegram": posts[language]["telegram"],
        "instagram": posts[language]["instagram"],
        "linkedin": posts[language]["linkedin"],
        "image_prompt": (
            "Abstract conceptual illustration representing the topic, cinematic lighting, "
            "modern digital art style, no text, no letters, no watermark"
        ),
    }


def _extract_snippet(prompt: str, length: int = 40) -> str:
    marker = 'SOURCE MATERIAL:\n"""\n'
    idx = prompt.find(marker)
    if idx == -1:
        snippet = prompt.strip()
    else:
        snippet = prompt[idx + len(marker):].strip()
    snippet = re.sub(r"\s+", " ", snippet)
    return snippet[:length].strip() or "Untitled"
