"""Tests for LLM service — JSON extraction, retry logic."""

import json

import pytest
from unittest.mock import AsyncMock, patch

from app.services.llm import _extract_json, generate_json, generate


def test_extract_json_plain():
    raw = '{"name": "test"}'
    assert _extract_json(raw) == {"name": "test"}


def test_extract_json_markdown_fenced():
    raw = 'Here is the output:\n```json\n{"name": "test"}\n```\nDone.'
    assert _extract_json(raw) == {"name": "test"}


def test_extract_json_generic_fence():
    raw = '```\n{"name": "test"}\n```'
    assert _extract_json(raw) == {"name": "test"}


def test_extract_json_invalid():
    with pytest.raises(json.JSONDecodeError):
        _extract_json("This is not JSON at all")


@pytest.mark.asyncio
async def test_generate_json_retry_on_parse_failure():
    """generate_json retries when LLM returns invalid JSON first."""
    with patch("app.services.llm._ollama_generate", new_callable=AsyncMock) as mock:
        mock.side_effect = [
            "Not JSON output",  # first attempt fails
            '{"name": "Alex"}',  # second attempt succeeds
        ]
        result = await generate_json("test prompt")
        assert result == {"name": "Alex"}
        assert mock.call_count == 2


@pytest.mark.asyncio
async def test_generate_json_all_retries_fail():
    """generate_json raises after all retries fail."""
    with patch("app.services.llm._ollama_generate", new_callable=AsyncMock) as mock:
        mock.return_value = "still not JSON"
        with pytest.raises(ValueError, match="did not return valid JSON"):
            await generate_json("test prompt")
        assert mock.call_count == 3


@pytest.mark.asyncio
async def test_generate_retries_on_http_error():
    """generate retries on HTTP errors with backoff."""
    import httpx
    with patch("app.services.llm._ollama_generate", new_callable=AsyncMock) as mock:
        mock.side_effect = [
            httpx.HTTPError("Connection refused"),
            httpx.HTTPError("Connection refused"),
            "Success response",
        ]
        result = await generate("test prompt")
        assert result == "Success response"
        assert mock.call_count == 3
