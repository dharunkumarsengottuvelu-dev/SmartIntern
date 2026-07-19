from pydantic import BaseModel
from typing import Optional


class RankedResult(BaseModel):
    internship_id: str
    title: str
    company: str
    location: str
    match_percentage: float
    skill_score: float
    semantic_score: float
    ats_score_normalized: float
    assessment_score_normalized: float
    feedback_boost: float
    matched_skills: list[str]
    missing_skills: list[str]
    explanation: Optional[str] = None
    model_used: Optional[str] = None


class RecommendRequest(BaseModel):
    user_id: str
    top_k: int = 20
    explain: bool = False


class RecommendResponse(BaseModel):
    user_id: str
    results: list[RankedResult]
    model_used: str


class FeedbackRequest(BaseModel):
    user_id: str
    internship_id: str
    event_type: str  # click | save | apply | outcome_hired | outcome_rejected


class FeedbackResponse(BaseModel):
    recorded: bool
    event_id: str
