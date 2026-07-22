import { NextResponse } from "next/server";

export function apiError(errorTitle: string, message: string, err?: any, status = 500) {
  const isDev = process.env.NODE_ENV !== "production";
  return NextResponse.json({
    success: false,
    error: errorTitle,
    message: message,
    details: isDev ? (err instanceof Error ? err.message : (err ? String(err) : undefined)) : undefined
  }, { status });
}
