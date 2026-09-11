"""API routes for the LLM content generation pipeline.

Only exposes a stateless ``/generations/preview`` endpoint used to
exercise the pipeline before Backend Core wires up persistence
(``Generation``/``Asset`` models, auth, etc.).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.generation import GenerationRequest, GenerationResponse
from app.services.content_generator import generate_content

router = APIRouter(prefix="/generations", tags=["generations"])


@router.post("/preview", response_model=GenerationResponse)
def preview_generation(request: GenerationRequest) -> GenerationResponse:
    """Runs the LLM pipeline and returns the result without persisting it."""
    return generate_content(request)
