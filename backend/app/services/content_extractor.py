"""Fetches a URL and extracts readable article text from its HTML.

No headless browsers, no anti-bot bypassing: a plain HTTP GET via httpx
followed by simple HTML-to-text extraction. Sites that require
JavaScript rendering or block simple bots are expected to fail with a
clear ``ContentExtractionError``.
"""
from __future__ import annotations

import re
import ipaddress
import socket
from urllib.parse import urlsplit

import httpx
from bs4 import BeautifulSoup

REQUEST_TIMEOUT_SECONDS = 10.0
MIN_EXTRACTED_TEXT_LENGTH = 200
USER_AGENT = "AIContentFactory/0.1 (+content-extraction)"


class ContentExtractionError(Exception):
    """Raised when a URL cannot be fetched or does not contain enough text."""


def extract_text_from_url(url: str, client: httpx.Client | None = None) -> str:
    _validate_url(url)

    try:
        if client is not None:
            response = client.get(url, timeout=REQUEST_TIMEOUT_SECONDS, follow_redirects=True)
        else:
            response = httpx.get(
                url,
                timeout=REQUEST_TIMEOUT_SECONDS,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            )
        # A public URL may redirect to a local address; validate the final
        # destination too before accepting its response body.
        _validate_url(str(response.url))
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise ContentExtractionError(f"Timed out while fetching URL: {url}") from exc
    except httpx.HTTPStatusError as exc:
        raise ContentExtractionError(
            f"URL returned an error status ({exc.response.status_code}): {url}"
        ) from exc
    except httpx.HTTPError as exc:
        raise ContentExtractionError(f"Failed to fetch URL: {url} ({exc})") from exc

    text = _extract_readable_text(response.text)

    if len(text) < MIN_EXTRACTED_TEXT_LENGTH:
        raise ContentExtractionError(
            "The article at this URL is unavailable or contains too little text to process."
        )

    return text


def _validate_url(url: str) -> None:
    if not url or not url.strip():
        raise ContentExtractionError("URL must not be empty")
    parsed = urlsplit(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ContentExtractionError("URL must be an absolute http or https address")
    if parsed.username or parsed.password:
        raise ContentExtractionError("URL must not include credentials")

    # Fetching arbitrary user URLs must never expose loopback or private
    # network services through this API.
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, None)}
    except socket.gaierror as exc:
        raise ContentExtractionError("URL hostname could not be resolved") from exc
    if not addresses:
        raise ContentExtractionError("URL hostname could not be resolved")
    for address in addresses:
        if not ipaddress.ip_address(address).is_global:
            raise ContentExtractionError("URL must not target a private or local address")


def _extract_readable_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "iframe", "nav", "footer"]):
        tag.decompose()

    title_text = soup.title.get_text(strip=True) if soup.title else ""

    content_node = soup.find("article") or soup.find("main") or soup.body or soup
    body_text = content_node.get_text(separator=" ", strip=True) if content_node else ""

    combined = f"{title_text}\n\n{body_text}" if title_text else body_text
    return _normalize_whitespace(combined)


def _normalize_whitespace(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()
