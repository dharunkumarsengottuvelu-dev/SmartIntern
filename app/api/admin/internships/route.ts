import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAllInternships,
  createInternship,
  updateInternship,
  deleteInternship,
} from "@/lib/db/internships";
import { apiError } from "@/lib/api-response";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Forbidden", "Admin access required", undefined, 403);

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const { internships, total } = await getAllInternships({ page, limit, search });
    return NextResponse.json({ internships, total, page, limit });
  } catch (error) {
    return apiError("Fetch Failed", "Failed to fetch internships", error, 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Forbidden", "Admin access required", undefined, 403);

  try {
    const body = await request.json();
    const { title, company, description, requiredSkills, location, duration, stipend, applyLink, category } = body;

    if (!title || !company || !description || !location || !applyLink) {
      return apiError("Bad Request", "Missing required fields", undefined, 400);
    }

    const skillsArray = Array.isArray(requiredSkills)
      ? requiredSkills
      : (requiredSkills || "").split(",").map((s: string) => s.trim()).filter(Boolean);

    const internship = await createInternship({
      title, company, description,
      required_skills: skillsArray,
      location,
      duration: duration || "3 months",
      stipend: stipend || "Unpaid",
      apply_link: applyLink,
      category: category || "General",
    });

    return NextResponse.json({ internship }, { status: 201 });
  } catch (error: any) {
    return apiError("Create Failed", "Failed to create internship", error, 500);
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Forbidden", "Admin access required", undefined, 403);

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return apiError("Bad Request", "ID required", undefined, 400);

    if (updates.requiredSkills && typeof updates.requiredSkills === "string") {
      updates.required_skills = updates.requiredSkills.split(",").map((s: string) => s.trim()).filter(Boolean);
      delete updates.requiredSkills;
    }
    if (updates.applyLink) { updates.apply_link = updates.applyLink; delete updates.applyLink; }
    if (updates.isActive !== undefined) { updates.is_active = updates.isActive; delete updates.isActive; }

    const internship = await updateInternship(id, updates);
    return NextResponse.json({ internship });
  } catch (error: any) {
    return apiError("Update Failed", "Failed to update internship", error, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return apiError("Forbidden", "Admin access required", undefined, 403);

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return apiError("Bad Request", "ID required", undefined, 400);
    await deleteInternship(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError("Delete Failed", "Failed to delete internship", error, 500);
  }
}
