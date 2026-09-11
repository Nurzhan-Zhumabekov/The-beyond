"""Pydantic schemas for the content generation API contract.

This module defines the request/response contract shared between the
LLM Pipeline (this codebase) and Backend Core, which persists
``GenerationResponse`` data into its own ``Generation``/``Asset`` models.
"""
from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class SourceType(str, Enum):
    TEXT = "text"
    URL = "url"


class OutputType(str, Enum):
    BACKGROUND = "background"
    POSTER = "poster"
    BANNER = "banner"
    MEDIA_PACK = "media_pack"


class Language(str, Enum):
    RU = "ru"
    KK = "kk"
    EN = "en"
    AUTO = "auto"


class GenerationStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationRequest(BaseModel):
    project_id: str = Field(..., min_length=1)
    source_type: SourceType
    source: str = Field(..., min_length=1)
    language: Language = Language.AUTO
    output_type: OutputType = OutputType.MEDIA_PACK
    campaign_name: str | None = None
    image_style: str | None = None
    additional_instructions: str | None = ""

    @field_validator("source")
    @classmethod
    def source_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("source must not be empty")
        return value

    @field_validator("project_id")
    @classmethod
    def project_id_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("project_id must not be empty")
        return value


class SocialPosts(BaseModel):
    telegram: str
    instagram: str
    linkedin: str


class UsageInfo(BaseModel):
    llm_calls: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost: float = 0.0


class GenerationResponse(BaseModel):
    generation_id: str
    status: GenerationStatus
    title: str | None = None
    key_points: list[str] = Field(default_factory=list)
    social_posts: SocialPosts | None = None
    image_prompt: str | None = None
    usage: UsageInfo = Field(default_factory=UsageInfo)
    error: str | None = None
