from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Ollama
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    LLM_MODEL: str = "llama3.2"
    EMBED_MODEL: str = "nomic-embed-text"
    OFFLINE_MODE: bool = True

    # Database
    DATABASE_URL: str

    # Redis (optional — falls back to in-memory LRU if not set)
    REDIS_URL: Optional[str] = "redis://redis:6379"

    # Security
    INTERNAL_TOKEN: Optional[str] = None

    # ATS scoring weights
    SEMANTIC_WEIGHT: float = 0.30
    SKILL_MATCH_WEIGHT: float = 0.25
    ATS_SCORE_WEIGHT: float = 0.20
    ASSESSMENT_WEIGHT: float = 0.15
    LOCATION_WEIGHT: float = 0.05
    FEEDBACK_WEIGHT: float = 0.05

    # Rate limiting
    RATE_LIMIT: str = "60/minute"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()

# The closed 32-skill vocabulary derived from the actual internship CSV data.
# Both the resume parser and the skill-match scorer use this exact set.
ALLOWED_SKILLS: set[str] = {
    "Agile", "CSS", "Collaboration", "Communication", "Cryptography",
    "Cybersecurity", "Data Analysis", "Docker", "Excel", "Express", "Git",
    "HTML", "JavaScript", "Linux", "Machine Learning", "MongoDB",
    "Networking", "Node.js", "PostgreSQL", "Power BI", "Problem Solving",
    "Product Strategy", "PyTorch", "Python", "REST APIs", "React", "SQL",
    "Scikit-Learn", "Tableau", "Tailwind", "TensorFlow", "TypeScript",
}
