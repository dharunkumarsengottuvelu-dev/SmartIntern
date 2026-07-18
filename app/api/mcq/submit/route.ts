import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssessmentById, updateAssessment } from "@/lib/db/assessments";
import { getResumeById } from "@/lib/db/resumes";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const { assessmentId, answers } = await request.json();
    if (!assessmentId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }

    const assessment = await getAssessmentById(assessmentId, userId);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    if (assessment.status === "completed") {
      return NextResponse.json({ error: "Assessment already submitted" }, { status: 400 });
    }

    // Score the answers
    let correctAnswers = 0;
    const scoredAnswers = answers.map((userAnswer: { questionIndex: number; selectedOption: string }) => {
      const question = assessment.questions[userAnswer.questionIndex];
      const isCorrect = question && 
                        typeof userAnswer.selectedOption === "string" && 
                        typeof question.answer === "string" && 
                        userAnswer.selectedOption.trim() === question.answer.trim();
      
      if (isCorrect) correctAnswers++;
      return { questionIndex: userAnswer.questionIndex, selectedOption: userAnswer.selectedOption };
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

    // Trigger recommendation generation (non-fatal)
    try {
      const resume = await getResumeById(assessment.resume_id, userId);
      if (resume) {
        const skills = resume.extracted_skills as any;
        const allStudentSkills = [
          ...(skills.technical || []),
          ...(skills.programming || []),
          ...(skills.tools || []),
        ].filter(Boolean);

        const { internships } = await getActiveInternships({ limit: 1000 });
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

        for (const rec of rankings) {
          await upsertRecommendation({
            user_id: userId,
            internship_id: rec.internshipId,
            match_percentage: rec.matchPercentage,
            skill_score: rec.skillScore,
            assessment_score: rec.assessmentScore,
            matched_skills: rec.matchedSkills,
          });
        }
      }
    } catch (recError) {
      console.error("Recommendation generation error (non-fatal):", recError);
    }

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
    return NextResponse.json({ error: error.message || "Failed to submit assessment" }, { status: 500 });
  }
}
