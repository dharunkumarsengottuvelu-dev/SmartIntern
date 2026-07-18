import { NextRequest, NextResponse } from "next/server";
import { getActiveInternships } from "@/lib/db/internships";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const { internships, total } = await getActiveInternships({ page, limit });

    return NextResponse.json({ internships, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch internships" }, { status: 500 });
  }
}
