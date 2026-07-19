"""
ollama_client.py — Async client that wraps the local Ollama HTTP API.

IMPORTANT: This file may ONLY call OLLAMA_BASE_URL (a local address).
It must never import requests/httpx with a URL that contains an external
hostname. Any attempt to add a cloud LLM fallback here breaks the offline
guarantee and should be rejected in code review.
"""

import json
import logging
from typing import Any, AsyncIterator, Optional

import httpx

from core.config import settings
from core.retry import local_retry

logger = logging.getLogger(__name__)

# Connection pool shared across all requests
_CLIENT: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            base_url=settings.OLLAMA_BASE_URL,
            timeout=httpx.Timeout(connect=10, read=300, write=60, pool=10),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _CLIENT


@local_retry(max_attempts=3, min_wait=2.0, max_wait=10.0)
async def generate(
    prompt: str,
    model: Optional[str] = None,
    system: Optional[str] = None,
    format: Optional[str] = None,  # noqa: A002  — mirrors Ollama API param name
    temperature: float = 0.2,
    max_tokens: int = 4096,
    stream: bool = False,
) -> str:
    """
    Call the local Ollama /api/generate endpoint.

    Pass format="json" to enforce JSON output at the token level (Ollama
    constrains the grammar). Always do this for structured extraction tasks.
    """
    llm_model = model or settings.LLM_MODEL
    payload: dict[str, Any] = {
        "model": llm_model,
        "prompt": prompt,
        "stream": stream,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system
    if format:
        payload["format"] = format

    client = _get_client()
    resp = await client.post("/api/generate", json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data.get("response", "")


@local_retry(max_attempts=3, min_wait=2.0, max_wait=10.0)
async def chat(
    messages: list[dict[str, str]],
    model: Optional[str] = None,
    format: Optional[str] = None,  # noqa: A002
    temperature: float = 0.65,
    max_tokens: int = 1400,
) -> str:
    """Call the local Ollama /api/chat endpoint (OpenAI-compatible messages format)."""
    payload: dict[str, Any] = {
        "model": model or settings.LLM_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if format:
        payload["format"] = format

    client = _get_client()
    resp = await client.post("/api/chat", json=payload)
    resp.raise_for_status()
    data = resp.json()
    return data.get("message", {}).get("content", "")


@local_retry(max_attempts=3, min_wait=2.0, max_wait=10.0)
async def embed(text: str, model: Optional[str] = None) -> list[float]:
    """
    Generate an embedding vector via the local nomic-embed-text model.
    Returns a list of 768 floats. Raises on failure (no silent empty-vector fallback).
    """
    embed_model = model or settings.EMBED_MODEL
    client = _get_client()
    resp = await client.post(
        "/api/embeddings",
        json={"model": embed_model, "prompt": text},
    )
    resp.raise_for_status()
    data = resp.json()
    vector = data.get("embedding", [])
    if not vector:
        raise ValueError(
            f"Ollama returned empty embedding for model {embed_model!r}. "
            "Is the model fully loaded?"
        )
    return vector


async def list_models() -> list[str]:
    """Return model names currently present in the local Ollama store."""
    client = _get_client()
    resp = await client.get("/api/tags")
    resp.raise_for_status()
    return [m["name"] for m in resp.json().get("models", [])]


async def close() -> None:
    """Gracefully close the shared connection pool on shutdown."""
    global _CLIENT
    if _CLIENT and not _CLIENT.is_closed:
        await _CLIENT.aclose()
        _CLIENT = None
