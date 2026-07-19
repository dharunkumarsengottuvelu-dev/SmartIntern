import pytest
from scoring.ats_scorer import AtsScorer
from types.resume_schema import ParsedResumeSchema, CandidateModel, SkillsModel, ExperienceModel

def test_calculate_score_empty():
    resume = ParsedResumeSchema()
    score = AtsScorer.calculate_score(resume, "")
    assert score == 0

def test_calculate_score_full():
    resume = ParsedResumeSchema(
        candidate=CandidateModel(email="test@test.com", phone="1234567890"),
        skills=SkillsModel(programming_languages=["Python", "Java", "C++", "JavaScript", "Go", "Rust"]),
        experience=[ExperienceModel(company="A"), ExperienceModel(company="B"), ExperienceModel(company="C")]
    )
    
    # 300 words with action verbs
    raw_text = " ".join(["developed"] * 5 + ["word"] * 300)
    
    score = AtsScorer.calculate_score(resume, raw_text)
    
    # Check components
    # Completeness: email+phone (5) + experience (5) + skills (5) = 15
    # Volume: 3 exp * 4 = 12
    # Keywords: 6 skills = 10
    # Readability: 300 words = 5
    # Verbs: developed (1 match) -> <2 matches -> 0
    # Expected: 15 + 12 + 10 + 5 + 0 = 42
    
    assert score == 42

def test_calculate_score_high():
    resume = ParsedResumeSchema(
        candidate=CandidateModel(email="test@test.com", phone="1234567890", linkedin="https://linkedin.com/in/test"),
        skills=SkillsModel(
            programming_languages=["Python", "Java", "C++", "JavaScript", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin"],
            frameworks=["React", "Django", "Spring", "Angular", "Vue", "Node.js"]
        ), # 16 skills -> 20 pts
        experience=[ExperienceModel(company="A"), ExperienceModel(company="B"), ExperienceModel(company="C")], # 12 pts
        projects=[ExperienceModel(company="A"), ExperienceModel(company="B"), ExperienceModel(company="C")], # 6 pts
        education=[ExperienceModel(company="A")]
    )
    
    raw_text = """
    - Spearheaded the development of a new microservice.
    - Optimized database queries for speed.
    - Managed a team of 5 engineers.
    - Designed the architecture for the frontend.
    - Built the CI/CD pipeline.
    - Implemented a caching layer.
    """ + " ".join(["word"] * 400) # 6 bullet points (5 pts), 400 words (5 pts), 6 verbs (15 pts)

    score = AtsScorer.calculate_score(resume, raw_text)
    
    # Completeness: 5+5+5+5+5+5 = 30
    # Volume: 12 + 6 = 18
    # Keywords: 20
    # Readability: 5 + 5 = 10
    # Verbs: 15
    # Total: 30 + 18 + 20 + 10 + 15 = 93
    
    assert score == 93
