"""
feedback_learner.py — Store feedback events and return the boost score.

Events stored in feedback_events table (see schema migration).
The boost score is read by recommendation_engine.py at ranking time.
"""

import logging
import uuid

import asyncpg

logger = logging.getLogger(__name__)

EVENT_WEIGHTS = {
    "click": 0.10,
    "save": 0.30,
    "apply": 0.50,
    "outcome_hired": 1.00,
    "outcome_rejected": -0.50,
}


async def record_feedback(
    conn: asyncpg.Connection,
    user_id: str,
    internship_id: str,
    event_type: str,
) -> str:
    """
    Record a feedback event. Returns the new event's UUID.
    Raises ValueError for unknown event_type.
    """
    if event_type not in EVENT_WEIGHTS:
        raise ValueError(
            f"Unknown event_type {event_type!r}. "
            f"Allowed: {list(EVENT_WEIGHTS)}"
        )

    weight = EVENT_WEIGHTS[event_type]
    event_id = str(uuid.uuid4())

    await conn.execute(
        """
        INSERT INTO feedback_events (id, user_id, internship_id, event_type, weight)
        VALUES ($1, $2, $3, $4, $5)
        """,
        event_id, user_id, internship_id, event_type, weight,
    )
    logger.info(
        "[Feedback] Recorded event=%s user=%s internship=%s weight=%.2f",
        event_type, user_id, internship_id, weight,
    )
    return event_id
