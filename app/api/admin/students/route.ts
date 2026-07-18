import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllStudents, deleteUserById, updateUser, createUser, findUserByEmail, hashPassword } from "@/lib/db/users";
import { getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const { students, total } = await getAllStudents({ search, page, limit });

    // Enrich with resume/assessment data — student.id is a UUID string from Supabase
    const enriched = await Promise.all(
      students.map(async (student) => {
        const [resume, assessment] = await Promise.all([
          getResumeByUser(student.id),
          getLatestAssessmentByUser(student.id),
        ]);
        return {
          ...student,
          atsScore: resume?.ats_score ?? null,
          assessmentScore: assessment?.percentage ?? null,
          hasResume: !!resume,
          hasAssessment: !!assessment,
          resume,
          assessment,
        };
      })
    );

    return NextResponse.json({ students: enriched, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");
    if (!userId) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    // CASCADE delete handles resumes/assessments via FK constraints in Supabase
    await deleteUserById(userId);
    return NextResponse.json({ success: true, message: "Student deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { id, name, phone, college, degree, department, year } = body;
    if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });

    const updates: any = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (college !== undefined) updates.college = college;
    if (degree !== undefined) updates.degree = degree;
    if (department !== undefined) updates.department = department;
    if (year !== undefined) updates.year = parseInt(year) || null;

    const updatedUser = await updateUser(id, updates);
    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update student" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { name, email, password } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({
      name,
      email,
      password: hashedPassword,
      role: "student"
    });

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create student" }, { status: 500 });
  }
}
