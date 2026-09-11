"""Cleans and truncates raw text before it is sent to the LLM."""
from __future__ import annotations

import re

DEFAULT_MAX_LENGTH = 14000
TRUNCATION_MARKER = "\n\n[...]\n\n"
HEAD_RATIO = 0.7


def clean_text(text: str) -> str:
    """Normalizes whitespace and drops duplicate consecutive lines."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)

    seen_lines: set[str] = set()
    deduped_lines: list[str] = []
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            deduped_lines.append("")
            continue
        key = stripped.lower()
        if key in seen_lines:
            continue
        seen_lines.add(key)
        deduped_lines.append(stripped)

    cleaned = "\n".join(deduped_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def truncate_for_prompt(text: str, max_length: int = DEFAULT_MAX_LENGTH) -> str:
    """Keeps the beginning (most important part) and a tail slice of the text."""
    if len(text) <= max_length:
        return text

    budget = max_length - len(TRUNCATION_MARKER)
    if budget <= 0:
        return text[:max_length]

    head_len = int(budget * HEAD_RATIO)
    tail_len = budget - head_len

    head = text[:head_len]
    tail = text[-tail_len:] if tail_len > 0 else ""
    return f"{head}{TRUNCATION_MARKER}{tail}".strip()


def prepare_text_for_llm(raw_text: str, max_length: int = DEFAULT_MAX_LENGTH) -> str:
    """Full pipeline: clean, then truncate to a safe size for the prompt."""
    return truncate_for_prompt(clean_text(raw_text), max_length)
