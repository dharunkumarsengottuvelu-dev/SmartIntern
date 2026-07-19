"""
mcq_generator.py — MCQ generation using local gemma4:e4b.

Replaces the Grok-based generateMCQs() from lib/openai.ts.
Uses JSON mode for reliable structure, with one retry on validation failure.
"""

import json
import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from pydantic import BaseModel, field_validator

import services.ollama_client as ollama
from core.config import settings

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_jinja_env = Environment(loader=FileSystemLoader(str(_PROMPTS_DIR)), autoescape=False)


class MCQQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    difficulty: str = "medium"
    topic: str = ""

    @field_validator("options")
    @classmethod
    def must_have_four_options(cls, v: list[str]) -> list[str]:
        if len(v) != 4:
            raise ValueError(f"MCQ must have exactly 4 options, got {len(v)}")
        return v

    @field_validator("answer")
    @classmethod
    def answer_must_be_in_options(cls, v: str, info) -> str:
        options = info.data.get("options", [])
        if options and v not in options:
            # Try to recover: if answer is A/B/C/D style, map to option
            mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
            if v.upper() in mapping and mapping[v.upper()] < len(options):
                return options[mapping[v.upper()]]
            # Use first option as fallback
            return options[0] if options else v
        return v


async def generate_mcqs(
    skills: list[str],
    count: int = 20,
) -> list[dict]:
    """
    Generate count MCQs for the given skills using local gemma4:e4b.
    Returns a list of MCQ dicts. Falls back to empty list only if both
    attempts fail completely.
    """
    skills_list = ", ".join(skills[:12])  # cap at 12 to keep prompt tight
    tmpl = _jinja_env.get_template("mcq_generate.jinja2")
    prompt = tmpl.render(skills_list=skills_list, count=count)

    # ── Attempt 1 ────────────────────────────────────────────────────────────
    raw = await ollama.generate(
        prompt=prompt,
        format="json",
        temperature=0.7,
        max_tokens=4096,
    )

    questions = _parse_mcqs(raw, skills)
    if questions:
        logger.info("[MCQGen] Generated %d questions for skills: %s", len(questions), skills_list[:80])
        return [q.model_dump() for q in questions]

    # ── Attempt 2: correction ─────────────────────────────────────────────────
    correction = (
        f"Your response did not produce valid MCQ JSON. "
        f"Return ONLY a JSON object with a 'questions' array. "
        f"Each question needs: question, options (array of 4 strings), answer (must be one of the options), "
        f"difficulty (easy/medium/hard), topic.\n"
        f"Generate {count} questions for: {skills_list}"
    )
    raw2 = await ollama.generate(
        prompt=correction,
        format="json",
        temperature=0.3,
        max_tokens=4096,
    )
    questions = _parse_mcqs(raw2, skills)
    if questions:
        return [q.model_dump() for q in questions]

    logger.error("[MCQGen] Both attempts failed — returning empty questions list")
    return []


def _parse_mcqs(raw: str, skills: list[str]) -> list[MCQQuestion]:
    try:
        data = json.loads(raw)
        raw_questions = data.get("questions", [])
        if not raw_questions and isinstance(data, list):
            raw_questions = data

        valid: list[MCQQuestion] = []
        for q in raw_questions:
            try:
                valid.append(MCQQuestion.model_validate(q))
            except Exception as exc:
                logger.debug("[MCQGen] Skipping invalid question: %s", exc)

        return valid
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("[MCQGen] Parse failed: %s", exc)
        return []
