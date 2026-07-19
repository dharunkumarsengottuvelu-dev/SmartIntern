import re
from types.resume_schema import ParsedResumeSchema

class AtsScorer:
    """Deterministic ATS Scoring Engine."""

    @staticmethod
    def calculate_score(resume: ParsedResumeSchema, raw_text: str) -> int:
        score = 0
        
        # 1. Section Completeness (Max 30)
        if resume.candidate.email and resume.candidate.phone: score += 5
        if resume.candidate.linkedin or resume.candidate.github: score += 5
        if resume.education: score += 5
        if resume.experience: score += 5
        if resume.projects: score += 5
        if resume.skills.programming_languages or resume.skills.tools: score += 5
        
        # 2. Volume of Content (Max 20)
        # Experience and Projects hold weight
        exp_count = min(len(resume.experience), 3)
        proj_count = min(len(resume.projects), 3)
        score += (exp_count * 4) + (proj_count * 2) # Max 18
        if len(resume.certifications) > 0: score += 2

        # 3. Keyword Density and Skills (Max 20)
        total_skills = len(resume.skills.programming_languages) + len(resume.skills.frameworks) + len(resume.skills.tools)
        if total_skills >= 15: score += 20
        elif total_skills >= 10: score += 15
        elif total_skills >= 5: score += 10
        elif total_skills > 0: score += 5
        
        # 4. Readability and Formatting Heuristics (Max 15)
        # Check for bullet points (dashes or asterisks)
        bullet_count = len(re.findall(r'(?m)^[\s]*[-•*]\s+', raw_text))
        if bullet_count > 10: score += 10
        elif bullet_count > 5: score += 5
        
        word_count = len(raw_text.split())
        # Optimal resume length is usually 300 - 800 words
        if 300 <= word_count <= 800: score += 5
        
        # 5. Action Verbs (Max 15)
        action_verbs = ['developed', 'designed', 'implemented', 'managed', 'created', 'led', 
                        'optimized', 'built', 'improved', 'achieved', 'spearheaded', 'resolved']
        
        verb_matches = 0
        raw_lower = raw_text.lower()
        for verb in action_verbs:
            if verb in raw_lower:
                verb_matches += 1
                
        if verb_matches >= 6: score += 15
        elif verb_matches >= 4: score += 10
        elif verb_matches >= 2: score += 5

        # Cap at 100
        return min(max(score, 0), 100)
