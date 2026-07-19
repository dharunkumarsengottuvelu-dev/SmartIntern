"""
semantic_search.py — pgvector cosine similarity search for internship recommendations.

Uses the <=> operator (cosine distance) against the internships.embedding column.
Requires the pgvector extension to be installed in Postgres and the embedding
column to exist (see schema migrations in docker-compose.yml / init.sql).
"""

import logging
from typing import Optional

import asyncpg

logger = logging.getLogger(__name__)


async def find_similar_internships(
    conn: asyncpg.Connection,
    resume_embedding: list[float],
    top_k: int = 20,
    min_similarity: float = 0.0,
) -> list[dict]:
    """
    Return top_k internships ordered by cosine similarity to the resume embedding.
    Returns a list of dicts with keys: id, title, company, similarity_score.
    """
    if not resume_embedding:
        logger.warning("[SemanticSearch] Empty resume embedding — skipping vector search")
        return []

    # pgvector: 1 - cosine_distance = cosine_similarity
    rows = await conn.fetch(
        """
        SELECT
            i.id,
            i.title,
            i.company,
            i.description,
            i.required_skills,
            i.location,
            i.duration,
            i.stipend,
            i.category,
            i.apply_link,
            1 - (i.embedding <=> $1::vector) AS similarity_score
        FROM internships i
        WHERE
            i.is_active = true
            AND i.embedding IS NOT NULL
            AND 1 - (i.embedding <=> $1::vector) >= $2
        ORDER BY i.embedding <=> $1::vector
        LIMIT $3
        """,
        resume_embedding,
        min_similarity,
        top_k,
    )

    return [dict(r) for r in rows]


async def get_resume_embedding(
    conn: asyncpg.Connection, user_id: str
) -> Optional[list[float]]:
    """
    Fetch the stored embedding for a user's most recent resume.
    Returns None if no resume or no embedding stored yet.
    """
    row = await conn.fetchrow(
        """
        SELECT embedding
        FROM resumes
        WHERE user_id = $1 AND embedding IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
        """,
        user_id,
    )
    if row is None or row["embedding"] is None:
        return None
    # asyncpg returns pgvector as a list of floats automatically when
    # pgvector Python library is registered — otherwise it's a string.
    raw = row["embedding"]
    if isinstance(raw, (list, tuple)):
        return list(raw)
    # Fallback: parse the Postgres vector string format
    return [float(x) for x in str(raw).strip("[]").split(",")]
