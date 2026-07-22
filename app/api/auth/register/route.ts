import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createUser, hashPassword } from "@/lib/db/users";
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

    // Check for existing user
    const existing = await findUserByEmail(email);
    if (existing) {
      return apiError("Conflict", "An account with this email already exists", undefined, 409);
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
