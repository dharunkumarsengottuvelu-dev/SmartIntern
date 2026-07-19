import re
from typing import List, Dict, Any
from types.resume_schema import ParsedResumeSchema, ProjectModel, EducationModel, ExperienceModel

class ResumeValidator:
    """Validates and sanitizes parsed resume data."""

    @staticmethod
    def validate_email(email: str) -> str:
        if not email: return ""
        pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        return email if re.match(pattern, email) else ""

    @staticmethod
    def validate_phone(phone: str) -> str:
        if not phone: return ""
        # Keep only numbers and standard symbols
        cleaned = re.sub(r'[^\d\+\-\(\)\s]', '', phone)
        return cleaned if len(re.sub(r'\D', '', cleaned)) >= 7 else ""

    @staticmethod
    def validate_url(url: str) -> str:
        if not url: return ""
        if not url.startswith('http'):
            url = f"https://{url}"
        pattern = r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
        return url if re.match(pattern, url) else ""

    @staticmethod
    def _deduplicate_list(items: List[str]) -> List[str]:
        seen = set()
        result = []
        for item in items:
            cleaned = item.strip()
            if cleaned and cleaned.lower() not in seen:
                seen.add(cleaned.lower())
                result.append(cleaned)
        return result

    @staticmethod
    def _deduplicate_objects(items: List[Any], key_attr: str) -> List[Any]:
        seen = set()
        result = []
        for item in items:
            val = getattr(item, key_attr, "")
            if not val:
                result.append(item)
                continue
            
            normalized = str(val).strip().lower()
            if normalized not in seen:
                seen.add(normalized)
                result.append(item)
        return result

    @staticmethod
    def validate_and_clean(data: ParsedResumeSchema) -> ParsedResumeSchema:
        # Validate Candidate Details
        data.candidate.email = ResumeValidator.validate_email(data.candidate.email)
        data.candidate.phone = ResumeValidator.validate_phone(data.candidate.phone)
        data.candidate.linkedin = ResumeValidator.validate_url(data.candidate.linkedin)
        data.candidate.github = ResumeValidator.validate_url(data.candidate.github)
        data.candidate.portfolio = ResumeValidator.validate_url(data.candidate.portfolio)

        # Deduplicate Skills
        data.skills.programming_languages = ResumeValidator._deduplicate_list(data.skills.programming_languages)
        data.skills.frameworks = ResumeValidator._deduplicate_list(data.skills.frameworks)
        data.skills.databases = ResumeValidator._deduplicate_list(data.skills.databases)
        data.skills.cloud = ResumeValidator._deduplicate_list(data.skills.cloud)
        data.skills.tools = ResumeValidator._deduplicate_list(data.skills.tools)
        data.skills.soft_skills = ResumeValidator._deduplicate_list(data.skills.soft_skills)
        data.languages = ResumeValidator._deduplicate_list(data.languages)

        # Deduplicate Arrays of Objects
        data.projects = ResumeValidator._deduplicate_objects(data.projects, "title")
        data.education = ResumeValidator._deduplicate_objects(data.education, "degree")
        data.experience = ResumeValidator._deduplicate_objects(data.experience, "company")

        return data
