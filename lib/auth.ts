import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "@/lib/db/users";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[NextAuth] authorize callback triggered for email:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("[NextAuth] Missing email or password credentials");
          return null;
        }

        try {
          console.log("[NextAuth] Querying user from database...");
          const user = await findUserByEmail(credentials.email as string, true);
          
          if (!user) {
            console.log("[NextAuth] No user found in database with email:", credentials.email);
            return null;
          }
          
          if (!user.password) {
            console.log("[NextAuth] User has no password set in database:", credentials.email);
            return null;
          }

          console.log("[NextAuth] Verifying password...");
          const isValid = await verifyPassword(credentials.password as string, user.password);
          console.log("[NextAuth] Password verification result:", isValid);
          
          if (!isValid) {
            console.log("[NextAuth] Password verification failed for email:", credentials.email);
            return null;
          }

          let userRole = user.role;
          // For demo/testing: automatically promote any email with 'admin' to admin role
          if (user.email.toLowerCase().includes('admin')) {
            userRole = "admin";
          }

          console.log("[NextAuth] Authentication successful! User role:", userRole);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: userRole,
            college: user.college,
            department: user.department,
          };
        } catch (error) {
          console.error("[NextAuth] Auth error in authorize callback:", error);
          return null;
        }
      },
    }),
  ],
});
