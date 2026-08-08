import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssessmentById, updateAssessment } from "@/lib/db/assessments";
import { getResumeById } from "@/lib/db/resumes";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";
import { apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "No active session found", "Please log in to submit your assessment.", 401);
    }

    const userId = session.user.id as string;
    const { assessmentId, answers } = await request.json();
    if (!assessmentId || !Array.isArray(answers)) {
      return apiError("Invalid Request", "Invalid submission data", "Missing assessmentId or answers array.", 400);
    }

    const assessment = await getAssessmentById(assessmentId, userId);
    if (!assessment) {
      return apiError("Not Found", "Assessment not found", "Could not locate the requested assessment.", 404);
    }

    if (assessment.status === "completed") {
      return apiError("Already Submitted", "Assessment already submitted", "You cannot submit an assessment more than once.", 400);
    }

    // Score the answers (iterate over DB questions to prevent duplicate answer exploits)
    let correctAnswers = 0;
    const scoredAnswers = (assessment.questions as any[]).map((question: any, index: number) => {
      const userAnswer = answers.find((a: any) => a.questionIndex === index);
      const selectedOption = userAnswer ? userAnswer.selectedOption : null;
      
      const isCorrect = question && 
                        typeof selectedOption === "string" && 
                        typeof question.answer === "string" && 
                        selectedOption.trim() === question.answer.trim();
      
      if (isCorrect) correctAnswers++;
      return { questionIndex: index, selectedOption };
    });

    const totalQuestions = assessment.total_questions || assessment.questions.length || 20;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // Update assessment in Supabase
    const updated = await updateAssessment(assessmentId, {
      user_answers: scoredAnswers,
      score: correctAnswers,
      correct_answers: correctAnswers,
      percentage,
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    // Trigger recommendation generation asynchronously in background (non-blocking)
    (async () => {
      try {
        const resume = await getResumeById(assessment.resume_id, userId);
        if (resume) {
          const skills = (resume.extracted_skills || {}) as any;
          const allStudentSkills = [
            ...(skills.technical || []),
            ...(skills.programming || []),
            ...(skills.tools || []),
          ].filter(Boolean);

          const { internships } = await getActiveInternships({ limit: 200 });
          const rankings = rankInternships(
            internships.map((i) => {
              let reqSkills = i.required_skills;
              if (typeof reqSkills === "string") {
                try {
                  reqSkills = JSON.parse(reqSkills);
                } catch {
                  reqSkills = (reqSkills as unknown as string).split(",").map(s => s.trim());
                }
              }
              if (!Array.isArray(reqSkills)) reqSkills = [];
              return { _id: i.id, requiredSkills: reqSkills };
            }),
            allStudentSkills,
            resume.ats_score || 0,
            percentage
          );

          // Update top recommendations in parallel
          await Promise.all(
            rankings.slice(0, 50).map((rec) =>
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
        }
      } catch (recError) {
        console.error("Background recommendation generation error:", recError);
      }
    })();

    // Build a map of questionIndex -> correct answer for the review screen
    const correctAnswerMap: Record<number, string> = {};
    (assessment.questions as any[]).forEach((q: any, idx: number) => {
      correctAnswerMap[idx] = q.answer;
    });

    return NextResponse.json({
      success: true,
      result: {
        assessmentId,
        score: correctAnswers,
        correctAnswers,
        totalQuestions,
        percentage,
        completedAt: updated.completed_at,
      },
      correctAnswerMap,
    });
  } catch (error: any) {
    console.error("MCQ submit error:", error);
    return apiError("Submission Failed", "Failed to submit assessment", error, 500);
  }
}
