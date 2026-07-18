import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, updateUserPassword, hashPassword } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
