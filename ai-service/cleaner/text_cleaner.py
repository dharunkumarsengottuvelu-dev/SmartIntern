import re
import unicodedata

class TextCleaner:
    """Cleans and normalizes text extracted from resumes."""

    @staticmethod
    def clean(text: str) -> str:
        if not text:
            return ""

        # Normalize Unicode (e.g. converting ligatures, smart quotes)
        text = unicodedata.normalize('NFKD', text)

        # Remove page numbers (e.g., "Page 1 of 2", "- 1 -", "1 | Page")
        text = re.sub(r'(?i)page\s+\d+\s+of\s+\d+', '', text)
        text = re.sub(r'(?i)^\s*-\s*\d+\s*-\s*$', '', text, flags=re.MULTILINE)
        text = re.sub(r'(?i)^\s*\d+\s*\|\s*page\s*$', '', text, flags=re.MULTILINE)

        # Remove special symbols (keep standard punctuation)
        # We keep word characters, whitespaces, and basic punctuation
        text = re.sub(r'[^\w\s\.,;:!@#\$%\^&\*\(\)\-\+=\[\]\{\}\\\|\'"<>\?/]', ' ', text)

        # Remove duplicate consecutive words (case-insensitive)
        # E.g. "software software engineer" -> "software engineer"
        # Note: simplistic regex, can be aggressive, use carefully
        text = re.sub(r'\b(\w+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)

        # Remove extra spaces and empty lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r'[ \t]+', ' ', text)

        # Strip leading/trailing whitespaces from each line
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        return '\n'.join(lines)
