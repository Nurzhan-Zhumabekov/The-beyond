"""Tests for the LLM content generation pipeline.

All tests run in mock mode (``LLM_MOCK_MODE=true``) and never hit a
real, paid LLM or network endpoint.
"""
from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas.generation import GenerationRequest, GenerationResponse, GenerationStatus
from app.services.content_extractor import ContentExtractionError, extract_text_from_url
from app.services.content_generator import generate_content
from app.services.llm_client import LLMClient, LLMError

SAMPLE_TEXT = (
    "Искусственный интеллект стремительно меняет индустрию контента. "
    "Компании внедряют автоматизацию генерации текстов и изображений, "
    "чтобы ускорить производство маркетинговых материалов и снизить затраты. "
    "Эксперты отмечают, что в ближайшие годы такие инструменты станут стандартом "
    "для небольших и крупных команд, работающих с контентом и рекламой."
) * 3

SAMPLE_HTML = """
<html>
<head><title>The Future of AI Content</title></head>
<body>
<article>
<p>Artificial intelligence is rapidly changing the content industry.</p>
<p>Companies are adopting automated text and image generation to speed up
marketing production and reduce costs. Experts note that in the coming
years such tools will become standard for teams of any size working with
content and advertising.</p>
</article>
<script>console.log('ignore me')</script>
</body>
</html>
"""


@pytest.fixture(autouse=True)
def mock_llm_mode(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_MOCK_MODE", "true")


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# -- schema validation -----------------------------------------------------


def test_empty_text_source_is_rejected() -> None:
    with pytest.raises(ValidationError):
        GenerationRequest(
            project_id="project-123",
            source_type="text",
            source="",
            output_type="media_pack",
        )


def test_invalid_source_type_is_rejected() -> None:
    with pytest.raises(ValidationError):
        GenerationRequest(
            project_id="project-123",
            source_type="pdf",
            source="some text",
            output_type="media_pack",
        )


def test_invalid_output_type_is_rejected() -> None:
    with pytest.raises(ValidationError):
        GenerationRequest(
            project_id="project-123",
            source_type="text",
            source="some text",
            output_type="not_a_real_type",
        )


# -- content extractor -------------------------------------------------------


def test_extract_text_from_url_rejects_bad_scheme() -> None:
    with pytest.raises(ContentExtractionError):
        extract_text_from_url("not-a-url")


def test_extract_text_from_url_parses_html(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(url: str, timeout: float, follow_redirects: bool, headers: dict) -> httpx.Response:
        return httpx.Response(200, text=SAMPLE_HTML, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx, "get", fake_get)

    text = extract_text_from_url("https://example.com/article")

    assert "Future of AI Content" in text
    assert "console.log" not in text
    assert len(text) > 50


# -- end-to-end pipeline (mock LLM) ------------------------------------------


def test_generate_content_from_text_returns_valid_response() -> None:
    request = GenerationRequest(
        project_id="project-123",
        source_type="text",
        source=SAMPLE_TEXT,
        language="ru",
        output_type="media_pack",
        campaign_name="AI Conference",
        image_style="futuristic",
    )

    response = generate_content(request)

    assert isinstance(response, GenerationResponse)
    assert response.status == GenerationStatus.COMPLETED
    assert response.title
    assert 3 <= len(response.key_points) <= 5
    assert response.social_posts is not None
    assert response.social_posts.telegram
    assert response.social_posts.instagram
    assert response.social_posts.linkedin
    assert response.image_prompt
    assert "no text" in response.image_prompt.lower()
    assert response.usage.llm_calls == 1


def test_preview_endpoint_returns_generation_response(client: TestClient) -> None:
    payload = {
        "project_id": "project-123",
        "source_type": "text",
        "source": SAMPLE_TEXT,
        "language": "ru",
        "output_type": "media_pack",
        "campaign_name": "AI Conference",
        "image_style": "futuristic",
        "additional_instructions": "",
    }

    response = client.post("/generations/preview", json=payload)

    assert response.status_code == 200
    body = response.json()

    validated = GenerationResponse.model_validate(body)
    assert validated.status == GenerationStatus.COMPLETED
    assert validated.usage.llm_calls == 1
    assert validated.social_posts is not None


def test_preview_endpoint_rejects_bad_request(client: TestClient) -> None:
    payload = {
        "project_id": "project-123",
        "source_type": "text",
        "source": "",
        "output_type": "media_pack",
    }

    response = client.post("/generations/preview", json=payload)

    assert response.status_code == 422


# -- LLM client retry / error handling ---------------------------------------


def test_llm_client_retries_once_then_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_MOCK_MODE", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    call_count = {"count": 0}

    def failing_request(self: LLMClient, prompt: str, api_key: str, model: str):
        call_count["count"] += 1
        raise httpx.TimeoutException("simulated timeout")

    monkeypatch.setattr(LLMClient, "_request_openai", failing_request)

    client = LLMClient(max_retries=1)

    with pytest.raises(LLMError):
        client.generate_json("some prompt")

    assert call_count["count"] == 2


def test_llm_client_mock_mode_needs_no_network(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_if_called(*args: object, **kwargs: object) -> None:
        raise AssertionError("network call should not happen in mock mode")

    monkeypatch.setattr(httpx, "get", fail_if_called)
    monkeypatch.setattr(httpx, "post", fail_if_called)

    client = LLMClient()
    result = client.generate_json("Some ru text about AI content factory")

    assert result.content["title"]
    assert result.content["image_prompt"]
    assert "telegram" in result.content
    assert "instagram" in result.content
    assert "linkedin" in result.content
