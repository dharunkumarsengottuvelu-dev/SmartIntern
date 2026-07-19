"""Recommendation router."""

import asyncpg
import logging
from fastapi import APIRouter, Depends, HTTPException

from core.config import settings
from models.recommendation import RecommendRequest, RecommendResponse
from services.recommendation_engine import rank_internships

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommend", tags=["recommend"])


async def get_db():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


class FullRecommendRequest(RecommendRequest):
    student_skills: list[str] = []
    ats_score: float = 0.0
    assessment_score: float = 0.0
    student_location: str = ""


@router.post("", response_model=RecommendResponse)
async def recommend_route(
    body: FullRecommendRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    """
    Multi-factor internship ranking:
    semantic similarity + skill match + ATS + assessment + location + feedback.
    Pass explain=true to include a 2-sentence gemma4:e4b explanation per result.
    """
    results = await rank_internships(
        conn=conn,
        user_id=body.user_id,
        student_skills=body.student_skills,
        ats_score=body.ats_score,
        assessment_score=body.assessment_score,
        student_location=body.student_location,
        top_k=body.top_k,
        explain=body.explain,
    )
    return RecommendResponse(
        user_id=body.user_id,
        results=results,
        model_used=settings.LLM_MODEL,
    )
