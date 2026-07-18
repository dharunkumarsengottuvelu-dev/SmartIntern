import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { countStudents } from "@/lib/db/users";
import { countResumes, getAvgATSScore } from "@/lib/db/resumes";
import { countCompletedAssessments, getAvgAssessmentScore } from "@/lib/db/assessments";
import { countRecommendations } from "@/lib/db/recommendations";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if ((session.user as any).role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      totalResumes,
      totalAssessments,
      totalRecommendations,
      recentStudents,
      avgATSScore,
      avgAssessmentScore,
    ] = await Promise.all([
      countStudents(),
      countResumes(),
      countCompletedAssessments(),
      countRecommendations(),
      countStudents({ since: sevenDaysAgo }),
      getAvgATSScore(),
      getAvgAssessmentScore(),
    ]);

    return NextResponse.json({
      totalStudents,
      totalResumes,
      totalAssessments,
      totalRecommendations,
      recentStudents,
      avgATSScore,
      avgAssessmentScore,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
