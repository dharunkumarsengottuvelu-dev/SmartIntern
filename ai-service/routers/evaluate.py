"""Evaluate router — Precision@K, MRR, NDCG metrics."""

import logging
import asyncpg
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from core.config import settings
from evaluation.pipeline import run_evaluation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evaluate", tags=["evaluate"])



async def get_db():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()


class EvaluateRequest(BaseModel):
    k: int = 10
    seed_feedback: bool = False


@router.get("")
async def evaluate_route(
    k: int = Query(default=10, ge=1, le=50),
    trigger: bool = Query(default=False),
    conn: asyncpg.Connection = Depends(get_db),
):
    """
    Get the latest offline evaluation run or trigger a new one if requested.
    """
    if trigger:
        logger.info("Triggering offline evaluation inline...")
        run = await run_evaluation(k=k)
        if run:
            return run
        raise HTTPException(status_code=500, detail="Evaluation pipeline failed to run.")

    # Fetch latest stored run
    row = await conn.fetchrow(
        "SELECT * FROM evaluation_runs ORDER BY run_at DESC LIMIT 1"
    )
    if row:
        return dict(row)

    # If no runs yet, return a placeholder with instructions
    return {
        "status": "no_runs",
        "message": (
            "No evaluation runs found. "
            "Run: cd ai-service && python -m evaluation.pipeline --k 10 "
            "or call GET /evaluate?trigger=true to trigger it via API."
        ),
        "k": k,
    }


@router.post("")
async def trigger_evaluation_route(
    body: EvaluateRequest,
):
    """
    Trigger a new offline evaluation run via POST request.
    """
    logger.info("Triggering offline evaluation via POST endpoint...")
    run = await run_evaluation(k=body.k, seed_feedback=body.seed_feedback)
    if run:
        return run
    raise HTTPException(status_code=500, detail="Evaluation pipeline failed to run.")

