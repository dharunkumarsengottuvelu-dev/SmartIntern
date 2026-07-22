import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/feedback
 * Records a user interaction event (click, save, apply) for a specific internship.
 * Forwarded to the local ai-service which stores it in the feedback_events table.
 * This data is used to reweight recommendation scores over time.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "Session required", undefined, 401);
    }

    const userId = session.user.id as string;
    const body = await request.json();
    const { internship_id, event_type } = body;

    if (!internship_id || !event_type) {
      return apiError("Bad Request", "internship_id and event_type are required", undefined, 400);
    }

    const resp = await fetch(`${AI_SERVICE_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, internship_id, event_type }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return apiError("Feedback Failed", `ai-service feedback failed: ${err}`, undefined, resp.status);
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Feedback] Error:", error);
    return apiError("Feedback Failed", "Failed to record feedback", error, 500);
  }
}
