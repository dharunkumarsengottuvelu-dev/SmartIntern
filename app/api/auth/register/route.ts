import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, hashPassword, updateUser, updateUserPassword } from "@/lib/db/users";
import { apiError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, phone, college, degree, department, year } = body;

    if (!name || !email || !password) {
      return apiError("Bad Request", "Name, email, and password are required", undefined, 400);
    }

    if (password.length < 6) {
      return apiError("Bad Request", "Password must be at least 6 characters", undefined, 400);
    }

    // Check for existing user — update user password & info if existing to avoid demo block
    const existing = await findUserByEmail(email);
    if (existing) {
      const hashedPassword = await hashPassword(password);
      const updated = await updateUser(existing.id, {
        name,
        phone,
        college,
        degree,
        department,
        year: year ? parseInt(year) : undefined,
      });
      await updateUserPassword(email, hashedPassword);

      return NextResponse.json(
        {
          message: "Account already exists — updated your password and profile successfully. You can now sign in!",
          user: {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
          },
        },
        { status: 200 }
      );
    }

    // Hash password using native crypto
    const hashedPassword = await hashPassword(password);

    // Create user in Supabase
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role: "student",
      phone,
      college,
      degree,
      department,
      year: year ? parseInt(year) : undefined,
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    if (error?.code === "23505") {
      // PostgreSQL unique violation
      return apiError("Conflict", "Email already exists", undefined, 409);
    }
    return apiError("Registration Failed", "Server error occurred during registration", error, 500);
  }
}
