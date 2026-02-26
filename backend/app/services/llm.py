"""LLM integration — supports Ollama (local) and OpenAI-compatible APIs."""

from __future__ import annotations

import json
import os

import httpx

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Which backend to use: "ollama" or "openai"
LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama")


async def generate(prompt: str) -> str:
    """Send a prompt to the configured LLM and return the raw text response."""
    if LLM_BACKEND == "openai" and OPENAI_API_KEY:
        return await _openai_generate(prompt)
    return await _ollama_generate(prompt)


async def generate_json(prompt: str) -> dict:
    """Generate and parse a JSON response from the LLM.

    The prompt should instruct the model to return valid JSON.
    Retries once if parsing fails.
    """
    for attempt in range(2):
        raw = await generate(prompt)
        # Try to extract JSON from the response (model may wrap it in markdown)
        text = raw.strip()
        if "```json" in text:
            text = text.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in text:
            text = text.split("```", 1)[1].split("```", 1)[0].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            if attempt == 0:
                continue
            raise ValueError(f"LLM did not return valid JSON after 2 attempts: {raw[:300]}")
    return {}  # unreachable, but keeps type checker happy


async def _ollama_generate(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _openai_generate(prompt: str) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": OPENAI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.9,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
