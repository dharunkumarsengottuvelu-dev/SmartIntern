import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUserById, updateUser } from "@/lib/db/users";
import { getResumeByUser } from "@/lib/db/resumes";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Unauthorized", reason: "No session found", stack: "" }, { status: 401 });
    }
    const user = await findUserById(session.user.id as string);
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found", reason: "findUserById returned null", stack: "" }, { status: 404 });
    }

    const resume = await getResumeByUser(session.user.id as string);
    let skills: string[] = [];
    if (resume?.extracted_skills) {
      skills = [
        ...(resume.extracted_skills.technical || []),
        ...(resume.extracted_skills.programming || []),
        ...(resume.extracted_skills.tools || [])
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
    return NextResponse.json(
      { success: false, message: "Failed to fetch profile", reason: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, college, degree, department, year } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 characters)" }, { status: 400 });
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
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
