"""
embedding_service.py — Generate and store nomic-embed-text embeddings via local Ollama.

The embedding text format must be kept in sync between internships and resumes
so cosine similarity is meaningful. Both build_internship_embedding_text() and
build_resume_embedding_text() use the same style of text representation.
"""

import json
import logging
from typing import Optional

import asyncpg

import services.ollama_client as ollama
from core.config import settings
from core.cache import cache_get, cache_set, cache_key

logger = logging.getLogger(__name__)

EMBED_DIM = 768  # nomic-embed-text output dimensionality


# ── Text builders (both sides must produce similar "shape" of text) ───────────

def build_internship_embedding_text(
    title: str,
    company: str,
    description: str,
    required_skills: list[str],
    category: str = "",
    location: str = "",
    duration: str = "",
    nice_to_have_skills: Optional[list[str]] = None,
) -> str:
    skills_str = ", ".join(required_skills)
    nice_str = (
        f"Nice to have: {', '.join(nice_to_have_skills)}. "
        if nice_to_have_skills
        else ""
    )
    return (
        f"{title} at {company}. "
        f"Category: {category}. Location: {location}. Duration: {duration}. "
        f"{description} "
        f"Required skills: {skills_str}. {nice_str}"
    ).strip()


def build_resume_embedding_text(
    skills: list[str],
    experience_summary: str = "",
    projects_summary: str = "",
    other_skills: Optional[list[str]] = None,
) -> str:
    all_skills = skills + (other_skills or [])
    return (
        f"Candidate skills: {', '.join(all_skills)}. "
        f"Experience: {experience_summary}. "
        f"Projects: {projects_summary}."
    ).strip()


# ── Embedding generation ──────────────────────────────────────────────────────

async def get_embedding(text: str) -> list[float]:
    """
    Get an embedding vector, with LRU/Redis caching.
    The cache key is based on the text hash so identical text never re-embeds.
    """
    key = cache_key("embed", settings.EMBED_MODEL, text)
    cached = await cache_get(key)
    if cached:
        return cached

    vector = await ollama.embed(text)
    await cache_set(key, vector, ttl=86400)  # 24h — embeddings don't change
    return vector


# ── Storage helpers ───────────────────────────────────────────────────────────

async def store_internship_embedding(
    conn: asyncpg.Connection, internship_id: str, vector: list[float]
) -> None:
    """Store a pgvector embedding on the internships row."""
    await conn.execute(
        "UPDATE internships SET embedding = $1 WHERE id = $2",
        str(vector), internship_id,
    )
    logger.debug("[Embed] Stored internship embedding id=%s", internship_id)


async def store_resume_embedding(
    conn: asyncpg.Connection, resume_id: str, vector: list[float]
) -> None:
    """Store a pgvector embedding on the resumes row."""
    await conn.execute(
        "UPDATE resumes SET embedding = $1 WHERE id = $2",
        str(vector), resume_id,
    )
    logger.debug("[Embed] Stored resume embedding id=%s", resume_id)


async def embed_and_store_internship(
    conn: asyncpg.Connection,
    internship_id: str,
    title: str,
    company: str,
    description: str,
    required_skills: list[str],
    category: str = "",
    location: str = "",
    duration: str = "",
) -> bool:
    """Generate and persist internship embedding. Returns True on success."""
    try:
        text = build_internship_embedding_text(
            title, company, description, required_skills, category, location, duration
        )
        vector = await get_embedding(text)
        await store_internship_embedding(conn, internship_id, vector)
        return True
    except Exception as exc:
        logger.error("[Embed] Failed for internship %s: %s", internship_id, exc)
        return False


async def embed_and_store_resume(
    conn: asyncpg.Connection,
    resume_id: str,
    skills: list[str],
    experience_summary: str = "",
    projects_summary: str = "",
    other_skills: Optional[list[str]] = None,
) -> bool:
    """Generate and persist resume embedding. Returns True on success."""
    try:
        text = build_resume_embedding_text(skills, experience_summary, projects_summary, other_skills)
        vector = await get_embedding(text)
        await store_resume_embedding(conn, resume_id, vector)
        return True
    except Exception as exc:
        logger.error("[Embed] Failed for resume %s: %s", resume_id, exc)
        return False
