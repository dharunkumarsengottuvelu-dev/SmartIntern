import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assessment = await getLatestAssessmentByUser(session.user.id as string);
    if (!assessment) return NextResponse.json({ assessment: null });

    return NextResponse.json({ 
      assessment: {
        id: assessment.id,
        percentage: assessment.percentage,
        totalQuestions: assessment.total_questions,
        correctAnswers: assessment.correct_answers,
        completedAt: assessment.completed_at,
        score: assessment.score,
        // Include review data
        questions: (assessment.questions as any[]).map((q: any, idx: number) => ({
          index: idx,
          question: q.question,
          options: q.options,
          difficulty: q.difficulty || "medium",
          topic: q.topic || "",
        })),
        userAnswers: (assessment.user_answers as any[]).map((a: any) => ({
          questionIndex: a.questionIndex,
          selectedOption: a.selectedOption,
        })),
        correctAnswerMap: Object.fromEntries(
          (assessment.questions as any[]).map((q: any, idx: number) => [idx, q.answer])
        ),
      }
    });

  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
