import json
import logging
from pydantic import ValidationError
from types.resume_schema import ParsedResumeSchema
from cleaner.text_cleaner import TextCleaner
from validator.resume_validator import ResumeValidator
from extractor.section_detector import SectionDetector
import services.ollama_client as ollama
from prompts import get_prompt

logger = logging.getLogger(__name__)

class ResumeExtractor:
    """Orchestrates the entire resume extraction pipeline."""

    @staticmethod
    async def extract(raw_text: str) -> ParsedResumeSchema:
        # 1. Clean Text
        cleaned_text = TextCleaner.clean(raw_text)
        
        # 2. Detect Sections (Optional context for LLM, or fallback)
        sections = SectionDetector.detect_sections(cleaned_text)
        logger.info(f"[ResumeExtractor] Detected sections: {list(sections.keys())}")

        # 3. LLM Extraction
        prompt = get_prompt("resume_parse_v2.jinja2", resume_text=cleaned_text[:6000])
        
        raw_response = await ollama.generate(
            prompt=prompt,
            format="json",
            temperature=0.0,
            top_p=0.1,
            repeat_penalty=1.2,
            max_tokens=4096,
        )

        parsed_data = None
        
        try:
            parsed_dict = json.loads(raw_response)
            parsed_data = ParsedResumeSchema.model_validate(parsed_dict)
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning(f"[ResumeExtractor] First attempt failed. Triggering repair. Error: {str(exc)[:200]}")
            parsed_data = await ResumeExtractor._repair_json(raw_response, cleaned_text, str(exc))

        if not parsed_data:
            raise Exception("LLM extraction failed after repair attempts.")

        # 4. Validation & Sanitization
        validated_data = ResumeValidator.validate_and_clean(parsed_data)
        
        return validated_data

    @staticmethod
    async def _repair_json(invalid_json: str, original_text: str, error_msg: str) -> ParsedResumeSchema:
        repair_prompt = (
            f"Your previous response was not valid JSON or didn't match the required schema.\n"
            f"Error: {error_msg[:300]}\n\n"
            f"Return ONLY valid JSON. No explanations.\n"
            f"Previous output:\n{invalid_json[:500]}\n\n"
        )
        
        response = await ollama.generate(
            prompt=repair_prompt,
            format="json",
            temperature=0.0,
            max_tokens=4096,
        )
        
        try:
            parsed_dict = json.loads(response)
            return ParsedResumeSchema.model_validate(parsed_dict)
        except Exception as e:
            logger.error(f"[ResumeExtractor] Repair failed: {e}")
            return None
