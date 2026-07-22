import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, updateUserPassword, hashPassword } from "@/lib/db/users";
import { apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return apiError("Bad Request", "Email and new password are required", undefined, 400);
    }

    if (newPassword.length < 6) {
      return apiError("Bad Request", "Password must be at least 6 characters", undefined, 400);
    }

    // Verify user exists
    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      // Return 200 even if not found to prevent email enumeration
      return NextResponse.json({ success: true, message: "Password reset successful" });
    }

    const hashedPassword = await hashPassword(newPassword);
    await updateUserPassword(email, hashedPassword);

    return NextResponse.json({ success: true, message: "Password reset successful" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return apiError("Reset Failed", "Failed to reset password", error, 500);
  }
}
