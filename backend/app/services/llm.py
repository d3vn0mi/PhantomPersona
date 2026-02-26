"""LLM integration — supports Ollama (local) and OpenAI-compatible APIs."""

from __future__ import annotations

import asyncio
import json
import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


def _llm_cfg():
    return get_settings().llm


async def generate(prompt: str) -> str:
    """Send a prompt to the configured LLM with retry + exponential backoff."""
    cfg = _llm_cfg()
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            if cfg.backend == "openai" and cfg.openai_api_key:
                return await _openai_generate(prompt)
            return await _ollama_generate(prompt)
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            last_err = exc
            wait = 2 ** attempt
            logger.warning("LLM call failed (attempt %d/%d): %s — retrying in %ds", attempt + 1, MAX_RETRIES, exc, wait)
            await asyncio.sleep(wait)
    raise RuntimeError(f"LLM call failed after {MAX_RETRIES} attempts") from last_err


def _extract_json(raw: str) -> dict:
    """Extract JSON from LLM response, handling markdown fences."""
    text = raw.strip()
    if "```json" in text:
        text = text.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in text:
        text = text.split("```", 1)[1].split("```", 1)[0].strip()
    return json.loads(text)


async def generate_json(prompt: str) -> dict:
    """Generate and parse a JSON response from the LLM.

    Retries up to 3 times for JSON parsing failures.
    """
    for attempt in range(MAX_RETRIES):
        raw = await generate(prompt)
        try:
            return _extract_json(raw)
        except (json.JSONDecodeError, ValueError):
            if attempt < MAX_RETRIES - 1:
                logger.warning("LLM returned invalid JSON (attempt %d/%d), retrying", attempt + 1, MAX_RETRIES)
                continue
            raise ValueError(f"LLM did not return valid JSON after {MAX_RETRIES} attempts: {raw[:300]}")
    return {}  # unreachable


async def _ollama_generate(prompt: str) -> str:
    cfg = _llm_cfg()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{cfg.ollama_url}/api/generate",
            json={"model": cfg.ollama_model, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _openai_generate(prompt: str) -> str:
    cfg = _llm_cfg()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
            json={
                "model": cfg.openai_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.9,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
