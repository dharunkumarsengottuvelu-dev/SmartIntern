"""Feedback events router."""

import asyncpg
import logging
from fastapi import APIRouter, Depends, HTTPException

from core.config import settings
from models.recommendation import FeedbackRequest, FeedbackResponse
from services.feedback_learner import record_feedback

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["feedback"])


async def get_db():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


@router.post("", response_model=FeedbackResponse)
async def feedback_route(
    body: FeedbackRequest,
    conn: asyncpg.Connection = Depends(get_db),
):
    """Record a user interaction event (click, save, apply, outcome)."""
    try:
        event_id = await record_feedback(conn, body.user_id, body.internship_id, body.event_type)
        return FeedbackResponse(recorded=True, event_id=event_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/mcq/generate")
async def generate_mcq_route(body: dict):
    """
    Generate MCQ questions for the given skills using local gemma4:e4b.
    Body: { skills: string[], count: int }
    """
    from services.mcq_generator import generate_mcqs
    skills = body.get("skills", [])
    count = min(int(body.get("count", 20)), 30)  # cap at 30
    if not skills:
        raise HTTPException(status_code=400, detail="skills array is required")
    questions = await generate_mcqs(skills=skills, count=count)
    return {"questions": questions, "total": len(questions)}
