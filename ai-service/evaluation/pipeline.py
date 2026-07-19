"""
evaluation/pipeline.py — Offline evaluation pipeline for SmartIntern.

Calculates Precision@K, Recall@K, Mean Reciprocal Rank (MRR),
Normalized Discounted Cumulative Gain (NDCG), and ATS Mean Absolute Error (MAE).
Saves the results in the evaluation_runs table.
"""

import argparse
import asyncio
import logging
import math
import re
import sys
import time
from typing import Optional

import asyncpg

# Adjust system path to import core/services correctly
from core.config import settings, ALLOWED_SKILLS
from services.recommendation_engine import rank_internships
from services.resume_parser import parse_resume

# Calibrate logging for pipeline run
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("evaluation_pipeline")


# ─── Python translation of ATS score calculator (matches lib/ats.ts) ──────────

HIGH_DEMAND_SKILLS = {
    "react", "next.js", "typescript", "node.js", "python", "aws", "docker",
    "kubernetes", "graphql", "postgresql", "mongodb", "redis", "ci/cd",
    "microservices", "system design", "machine learning", "tensorflow", "pytorch",
    "spring boot", "kafka", "elasticsearch", "terraform", "azure", "gcp",
    "nextjs", "react native", "flutter", "fastapi", "django", "nestjs"
}

HIGH_DEMAND_CERTS = {
    "aws certified", "google cloud", "azure certified", "cka", "ckad",
    "pmp", "scrum master", "tensorflow developer", "meta developer",
    "coursera", "udemy", "nptel"
}

def calculate_ats_score(
    technical: list[str],
    programming: list[str],
    tools: list[str],
    certifications: list[str],
    projects: list[str],
    education: list[str],
    raw_text: str
) -> float:
    # 1. Skills score
    all_skills = [s.lower().strip() for s in (technical + programming + tools)]
    unique_skills = set(all_skills)
    
    high_demand_count = sum(
        1 for s in unique_skills
        if any(h in s or s in h for h in HIGH_DEMAND_SKILLS)
    )
    
    prog_depth = min(len(programming) * 1.5, 5.0)
    tech_depth = min(len(technical) * 1.5, 10.0)
    tool_depth = min(len(tools) * 1.5, 7.0)
    demand_bonus = min(high_demand_count * 2.5, 8.0)
    
    total_skills = len(unique_skills)
    diversity_bonus = 5.0 if total_skills >= 12 else (3.0 if total_skills >= 8 else (1.0 if total_skills >= 4 else 0.0))
    
    skills_score = min(prog_depth + tech_depth + tool_depth + demand_bonus + diversity_bonus, 35.0)
    
    # 2. Projects score
    lower_text = raw_text.lower()
    
    has_metrics = bool(re.search(r"\d+%|\d+ users?|\d+x|\$\d+|millions?|thousands?|reduced|improved|increased|optimized", lower_text))
    has_deployment = bool(re.search(r"deployed|production|vercel|heroku|aws|live|hosted|netlify|railway", lower_text))
    has_github = bool(re.search(r"github\.com|open.?source|repository|repo", lower_text))
    has_team = bool(re.search(r"team|collaborated|led|agile|scrum|sprint|managed", lower_text))
    has_tech_stack = bool(re.search(r"full.?stack|front.?end|back.?end|api|database|server", lower_text))
    
    proj_len = len(projects)
    proj_base = 18.0 if proj_len >= 3 else (15.0 if proj_len >= 2 else (10.0 if proj_len >= 1 else 0.0))
    
    if has_metrics: proj_base += 3
    if has_deployment: proj_base += 2
    if has_github: proj_base += 2
    if has_team: proj_base += 1
    if has_tech_stack: proj_base += 1
    
    projects_score = min(proj_base, 25.0)
    
    # 3. Education score
    has_bachelor = bool(re.search(r"b\.?tech|b\.?e\.|bachelor|b\.?sc|b\.?cs|undergraduate|bca|engineering", lower_text))
    has_master = bool(re.search(r"m\.?tech|m\.?e\.|master|m\.?sc|postgraduate|mba|mca", lower_text))
    has_gpa = bool(re.search(r"gpa|cgpa|percentage|grade|\d{1,2}\.\d{1,2}\s*cgpa|\d{2,3}%", lower_text))
    has_reputed = bool(re.search(r"iit|nit|bits|vit|srm|anna university|national institute|top university|delhi university|mumbai university|college|institute|university", lower_text))
    
    edu_base = 18.0 if (has_master or has_bachelor or len(education) > 0) else 12.0
    if has_gpa: edu_base += 1
    if has_reputed: edu_base += 1
    
    education_score = min(edu_base, 20.0)
    
    # 4. Certifications score
    high_demand_cert_count = sum(1 for c in HIGH_DEMAND_CERTS if c in lower_text)
    any_mooc = bool(re.search(r"coursera|udemy|edx|nptel|linkedin learning|pluralsight|alison", lower_text))
    has_cert = bool(re.search(r"certif|certificate|certification", lower_text))
    
    certs_score = 0.0
    if high_demand_cert_count >= 1 or len(certifications) >= 1 or any_mooc or has_cert:
        certs_score = 10.0
        
    # 5. Formatting score
    sections = ["experience", "education", "skills", "projects", "summary", "objective", "contact", "achievements", "certifications", "internship", "work experience"]
    found_sections = sum(1 for s in sections if s in lower_text)
    
    has_bullets = "•" in raw_text or "‣" in raw_text or "→" in raw_text or any(l.strip().startswith("-") for l in raw_text.split("\n"))
    has_quantified = bool(re.search(r"\d+", raw_text))
    has_contact_info = bool(re.search(r"email|phone|\+91|@gmail|@yahoo|linkedin|github", lower_text))
    good_length = 300 < len(raw_text) < 8000
    has_name = len(raw_text.split("\n")[0].strip()) > 2
    
    fmt_score = 2.0
    fmt_score += min(found_sections * 2.0, 5.0)
    if has_bullets: fmt_score += 1
    if has_quantified: fmt_score += 1
    if has_contact_info: fmt_score += 1
    if good_length: fmt_score += 1
    if has_name: fmt_score += 1
    
    formatting_score = min(round(fmt_score), 10.0)
    
    return min(skills_score + projects_score + education_score + certs_score + formatting_score, 100.0)


# ─── Seeding Synthetic Feedback Events if database is empty ──────────────────

async def seed_synthetic_feedback(conn: asyncpg.Connection) -> None:
    logger.info("Checking for feedback events...")
    count = await conn.fetchval("SELECT count(*) FROM feedback_events")
    if count > 0:
        logger.info(f"Database already has {count} feedback events. Skipping seeding.")
        return

    logger.info("No feedback events found. Seeding synthetic feedback events for students...")
    
    # Get all active internships
    internships = await conn.fetch("SELECT id, title, required_skills FROM internships WHERE is_active = true")
    if not internships:
        logger.warning("No active internships found. Cannot seed feedback.")
        return
        
    # Get all student resumes
    resumes = await conn.fetch("SELECT r.id, r.user_id, r.extracted_skills FROM resumes r JOIN users u ON r.user_id = u.id WHERE u.role = 'student'")
    if not resumes:
        logger.warning("No student resumes found. Cannot seed feedback.")
        return

    import json
    import random
    
    seeded_count = 0
    for r in resumes:
        user_id = r["user_id"]
        # Extract skills
        try:
            skills_data = r["extracted_skills"]
            if isinstance(skills_data, str):
                skills_data = json.loads(skills_data)
            
            student_skills = set(
                skills_data.get("technical", []) + 
                skills_data.get("programming", []) + 
                skills_data.get("tools", [])
            )
        except Exception as e:
            logger.warning(f"Failed to parse skills for resume {r['id']}: {e}")
            continue

        # Find internships with at least 1 overlapping skill
        candidate_internships = []
        for i in internships:
            try:
                raw_skills = i["required_skills"]
                if isinstance(raw_skills, str):
                    raw_skills = json.loads(raw_skills)
                internship_skills = set(raw_skills)
            except Exception:
                internship_skills = set()
                
            overlap = len(student_skills & internship_skills)
            if overlap >= 1:
                candidate_internships.append((i["id"], overlap))
                
        # Sort by overlap size and select top 5
        candidate_internships.sort(key=lambda x: x[1], reverse=True)
        selected = candidate_internships[:5]
        if not selected:
            # Fallback to random internships if no overlap
            selected = [(i["id"], 0) for i in random.sample(internships, min(len(internships), 3))]

        # Seed events (click, save, apply) for the selected internships
        for i_id, _ in selected:
            event_types = ["click"]
            if random.random() > 0.4:
                event_types.append("save")
            if random.random() > 0.6:
                event_types.append("apply")
                
            for et in event_types:
                await conn.execute(
                    """
                    INSERT INTO feedback_events (user_id, internship_id, event_type, weight, created_at)
                    VALUES ($1, $2, $3, $4, now())
                    """,
                    user_id, i_id, et, 1.0
                )
                seeded_count += 1

    logger.info(f"Successfully seeded {seeded_count} synthetic feedback events.")


# ─── Main Evaluation Runner ───────────────────────────────────────────────────

async def run_evaluation(k: int = 10, seed_feedback: bool = False) -> Optional[dict]:
    logger.info(f"=== Starting Offline Evaluation Pipeline (k={k}) ===")
    
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        if seed_feedback:
            # Force reset feedback events
            logger.info("Force resetting feedback events...")
            await conn.execute("DELETE FROM feedback_events")
            await seed_synthetic_feedback(conn)
        else:
            await seed_synthetic_feedback(conn)

        # Get all users with positive feedback interactions
        user_rows = await conn.fetch(
            """
            SELECT DISTINCT user_id FROM feedback_events
            WHERE event_type IN ('click', 'save', 'apply', 'outcome_hired')
            """
        )
        if not user_rows:
            logger.error("No users found with positive feedback events for evaluation.")
            return None

        logger.info(f"Evaluating recommendation engine for {len(user_rows)} users...")
        
        total_precision = 0.0
        total_recall = 0.0
        total_mrr = 0.0
        total_ndcg = 0.0
        total_latency = 0.0
        total_ats_error = 0.0
        evaluated_users_count = 0
        evaluated_ats_count = 0

        for row in user_rows:
            user_id = row["user_id"]
            
            # 1. Fetch user's ground truth positive internships
            feedback_rows = await conn.fetch(
                """
                SELECT DISTINCT internship_id FROM feedback_events
                WHERE user_id = $1 AND event_type IN ('click', 'save', 'apply', 'outcome_hired')
                """,
                user_id
            )
            relevant_ids = {str(r["internship_id"]) for r in feedback_rows}
            if not relevant_ids:
                continue

            # 2. Fetch student profile and latest resume
            profile = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            if not profile:
                continue
                
            resume = await conn.fetchrow(
                "SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                user_id
            )
            if not resume:
                # Can't recommend without resume details
                continue

            # 3. Fetch latest assessment score
            assessment_score = await conn.fetchval(
                "SELECT percentage FROM assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
                user_id
            ) or 0.0

            # 4. Normalize skills
            import json
            try:
                skills_data = resume["extracted_skills"]
                if isinstance(skills_data, str):
                    skills_data = json.loads(skills_data)
                
                student_skills = (
                    skills_data.get("technical", []) +
                    skills_data.get("programming", []) +
                    skills_data.get("tools", [])
                )
            except Exception:
                student_skills = []

            # 5. Run recommendation ranking with latency measurement
            t0 = time.perf_counter()
            ranked_results = await rank_internships(
                conn=conn,
                user_id=str(user_id),
                student_skills=student_skills,
                ats_score=float(resume["ats_score"] or 0.0),
                assessment_score=float(assessment_score),
                student_location=profile.get("location") or "",
                top_k=k,
                explain=False
            )
            t1 = time.perf_counter()
            latency_ms = (t1 - t0) * 1000.0
            
            recommended_ids = [str(r.internship_id) for r in ranked_results]
            
            # Compute Precision, Recall, MRR, NDCG
            overlap = set(recommended_ids) & relevant_ids
            precision = len(overlap) / k if k > 0 else 0.0
            recall = len(overlap) / len(relevant_ids) if relevant_ids else 0.0
            
            # MRR
            mrr = 0.0
            for idx, r_id in enumerate(recommended_ids):
                if r_id in relevant_ids:
                    mrr = 1.0 / (idx + 1)
                    break
                    
            # NDCG
            dcg = sum(1.0 / math.log2(idx + 2) for idx, r_id in enumerate(recommended_ids) if r_id in relevant_ids)
            idcg = sum(1.0 / math.log2(idx + 2) for idx in range(min(len(relevant_ids), k)))
            ndcg = dcg / idcg if idcg > 0 else 0.0

            # Accumulate metrics
            total_precision += precision
            total_recall += recall
            total_mrr += mrr
            total_ndcg += ndcg
            total_latency += latency_ms
            evaluated_users_count += 1

            # 6. Evaluate ATS MAE (parse resume locally using gemma4:e4b)
            raw_text = resume.get("raw_text") or ""
            if raw_text:
                try:
                    logger.info(f"Parsing resume for user={profile['name']} locally via Ollama...")
                    parsed_res = await parse_resume(raw_text, str(user_id))
                    
                    local_ats = calculate_ats_score(
                        technical=parsed_res.parsed.skills,
                        programming=parsed_res.parsed.skills, # parser mapping
                        tools=parsed_res.parsed.other_skills,
                        certifications=[c.name for c in parsed_res.parsed.certifications],
                        projects=[p.name for p in parsed_res.parsed.projects],
                        education=[e.degree for e in parsed_res.parsed.education],
                        raw_text=raw_text
                    )
                    
                    error = abs(local_ats - resume["ats_score"])
                    total_ats_error += error
                    evaluated_ats_count += 1
                    logger.info(f"Stored ATS Score: {resume['ats_score']} | Gemma-parsed ATS Score: {local_ats:.1f} | Abs Error: {error:.1f}")
                except Exception as parse_err:
                    logger.warning(f"Failed to calculate offline ATS MAE for user {user_id}: {parse_err}")

        if evaluated_users_count == 0:
            logger.error("No users successfully evaluated.")
            return None

        # Compute averages
        avg_precision = total_precision / evaluated_users_count
        avg_recall = total_recall / evaluated_users_count
        avg_mrr = total_mrr / evaluated_users_count
        avg_ndcg = total_ndcg / evaluated_users_count
        avg_latency = total_latency / evaluated_users_count
        avg_ats_mae = total_ats_error / evaluated_ats_count if evaluated_ats_count > 0 else 0.0

        logger.info("=== Evaluation Completed ===")
        logger.info(f"Evaluated Users:   {evaluated_users_count}")
        logger.info(f"Precision@{k}:      {avg_precision:.4f}")
        logger.info(f"Recall@{k}:         {avg_recall:.4f}")
        logger.info(f"MRR:                {avg_mrr:.4f}")
        logger.info(f"NDCG:               {avg_ndcg:.4f}")
        logger.info(f"ATS MAE:            {avg_ats_mae:.2f}")
        logger.info(f"Avg Latency (ms):   {avg_latency:.1f} ms")

        # Save to database
        run_record = await conn.fetchrow(
            """
            INSERT INTO evaluation_runs (
                k, precision_at_k, recall_at_k, mrr, ndcg, ats_mae, avg_latency_ms, model_used, metadata
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9
            ) RETURNING *
            """,
            k, avg_precision, avg_recall, avg_mrr, avg_ndcg, avg_ats_mae, avg_latency, settings.LLM_MODEL,
            json.dumps({
                "evaluated_users": evaluated_users_count,
                "evaluated_ats_resumes": evaluated_ats_count,
                "timestamp_ms": int(time.time() * 1000)
            })
        )
        logger.info(f"Saved evaluation run to database: run_id={run_record['id']}")
        return dict(run_record)

    finally:
        await conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Offline recommendation engine metrics evaluation")
    parser.add_argument("--k", type=int, default=10, help="Recall/Precision@K limit")
    parser.add_argument("--seed-feedback", action="store_true", help="Force reset and seed synthetic feedback events")
    args = parser.parse_args()

    # Run inside event loop
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(run_evaluation(k=args.k, seed_feedback=args.seed_feedback))
    except Exception as exc:
        logger.exception("Evaluation pipeline failed:")
        sys.exit(1)
