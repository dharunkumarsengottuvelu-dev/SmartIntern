import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { apiError } from "@/lib/api-response";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return apiError("Unauthorized", "Admin access required", undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search") || "";

  const sb = getSupabase();

  try {
    let query = sb
      .from("assessments")
      .select("*, users!inner(name, email)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`, { foreignTable: "users" });
    }

    const { data, count, error } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json({
      assessments: data,
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("Error fetching assessments:", err);
    return apiError("Fetch Failed", "Failed to fetch assessments", err, 500);
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return apiError("Unauthorized", "Admin access required", undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return apiError("Bad Request", "Missing ID", undefined, 400);

  const sb = getSupabase();
  const { error } = await sb.from("assessments").delete().eq("id", id);
  if (error) return apiError("Delete Failed", "Failed to delete assessment", error, 500);

  return NextResponse.json({ success: true });
}
