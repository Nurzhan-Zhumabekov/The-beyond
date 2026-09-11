"""Main orchestration service for the LLM content generation pipeline.

This module is intentionally independent of any database/session
concerns — it takes a ``GenerationRequest`` and returns a fully formed
``GenerationResponse``. Backend Core is responsible for persisting the
result into its own ``Generation``/``Asset`` models.
"""
from __future__ import annotations

import uuid

from app.schemas.generation import (
    GenerationRequest,
    GenerationResponse,
    GenerationStatus,
    SocialPosts,
    SourceType,
    UsageInfo,
)
from app.services.content_cleaner import prepare_text_for_llm
from app.services.content_extractor import ContentExtractionError, extract_text_from_url
from app.services.cost_calculator import calculate_estimated_cost
from app.services.llm_client import LLMClient, LLMError
from app.services.prompt_builder import build_generation_prompt

REQUIRED_LLM_FIELDS = (
    "detected_language",
    "title",
    "key_points",
    "telegram",
    "instagram",
    "linkedin",
    "image_prompt",
)
MIN_KEY_POINTS = 3
MAX_KEY_POINTS = 5


class ContentGenerationError(Exception):
    """Raised when the LLM response cannot be turned into a valid result."""


def generate_content(
    request: GenerationRequest, llm_client: LLMClient | None = None
) -> GenerationResponse:
    generation_id = f"generation-{uuid.uuid4().hex[:12]}"
    client = llm_client or LLMClient()

    try:
        raw_text = _resolve_source_text(request)
        prepared_text = prepare_text_for_llm(raw_text)
        prompt = build_generation_prompt(request, prepared_text)

        llm_result = client.generate_json(prompt)
        payload = llm_result.content
        _validate_llm_payload(payload)

        usage = UsageInfo(
            llm_calls=1,
            input_tokens=llm_result.input_tokens,
            output_tokens=llm_result.output_tokens,
            estimated_cost=calculate_estimated_cost(
                llm_result.input_tokens, llm_result.output_tokens, llm_result.model
            ),
        )

        return GenerationResponse(
            generation_id=generation_id,
            status=GenerationStatus.COMPLETED,
            title=payload["title"],
            key_points=list(payload["key_points"]),
            social_posts=SocialPosts(
                telegram=payload["telegram"],
                instagram=payload["instagram"],
                linkedin=payload["linkedin"],
            ),
            image_prompt=payload["image_prompt"],
            usage=usage,
        )
    except (ContentExtractionError, LLMError, ContentGenerationError) as exc:
        return GenerationResponse(
            generation_id=generation_id,
            status=GenerationStatus.FAILED,
            usage=UsageInfo(),
            error=str(exc),
        )


def _resolve_source_text(request: GenerationRequest) -> str:
    if request.source_type == SourceType.URL:
        return extract_text_from_url(request.source)
    return request.source


def _validate_llm_payload(payload: dict) -> None:
    if not isinstance(payload, dict):
        raise ContentGenerationError("LLM response must be a JSON object")

    missing = [field for field in REQUIRED_LLM_FIELDS if field not in payload]
    if missing:
        raise ContentGenerationError(f"LLM response is missing required fields: {missing}")

    key_points = payload.get("key_points")
    if not isinstance(key_points, list) or not (MIN_KEY_POINTS <= len(key_points) <= MAX_KEY_POINTS):
        raise ContentGenerationError(
            f"LLM response must contain between {MIN_KEY_POINTS} and {MAX_KEY_POINTS} key_points"
        )
    if not all(isinstance(point, str) and point.strip() for point in key_points):
        raise ContentGenerationError("LLM response key_points must be non-empty strings")

    for field in ("title", "telegram", "instagram", "linkedin", "image_prompt"):
        if not isinstance(payload[field], str) or not payload[field].strip():
            raise ContentGenerationError(f"LLM response field '{field}' must be a non-empty string")
