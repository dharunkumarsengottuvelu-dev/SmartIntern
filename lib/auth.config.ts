import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // empty by default, overridden in lib/auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.college = (user as any).college;
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).college = token.college;
        (session.user as any).department = token.department;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "eMZw1jgKeV0dYd1QonADkKo1ANuuD44b1MjkyF+F8cw=",
  trustHost: true,
} satisfies NextAuthConfig;
