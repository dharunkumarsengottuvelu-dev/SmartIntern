from pydantic import BaseModel, Field
from typing import Optional, List

class CandidateModel(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""

class EducationModel(BaseModel):
    degree: Optional[str] = ""
    branch: Optional[str] = ""
    institution: Optional[str] = ""
    graduation_year: Optional[str] = ""
    cgpa: Optional[float] = None
    percentage: Optional[float] = None

class ExperienceModel(BaseModel):
    company: Optional[str] = ""
    role: Optional[str] = ""
    duration: Optional[str] = ""
    description: Optional[str] = ""

class ProjectModel(BaseModel):
    title: Optional[str] = ""
    description: Optional[str] = ""
    technologies: List[str] = Field(default_factory=list)
    link: Optional[str] = ""

class SkillsModel(BaseModel):
    programming_languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    databases: List[str] = Field(default_factory=list)
    cloud: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)

class CertificationModel(BaseModel):
    name: Optional[str] = ""
    issuer: Optional[str] = ""
    year: Optional[str] = ""

class ParsedResumeSchema(BaseModel):
    candidate: CandidateModel = Field(default_factory=CandidateModel)
    education: List[EducationModel] = Field(default_factory=list)
    experience: List[ExperienceModel] = Field(default_factory=list)
    projects: List[ProjectModel] = Field(default_factory=list)
    skills: SkillsModel = Field(default_factory=SkillsModel)
    certifications: List[CertificationModel] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    ats_score: int = Field(default=0, ge=0, le=100)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    recommended_roles: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    career_level: str = ""
    confidence_score: int = Field(default=0, ge=0, le=100)
