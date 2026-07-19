"""
resume_parser.py — Parse resume text into structured JSON using gemma4:e4b or llama3.2.

Two-layer reliability strategy:
1. Ollama JSON mode (format="json") constrains the model's token grammar —
   it cannot produce syntactically invalid JSON.
2. Pydantic validation + one correction-prompt retry — if the valid JSON
   doesn't match the schema, we send a targeted correction prompt and try once more.

Skills are automatically normalized and categorized by the ResumeAI Pro v2.0 prompt.
"""

import json
import logging
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from pydantic import ValidationError

import services.ollama_client as ollama
from core.config import settings
from models.resume import ParsedResume, ParseResumeResponse

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_jinja_env = Environment(loader=FileSystemLoader(str(_PROMPTS_DIR)), autoescape=False)


def _render_prompt(template_name: str, **kwargs) -> str:
    tmpl = _jinja_env.get_template(template_name)
    return tmpl.render(**kwargs)


async def parse_resume(text: str, user_id: str) -> ParseResumeResponse:
    """
    Parse resume text into a structured ParsedResume.
    Tries once with JSON mode; retries with a correction prompt if Pydantic
    validation fails.
    """
    prompt = _render_prompt("resume_parse.jinja2", resume_text=text[:6000])

    # ── Attempt 1: normal call with JSON mode ─────────────────────────────────
    raw_response = await ollama.generate(
        prompt=prompt,
        format="json",
        temperature=0.1,
        max_tokens=4096,
    )

    parsed_dict = {}
    validation_error_msg = ""

    try:
        parsed_dict = json.loads(raw_response)
        result = ParsedResume.model_validate(parsed_dict)
        logger.info(
            "[ResumeParser] Parsed successfully for user=%s",
            user_id
        )
        return ParseResumeResponse(
            user_id=user_id,
            parsed=result,
            model_used=settings.LLM_MODEL,
        )
    except (json.JSONDecodeError, ValidationError) as exc:
        validation_error_msg = str(exc)
        logger.warning("[ResumeParser] First attempt failed: %s", validation_error_msg[:200])

    # ── Attempt 2: correction prompt ──────────────────────────────────────────
    correction_prompt = (
        f"Your previous response was not valid JSON or didn't match the required ResumeAI Pro v2.0 schema.\n"
        f"Error: {validation_error_msg[:300]}\n\n"
        f"Return ONLY valid JSON matching the exact schema provided earlier. No extra text.\n"
        f"Previous output was:\n{raw_response[:500]}\n\n"
        f"Original resume text:\n{text[:4000]}"
    )

    corrected_response = await ollama.generate(
        prompt=correction_prompt,
        format="json",
        temperature=0.05,
        max_tokens=4096,
    )

    try:
        parsed_dict = json.loads(corrected_response)
        result = ParsedResume.model_validate(parsed_dict)
        logger.info(
            "[ResumeParser] Corrected parse succeeded for user=%s", user_id
        )
        return ParseResumeResponse(
            user_id=user_id,
            parsed=result,
            model_used=settings.LLM_MODEL,
        )
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.error("[ResumeParser] Both attempts failed for user=%s: %s", user_id, exc)
        # Return a minimal valid result rather than crashing — the ATS engine
        # can still run with empty skills; user will see a low score and be
        # prompted to re-upload.
        return ParseResumeResponse(
            user_id=user_id,
            parsed=ParsedResume(),
            model_used=settings.LLM_MODEL,
        )
