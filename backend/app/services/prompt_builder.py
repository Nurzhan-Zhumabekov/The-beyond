"""Builds the single LLM prompt used to generate structured content."""
from __future__ import annotations

from app.schemas.generation import GenerationRequest, Language

RESPONSE_FIELDS = (
    "detected_language",
    "title",
    "key_points",
    "telegram",
    "instagram",
    "linkedin",
    "image_prompt",
)


def build_generation_prompt(request: GenerationRequest, prepared_text: str) -> str:
    language_hint = (
        "Detect the material's language automatically."
        if request.language == Language.AUTO
        else (
            f"The material is expected to be in '{request.language.value}'. "
            "Confirm or correct this in detected_language based on the actual text."
        )
    )
    campaign_hint = (
        f"Campaign name (for context only, do not render as image text): {request.campaign_name}."
        if request.campaign_name
        else ""
    )
    style_hint = (
        f"Requested visual style for image_prompt: {request.image_style}."
        if request.image_style
        else ""
    )
    extra_hint = (
        f"Additional instructions from the user: {request.additional_instructions}"
        if request.additional_instructions
        else ""
    )

    context_lines = "\n".join(
        line for line in (language_hint, campaign_hint, style_hint, extra_hint) if line
    )

    return f"""
You are a multilingual content strategist and social media copywriter working for a branding agency.

TASK:
Read the SOURCE MATERIAL below and produce a strictly structured JSON object with exactly these fields:
- "detected_language": one of "ru", "kk", "en" — your best guess of the material's language
- "title": a compelling headline for the material, written in the same language as the source
- "key_points": an array of 3 to 5 short key takeaway strings, in the same language as the source
- "telegram": a ready-to-publish Telegram post, in the same language as the source
- "instagram": a ready-to-publish Instagram caption with relevant hashtags, in the same language as the source
- "linkedin": a ready-to-publish LinkedIn post in a professional tone, in the same language as the source
- "image_prompt": a single prompt, written in English, describing a scene and visual style for an image generator

RULES FOR image_prompt:
- Always written in English, regardless of the source language.
- Describes a scene, mood, and visual style — not any on-image text layout.
- Takes into account the requested image style, campaign theme, and additional instructions when relevant.
- Must explicitly include the phrase "no text, no letters, no watermark".
- Must NOT ask the image generator to render the brand or campaign name as visible text.

CONTEXT:
{context_lines}

OUTPUT FORMAT:
Return ONLY a valid JSON object with the fields listed above. No markdown, no commentary, no code fences.

SOURCE MATERIAL:
\"\"\"
{prepared_text}
\"\"\"
""".strip()
