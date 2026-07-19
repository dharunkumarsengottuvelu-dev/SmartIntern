"""Internship embedding router."""

import asyncpg
import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.config import settings
from services.embedding_service import embed_and_store_internship

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internship", tags=["internship"])


async def get_db():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


class EmbedInternshipRequest(BaseModel):
    internship_id: str
    title: str
    company: str
    description: str
    required_skills: list[str]
    category: str = ""
    location: str = ""
    duration: str = ""


@router.post("/embed")
async def embed_internship_route(
    body: EmbedInternshipRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    """
    Generate and store nomic-embed-text embedding for an internship.
    Called by the Next.js admin route on POST/PUT internship.
    """
    ok = await embed_and_store_internship(
        conn,
        internship_id=body.internship_id,
        title=body.title,
        company=body.company,
        description=body.description,
        required_skills=body.required_skills,
        category=body.category,
        location=body.location,
        duration=body.duration,
    )
    return {"embedding_stored": ok, "internship_id": body.internship_id}
