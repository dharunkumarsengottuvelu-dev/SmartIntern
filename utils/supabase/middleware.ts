import { type NextRequest, NextResponse } from "next/server";

// Our auth is entirely NextAuth JWT-based.
// Supabase Auth session refresh is not needed in middleware.
// This function is a no-op pass-through kept for compatibility.
export const updateSession = async (request: NextRequest) => {
  return NextResponse.next({ request: { headers: request.headers } });
};

