"""Resume parsing and embedding routers."""

import asyncpg
import logging
from fastapi import APIRouter, Depends, HTTPException

from core.config import settings
from models.resume import ParseResumeRequest, ParseResumeResponse
from services.resume_parser import parse_resume
from services.embedding_service import (
    embed_and_store_resume,
    build_resume_embedding_text,
    get_embedding,
    store_resume_embedding,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resume", tags=["resume"])


async def get_db():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


@router.post("/parse", response_model=ParseResumeResponse)
async def parse_resume_route(body: ParseResumeRequest):
    """
    Parse resume text into structured JSON using local gemma4:e4b.
    Skills are constrained to the 32-item vocabulary.
    """
    if not body.text or len(body.text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text too short (< 50 chars)")
    return await parse_resume(body.text, body.user_id)


class EmbedResumeRequest(ParseResumeRequest):
    resume_id: str
    skills: list[str]
    experience_summary: str = ""
    projects_summary: str = ""
    other_skills: list[str] = []


@router.post("/embed")
async def embed_resume_route(
    body: EmbedResumeRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    """
    Generate and store a nomic-embed-text embedding for a resume.
    Should be called after /resume/parse.
    """
    ok = await embed_and_store_resume(
        conn,
        resume_id=body.resume_id,
        skills=body.skills,
        experience_summary=body.experience_summary,
        projects_summary=body.projects_summary,
        other_skills=body.other_skills,
    )
    return {"embedding_stored": ok, "resume_id": body.resume_id}
