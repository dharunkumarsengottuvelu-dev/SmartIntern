"""Chat (career advisor) router."""

import logging
from fastapi import APIRouter
from pydantic import BaseModel

from services.career_advisor import get_career_advice

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/career-advisor", tags=["chat"])


class CareerAdvisorRequest(BaseModel):
    user_id: str
    query: str
    mode: str = "chat"
    student_context: str = ""
    internship_catalog: str = ""
    matched_internships: str = ""


class CareerAdvisorResponse(BaseModel):
    response: str
    model_used: str


@router.post("", response_model=CareerAdvisorResponse)
async def career_advisor_route(body: CareerAdvisorRequest):
    """
    Career advice / chat via local gemma4:e4b.
    The Next.js app assembles the student context string before calling this endpoint.
    """
    from core.config import settings
    response = await get_career_advice(
        query=body.query,
        student_context=body.student_context,
        internship_catalog=body.internship_catalog,
        matched_internships=body.matched_internships,
        mode=body.mode,
    )
    return CareerAdvisorResponse(response=response, model_used=settings.LLM_MODEL)
