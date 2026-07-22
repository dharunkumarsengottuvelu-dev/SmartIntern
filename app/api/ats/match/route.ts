import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResumeByUser } from "@/lib/db/resumes";
import { matchResumeToJob } from "@/lib/openai";
import { apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", "No active session found", "Please log in.", 401);
    }

    const { jobDescription } = await request.json();
    if (!jobDescription || typeof jobDescription !== "string") {
      return apiError("Invalid Request", "Missing or invalid jobDescription", "Please provide a valid job description text.", 400);
    }

    // Fetch the user's parsed resume
    const resume = await getResumeByUser(session.user.id);
    if (!resume || !resume.extracted_skills) {
      return apiError("Not Found", "No resume found", "Please upload a resume first.", 404);
    }

    const matchResult = await matchResumeToJob(resume.extracted_skills as any, jobDescription);

    return NextResponse.json({
      success: true,
      data: matchResult
    });
  } catch (error: any) {
    console.error("[Match API] Error:", error);
    return apiError("Matching Failed", "Failed to analyze ATS match", error, 500);
  }
}
