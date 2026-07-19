"""
recommendation_engine.py — Multi-factor internship ranking.

Scoring formula (weights are configurable in core/config.py):
  final_score = (
      0.30 * semantic_similarity_score      # pgvector cosine sim
    + 0.25 * skill_match_score              # set overlap against 32-skill vocabulary
    + 0.20 * ats_score_normalized           # student ATS score / 100
    + 0.15 * assessment_score_normalized    # MCQ score / 100
    + 0.05 * location_match_bonus           # +1.0 if location matches
    + 0.05 * feedback_boost                 # reweighted by past click/save/apply events
  )

Skill matching uses EXACT set overlap (not fuzzy) because both sides draw from
the same closed 32-item vocabulary. This is faster, deterministic, and more
accurate than fuzzy matching for this data.
"""

import json
import logging
from pathlib import Path
from typing import Optional

import asyncpg
from jinja2 import Environment, FileSystemLoader

import services.ollama_client as ollama
from core.config import settings, ALLOWED_SKILLS
from models.recommendation import RankedResult
from services.semantic_search import find_similar_internships, get_resume_embedding

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_jinja_env = Environment(loader=FileSystemLoader(str(_PROMPTS_DIR)), autoescape=False)


# ── Skill matching (exact set overlap) ───────────────────────────────────────

def skill_match_score(
    student_skills: set[str], internship_required: set[str]
) -> tuple[float, list[str], list[str]]:
    """
    Returns (score 0-1, matched_skills, missing_skills).
    Both sets should already be normalised to ALLOWED_SKILLS values.
    """
    if not internship_required:
        return 0.0, [], []
    matched = student_skills & internship_required
    missing = internship_required - student_skills
    score = len(matched) / len(internship_required)
    return score, sorted(matched), sorted(missing)


# ── Feedback boost ────────────────────────────────────────────────────────────

async def get_feedback_boost(
    conn: asyncpg.Connection, user_id: str, internship_id: str
) -> float:
    """
    Return a boost score [0, 1] based on past feedback events.
    Weights: click=0.1, save=0.3, apply=0.5, outcome_hired=1.0, outcome_rejected=-0.5
    """
    EVENT_WEIGHTS = {
        "click": 0.10,
        "save": 0.30,
        "apply": 0.50,
        "outcome_hired": 1.00,
        "outcome_rejected": -0.50,
    }
    rows = await conn.fetch(
        """
        SELECT event_type, weight FROM feedback_events
        WHERE user_id = $1 AND internship_id = $2
        ORDER BY created_at DESC LIMIT 10
        """,
        user_id, internship_id,
    )
    if not rows:
        return 0.0
    total = sum(EVENT_WEIGHTS.get(r["event_type"], 0) * r["weight"] for r in rows)
    return max(0.0, min(1.0, total))


# ── Explanation generation (optional, gemma4:e4b) ────────────────────────────

async def generate_explanation(
    student_skills: list[str],
    internship_title: str,
    internship_company: str,
    required_skills: list[str],
    matched_skills: list[str],
    missing_skills: list[str],
) -> str:
    tmpl = _jinja_env.get_template("recommendation.jinja2")
    prompt = tmpl.render(
        student_skills=student_skills,
        internship_title=internship_title,
        internship_company=internship_company,
        required_skills=required_skills,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
    )
    return await ollama.generate(prompt=prompt, temperature=0.4, max_tokens=200)


# ── Main ranking function ─────────────────────────────────────────────────────

async def rank_internships(
    conn: asyncpg.Connection,
    user_id: str,
    student_skills: list[str],
    ats_score: float,
    assessment_score: float,
    student_location: str = "",
    top_k: int = 20,
    explain: bool = False,
) -> list[RankedResult]:
    """
    Full multi-factor ranking pipeline.
    1. Get resume embedding from DB
    2. pgvector semantic search
    3. Score each internship
    4. Sort and return top_k
    """
    student_skill_set = set(student_skills) & ALLOWED_SKILLS
    ats_norm = min(ats_score / 100, 1.0)
    assessment_norm = min(assessment_score / 100, 1.0)

    # ── Step 1: get resume embedding ─────────────────────────────────────────
    resume_embedding = await get_resume_embedding(conn, user_id)

    # ── Step 2: semantic candidates ──────────────────────────────────────────
    if resume_embedding:
        candidates = await find_similar_internships(conn, resume_embedding, top_k=top_k * 3)
    else:
        # No embedding yet — fall back to all active internships
        logger.warning("[Recommend] No resume embedding for user=%s — using keyword fallback", user_id)
        rows = await conn.fetch(
            """
            SELECT id, title, company, description, required_skills,
                   location, duration, stipend, category, apply_link,
                   0.0 AS similarity_score
            FROM internships WHERE is_active = true LIMIT 100
            """
        )
        candidates = [dict(r) for r in rows]

    if not candidates:
        return []

    # ── Step 3: score each candidate ─────────────────────────────────────────
    results: list[RankedResult] = []
    for c in candidates:
        raw_skills = c.get("required_skills", [])
        if isinstance(raw_skills, str):
            try:
                raw_skills = json.loads(raw_skills)
            except Exception:
                raw_skills = [s.strip() for s in raw_skills.split(",")]
        required_set = set(raw_skills) & ALLOWED_SKILLS

        skill_score, matched, missing = skill_match_score(student_skill_set, required_set)
        semantic_sim = float(c.get("similarity_score", 0.0))
        location_match = (
            1.0 if (student_location and student_location.lower() in c.get("location", "").lower())
            else 0.0
        )
        fb_boost = await get_feedback_boost(conn, user_id, c["id"])

        final = (
            settings.SEMANTIC_WEIGHT * semantic_sim
            + settings.SKILL_MATCH_WEIGHT * skill_score
            + settings.ATS_SCORE_WEIGHT * ats_norm
            + settings.ASSESSMENT_WEIGHT * assessment_norm
            + settings.LOCATION_WEIGHT * location_match
            + settings.FEEDBACK_WEIGHT * fb_boost
        )

        explanation: Optional[str] = None
        if explain and matched:
            explanation = await generate_explanation(
                student_skills=student_skills,
                internship_title=c["title"],
                internship_company=c["company"],
                required_skills=list(required_set),
                matched_skills=matched,
                missing_skills=missing,
            )

        results.append(RankedResult(
            internship_id=c["id"],
            title=c["title"],
            company=c["company"],
            location=c.get("location", ""),
            match_percentage=round(final * 100, 1),
            skill_score=round(skill_score * 100, 1),
            semantic_score=round(semantic_sim * 100, 1),
            ats_score_normalized=round(ats_norm * 100, 1),
            assessment_score_normalized=round(assessment_norm * 100, 1),
            feedback_boost=round(fb_boost * 100, 1),
            matched_skills=matched,
            missing_skills=missing,
            explanation=explanation,
            model_used=settings.LLM_MODEL if explain else None,
        ))

    results.sort(key=lambda r: r.match_percentage, reverse=True)
    return results[:top_k]
