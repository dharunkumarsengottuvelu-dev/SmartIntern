import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecommendationsByUser, upsertRecommendation } from "@/lib/db/recommendations";
import { getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getActiveInternships } from "@/lib/db/internships";
import { rankInternships } from "@/lib/recommendation";
import { apiError } from "@/lib/api-response";

async function generateAndGetRecommendations(userId: string) {
  // Fetch student data and all active internships in parallel
  const [resume, assessment, { internships }] = await Promise.all([
    getResumeByUser(userId),
    getLatestAssessmentByUser(userId),
    getActiveInternships({ limit: 500 }),
  ]);

  if (!resume) {
    return [];
  }

  const skills = resume.extracted_skills as any;
  const allStudentSkills: string[] = [
    ...(skills?.technical || []),
    ...(skills?.programming || []),
    ...(skills?.tools || []),
  ].filter(Boolean);

  const atsScore = resume.ats_score || 0;
  const assessmentScore = assessment?.percentage || 0;

  // Normalize internship required_skills (can be stored as JSON string or array)
  const normalizedInternships = internships.map((i) => {
    let reqSkills = i.required_skills as any;
    if (!reqSkills) {
      reqSkills = [];
    } else if (typeof reqSkills === "string") {
      try { reqSkills = JSON.parse(reqSkills); } catch {
        reqSkills = reqSkills.split(",").map((s: string) => s.trim());
      }
    }
    if (!Array.isArray(reqSkills)) reqSkills = [];
    return { _id: i.id, requiredSkills: reqSkills };
  });

  // Rank all active internships for this student
  const rankings = rankInternships(normalizedInternships, allStudentSkills, atsScore, assessmentScore);

  // Upsert each recommendation
  await Promise.all(
    rankings.map((rec) =>
      upsertRecommendation({
        user_id: userId,
        internship_id: rec.internshipId,
        match_percentage: rec.matchPercentage,
        skill_score: rec.skillScore,
        assessment_score: rec.assessmentScore,
        matched_skills: rec.matchedSkills,
      })
    )
  );

  return getRecommendationsByUser(userId);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("Unauthorized", "No active session found", "Please log in.", 401);
    const userId = session.user.id as string;

    let recommendations = await getRecommendationsByUser(userId);

    const [resume, assessment] = await Promise.all([
      getResumeByUser(userId),
      getLatestAssessmentByUser(userId),
    ]);

    const latestAssessmentScore = assessment?.percentage || 0;

    // Check if recommendations are stale:
    // 1. If user has a resume but recommendations list is empty
    // 2. If user has recommendations, but the stored assessment score doesn't match the user's latest assessment score
    const needsRegen = resume && (
      recommendations.length === 0 ||
      recommendations.some((r) => r.assessment_score !== latestAssessmentScore)
    );

    if (needsRegen) {
      console.log(`[GET Recommendations] Stale recommendations detected (stored assessment score != latest assessment score: ${latestAssessmentScore}). Regenerating...`);
      recommendations = await generateAndGetRecommendations(userId);
    }

    const mappedRecommendations = recommendations.map((rec) => ({
      internshipId: rec.internship_id,
      matchPercentage: rec.match_percentage,
      skillScore: rec.skill_score,
      assessmentScore: rec.assessment_score,
      matchedSkills: rec.matched_skills,
      internship: rec.internship
        ? {
            title: rec.internship.title,
            company: rec.internship.company,
            description: rec.internship.description,
            location: rec.internship.location,
            duration: rec.internship.duration,
            stipend: rec.internship.stipend,
            applyLink: rec.internship.apply_link,
            requiredSkills: rec.internship.required_skills,
            category: rec.internship.category,
          }
        : null,
    }));
    return NextResponse.json({ recommendations: mappedRecommendations });
  } catch (error: any) {
    console.error("Recommendations GET error:", error);
    return apiError("Recommendations fetch failed", "Failed to fetch recommendations", error, 500);
  }
}

/**
 * POST /api/recommendation
 * On-demand recommendation generation — called after resume upload
 * or when the dashboard detects empty recommendations.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "No active session found", "Please log in.", 401);
    }
    const userId = session.user.id as string;

    const fresh = await generateAndGetRecommendations(userId);
    const mapped = fresh.map((rec) => ({
      internshipId: rec.internship_id,
      matchPercentage: rec.match_percentage,
      skillScore: rec.skill_score,
      assessmentScore: rec.assessment_score,
      matchedSkills: rec.matched_skills,
      internship: rec.internship
        ? {
            title: rec.internship.title,
            company: rec.internship.company,
            description: rec.internship.description,
            location: rec.internship.location,
            duration: rec.internship.duration,
            stipend: rec.internship.stipend,
            applyLink: rec.internship.apply_link,
            requiredSkills: rec.internship.required_skills,
            category: rec.internship.category,
          }
        : null,
    }));

    return NextResponse.json({ recommendations: mapped, generated: fresh.length });
  } catch (error: any) {
    console.error("Recommendation generation error:", error);
    return apiError("Recommendation generation failed", "Failed to generate recommendations", error, 500);
  }
}
