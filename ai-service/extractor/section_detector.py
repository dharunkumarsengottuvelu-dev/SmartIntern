import re
from typing import Dict

class SectionDetector:
    """Detects standard sections in a resume based on regex heuristics."""

    SECTION_PATTERNS = {
        "summary": r"(?i)^(?:summary|profile|about me|objective)\b",
        "education": r"(?i)^(?:education|academic background|coursework)\b",
        "experience": r"(?i)^(?:experience|employment history|work experience|professional experience|internships)\b",
        "projects": r"(?i)^(?:projects|personal projects|academic projects)\b",
        "skills": r"(?i)^(?:skills|technical skills|technologies|tools|frameworks|soft skills)\b",
        "achievements": r"(?i)^(?:achievements|awards|honors)\b",
        "certifications": r"(?i)^(?:certifications|certificates|licenses)\b",
        "languages": r"(?i)^(?:languages)\b",
        "publications": r"(?i)^(?:publications|research|papers)\b",
    }

    @staticmethod
    def detect_sections(text: str) -> Dict[str, str]:
        """
        Attempts to partition the resume text into known sections.
        Returns a dictionary mapping section names to their text content.
        """
        lines = text.split('\n')
        sections = {}
        current_section = "unclassified"
        sections[current_section] = []

        for line in lines:
            line_stripped = line.strip()
            # Fast heuristic: section headers are usually short and don't end in punctuation
            if 0 < len(line_stripped) < 50 and not line_stripped.endswith(('.', ',', ';')):
                matched = False
                for sec_name, pattern in SectionDetector.SECTION_PATTERNS.items():
                    if re.match(pattern, line_stripped):
                        current_section = sec_name
                        if current_section not in sections:
                            sections[current_section] = []
                        matched = True
                        break
                
                # If matched a header, we skip appending the header itself to the content 
                # (or append it, depends on preference, let's append it for LLM context)
            
            sections[current_section].append(line)

        # Join lines back into strings
        return {k: '\n'.join(v).strip() for k, v in sections.items() if v}
