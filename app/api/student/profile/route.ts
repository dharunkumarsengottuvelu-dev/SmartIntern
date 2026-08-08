import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureUserExists, updateUser } from "@/lib/db/users";
import { getResumeByUser } from "@/lib/db/resumes";
import { apiError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", "No active session found", "Please log in to view your profile.", 401);
    }

    const userId = session.user.id as string;

    const user = await ensureUserExists(userId, session.user.email || undefined, session.user.name || undefined);

    const resume = await getResumeByUser(session.user.id as string);
    let skills: string[] = [];
    if (resume?.extracted_skills) {
      const ex = resume.extracted_skills as any;
      skills = Array.isArray(ex.allSkills) ? ex.allSkills : [
        ...(ex.technical || []),
        ...(ex.programming || []),
        ...(ex.tools || [])
      ];
    }

    // Returning exact requested format (root level) + nested user (for backward compatibility)
    return NextResponse.json({
      id: user.id,
      name: user.name || "",
      email: user.email,
      resume_url: resume?.file_url || "",
      skills: skills,
      // Preserved for existing frontend functionality
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        college: user.college,
        degree: user.degree,
        department: user.department,
        year: user.year,
      },
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return apiError("Profile fetch failed", "An unexpected error occurred while fetching the profile", error, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return apiError("Unauthorized", "No active session found", "Please log in to update your profile.", 401);
    }

    const body = await request.json();
    const { name, phone, college, degree, department, year } = body;

    if (!name || name.trim().length < 2) {
      return apiError("Validation Error", "Invalid name provided", "Name is required and must be at least 2 characters long.", 400);
    }

    const updated = await updateUser(session.user.id as string, {
      name: name.trim(),
      phone: phone?.trim() || undefined,
      college: college?.trim() || undefined,
      degree: degree?.trim() || undefined,
      department: department?.trim() || undefined,
      year: year ? parseInt(year) : undefined,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        college: updated.college,
        degree: updated.degree,
        department: updated.department,
        year: updated.year,
      },
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return apiError("Profile update failed", "An unexpected error occurred while updating the profile", error, 500);
  }
}
