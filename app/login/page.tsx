"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Briefcase, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

// Inner component uses useSearchParams — must be wrapped in Suspense
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/student/dashboard";
  const isAdminLogin = callbackUrl === "/admin" || callbackUrl.startsWith("/admin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        // Retry fetching session up to 3 times with small delays
        // to ensure the JWT is fully propagated before redirect
        let role: string | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((r) => setTimeout(r, 300));
          const res = await fetch("/api/auth/session", { cache: "no-store" });
          const session = await res.json();
          role = session?.user?.role;
          if (role) break;
        }

        if (isAdminLogin && role !== "admin") {
          // Log them out immediately
          await fetch("/api/auth/signout", { method: "POST" });
          setError("Access Denied: Your account does not have admin privileges.");
          return;
        }

        const destination = role === "admin" ? "/admin" : callbackUrl;
        router.push(destination);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: password }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setResetSuccess(true);
        setIsResetMode(false);
        setPassword("");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-slate-50">
      <div className="w-full max-w-md relative z-10 page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
                <defs>
                  <linearGradient id="logoGradLogin" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1E40AF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <g stroke="url(#logoGradLogin)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 6 10 L 16 20 L 6 30" />
                  <path d="M 10 6 L 20 16 L 30 6" />
                  <path d="M 34 10 L 24 20 L 34 30" />
                  <path d="M 10 34 L 20 24 L 30 34" />
                </g>
              </svg>
            </div>
            <span className="text-2xl font-black text-brand-600 tracking-tight">InternX</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            {isAdminLogin ? "Admin Login" : isResetMode ? "Reset Password" : "Welcome back"}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {isAdminLogin ? "Sign in to access the admin panel" : isResetMode ? "Enter your email and new password" : "Sign in to your account to continue"}
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 bg-white border border-slate-200 shadow-md rounded-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-6 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {resetSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-3 mb-6 text-green-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Password reset successfully. You can now sign in.
            </div>
          )}

          <form onSubmit={isResetMode ? handleResetSubmit : handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {isResetMode ? "New Password" : "Password"}
                </label>
                {!isResetMode && !isAdminLogin && (
                  <button type="button" onClick={() => { setIsResetMode(true); setError(""); setResetSuccess(false); }} className="text-xs text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark !pl-10 pr-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id={isResetMode ? "reset-submit" : "login-submit"}
              type="submit"
              disabled={loading}
              className="btn-brand w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isResetMode ? "Resetting..." : "Signing in..."}
                </>
              ) : (
                isResetMode ? "Reset Password" : "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200 text-center flex flex-col gap-3">
            {isResetMode && (
              <button type="button" onClick={() => { setIsResetMode(false); setError(""); setResetSuccess(false); }} className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">
                &larr; Back to login
              </button>
            )}
            {!isResetMode && (
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                  Create one free
                </Link>
              </p>
            )}
          </div>
        </div>


      </div>
    </div>
  );
}

// Suspense wrapper required by Next.js 15 for useSearchParams
function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
