import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { QUESTION_BANK } from "@/app/api/mcq/generate/route";
import { apiError } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return apiError("Unauthorized", "Admin access required", undefined, 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";

    // Convert QUESTION_BANK into an array of skills with their questions
    const skillsList = Object.keys(QUESTION_BANK).map((skillName) => {
      const questions = QUESTION_BANK[skillName];
      return {
        id: skillName,
        name: skillName,
        count: questions.length,
        questions: questions,
      };
    });

    let filteredSkills = skillsList;
    if (search) {
      filteredSkills = skillsList.filter((skill) =>
        skill.name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      skills: filteredSkills,
      totalSkills: skillsList.length,
      totalQuestions: skillsList.reduce((acc, skill) => acc + skill.count, 0),
    });
  } catch (error: any) {
    console.error("Admin Questions API Error:", error);
    return apiError("Fetch Failed", "Failed to fetch questions", error, 500);
  }
}
