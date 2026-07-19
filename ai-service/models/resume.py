from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any, Union


class ValueConfidenceString(BaseModel):
    value: Optional[str] = None
    confidence: int = 0


class ValueConfidenceInt(BaseModel):
    value: Optional[int] = None
    confidence: int = 0


class ValueConfidenceFloat(BaseModel):
    value: Optional[float] = None
    confidence: int = 0


class ValueConfidenceEmail(BaseModel):
    value: Optional[str] = None
    confidence: int = 0
    valid: bool = False


class ValueConfidencePhone(BaseModel):
    value: Optional[str] = None
    confidence: int = 0
    valid: bool = False


class PersonalModel(BaseModel):
    full_name: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    email: ValueConfidenceEmail = Field(default_factory=ValueConfidenceEmail)
    phone: ValueConfidencePhone = Field(default_factory=ValueConfidencePhone)
    linkedin: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    github: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    portfolio: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    location: ValueConfidenceString = Field(default_factory=ValueConfidenceString)


class EducationEntry(BaseModel):
    degree: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    branch: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    college: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    university: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    graduation_year: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    cgpa: ValueConfidenceFloat = Field(default_factory=ValueConfidenceFloat)
    percentage: ValueConfidenceFloat = Field(default_factory=ValueConfidenceFloat)


class TechnicalSkillsModel(BaseModel):
    programming_languages: List[str] = []
    frontend: List[str] = []
    backend: List[str] = []
    database: List[str] = []
    cloud: List[str] = []
    devops: List[str] = []
    operating_systems: List[str] = []
    machine_learning: List[str] = []
    deep_learning: List[str] = []
    artificial_intelligence: List[str] = []
    data_science: List[str] = []
    mobile_development: List[str] = []
    frameworks: List[str] = []
    libraries: List[str] = []
    tools: List[str] = []
    version_control: List[str] = []
    other: List[str] = []
    skill_confidence: int = 0
    total_skills_found: int = 0
    duplicate_skills_removed: List[str] = []


class ProjectTech(BaseModel):
    programming_languages: List[str] = []
    frameworks: List[str] = []
    databases: List[str] = []
    tools: List[str] = []
    other: List[str] = []


class ProjectEntry(BaseModel):
    project_name: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    description: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    role: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    duration: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    technologies: ProjectTech = Field(default_factory=ProjectTech)
    github_link: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    deployment_link: ValueConfidenceString = Field(default_factory=ValueConfidenceString)


class ProjectsModel(BaseModel):
    projects: List[ProjectEntry] = []
    total_projects: int = 0


class ExperienceEntry(BaseModel):
    company: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    role: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    is_internship: bool = False
    start_date: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    end_date: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    duration: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    responsibilities: List[str] = []
    technologies_used: List[str] = []


class ExperienceModel(BaseModel):
    experience: List[ExperienceEntry] = []
    total_experience_months: int = 0


class CertificationEntry(BaseModel):
    certificate_name: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    issuer: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    issue_date: ValueConfidenceString = Field(default_factory=ValueConfidenceString)
    credential_id: ValueConfidenceString = Field(default_factory=ValueConfidenceString)


class CertificationsModel(BaseModel):
    certifications: List[CertificationEntry] = []
    total_certifications: int = 0


class AchievementsModel(BaseModel):
    hackathons: List[str] = []
    coding_competitions: List[str] = []
    research_papers: List[str] = []
    awards: List[str] = []
    open_source: List[str] = []
    other: List[str] = []
    total_achievements: int = 0


class ATSSubScores(BaseModel):
    formatting: int = 0
    keyword_match: int = 0
    technical_depth: int = 0
    experience: int = 0
    education: int = 0
    projects: int = 0
    communication: int = 0


class ATSScoreBreakdown(BaseModel):
    skills_max: int = 35
    projects_max: int = 25
    education_max: int = 20
    certifications_max: int = 10
    formatting_max: int = 10


class ATSAnalysisModel(BaseModel):
    ats_score: int = 0
    sub_scores: ATSSubScores = Field(default_factory=ATSSubScores)
    score_breakdown: ATSScoreBreakdown = Field(default_factory=ATSScoreBreakdown)
    strengths: List[str] = []
    weaknesses: List[str] = []
    missing_skills: List[str] = []
    resume_quality: str = ""
    recruiter_feedback: str = ""
    improvement_tips: List[str] = []


class InternshipRecommendation(BaseModel):
    domain: str = ""
    confidence: int = 0
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    reason: str = ""


class MCQOptions(BaseModel):
    A: str = ""
    B: str = ""
    C: str = ""
    D: str = ""


class MCQQuestion(BaseModel):
    question_id: int
    skill: str
    topic: str
    difficulty: str
    question: str
    options: MCQOptions
    correct_answer: str
    explanation: str


class MetadataModel(BaseModel):
    analysis_version: str = "ResumeAI Pro v2.0"
    resume_format: str = "TXT"
    total_pages: int = 1
    word_count: int = 0
    processing_status: str = "success"
    warnings: List[str] = []


class ParsedResume(BaseModel):
    personal: PersonalModel = Field(default_factory=PersonalModel)
    education: List[EducationEntry] = []
    technical_skills: TechnicalSkillsModel = Field(default_factory=TechnicalSkillsModel)
    soft_skills: List[str] = []
    languages_known: List[str] = []
    projects: ProjectsModel = Field(default_factory=ProjectsModel)
    experience: ExperienceModel = Field(default_factory=ExperienceModel)
    certifications: CertificationsModel = Field(default_factory=CertificationsModel)
    achievements: AchievementsModel = Field(default_factory=AchievementsModel)
    ats_analysis: ATSAnalysisModel = Field(default_factory=ATSAnalysisModel)
    internship_recommendations: List[InternshipRecommendation] = []
    mcq_questions: List[MCQQuestion] = []
    metadata: MetadataModel = Field(default_factory=MetadataModel)


class ParseResumeRequest(BaseModel):
    text: str
    user_id: str


class ParseResumeResponse(BaseModel):
    user_id: str
    parsed: ParsedResume
    model_used: str
