"""
career_advisor.py — AI chat and career roadmap via local gemma4:e4b.

The student context (profile, resume, assessment, recommendations) is assembled
by the Next.js layer and passed as a pre-formatted string. This service only
handles the Ollama call and response formatting.
"""

import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

import services.ollama_client as ollama
from core.config import settings

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_jinja_env = Environment(loader=FileSystemLoader(str(_PROMPTS_DIR)), autoescape=False)


async def get_career_advice(
    query: str,
    student_context: str,
    internship_catalog: str = "",
    matched_internships: str = "",
    mode: str = "chat",
) -> str:
    """
    Generate a career advice response using gemma4:e4b via local Ollama.

    mode: "chat" | "roadmap" | "gap_analysis" | "interview_prep"
    """
    tmpl = _jinja_env.get_template("career_roadmap.jinja2")
    rendered = tmpl.render(
        student_context=student_context,
        internship_catalog=internship_catalog or "No catalog data provided.",
        matched_internships=matched_internships or "No matched internships yet.",
        query=query,
    )

    response = await ollama.generate(
        prompt=rendered,
        temperature=0.65,
        max_tokens=1400,
    )

    logger.info("[CareerAdvisor] mode=%s response_len=%d", mode, len(response))
    return response
