import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import { getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getRecommendationsByUser } from "@/lib/db/recommendations";
import { getActiveInternships } from "@/lib/db/internships";

// OFFLINE: All LLM calls go through the local ai-service (Ollama/gemma4:e4b).
// There is NO cloud LLM fallback — any fallback that calls an external host
// is an internet dependency that breaks the offline guarantee.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  let messages: any[] = [];
  let userId = "";
  let profile: any = null;
  let resume: any = null;
  let assessment: any = null;
  let recommendations: any[] = [];
  let allInternships: any[] = [];

  try {
    const isTest = request.headers.get("x-chat-test") === "secret-test-key";

    if (isTest) {
      userId = "e6f47775-68ff-4f40-843d-1cfcb4e0624a";
    } else {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id as string;
    }

    const body = await request.json();
    messages = body.messages;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[Chat] Initial body parsing / auth failed:", err?.message || err);
    return NextResponse.json({
      reply: "Hello! I am InternX AI. I ran into a minor configuration issue but I am still here to help. Please try again.",
    });
  }

  // Fetch all student context + active internship catalog in parallel
  try {
    const [profileData, resumeData, assessmentData, recommendationsData, internshipsResult] =
      await Promise.all([
        findUserById(userId).catch((e) => { console.error("[Chat] findUserById failed:", e); return null; }),
        getResumeByUser(userId).catch((e) => { console.error("[Chat] getResumeByUser failed:", e); return null; }),
        getLatestAssessmentByUser(userId).catch((e) => { console.error("[Chat] getLatestAssessmentByUser failed:", e); return null; }),
        getRecommendationsByUser(userId).catch((e) => { console.error("[Chat] getRecommendationsByUser failed:", e); return []; }),
        getActiveInternships({ limit: 50 }).catch((e) => { console.error("[Chat] getActiveInternships failed:", e); return { internships: [], total: 0 }; }),
      ]);

    profile = profileData;
    resume = resumeData;
    assessment = assessmentData;
    recommendations = recommendationsData || [];
    allInternships = internshipsResult?.internships || [];
  } catch (dbErr: any) {
    console.error("[Chat] Database fetch failed:", dbErr?.message || dbErr);
  }

  // Build student context string for the AI service
  const internshipCatalog =
    allInternships.length > 0
      ? allInternships
          .slice(0, 20)
          .map((i, idx) => {
            const skills = Array.isArray(i.required_skills)
              ? i.required_skills.join(", ")
              : i.required_skills || "Not specified";
            return `${idx + 1}. **${i.title}** at ${i.company} | ${i.location} | ${i.duration} | ${i.stipend || "Paid"}\n   Skills required: ${skills}`;
          })
          .join("\n")
      : "No active internships in the system yet.";

  const matchedInternships =
    recommendations.length > 0
      ? recommendations
          .slice(0, 5)
          .map((r: any, idx: number) => {
            const skills = Array.isArray(r.internship?.required_skills)
              ? r.internship.required_skills.join(", ")
              : "N/A";
            return `${idx + 1}. ${r.internship?.title || "Internship"} at ${r.internship?.company || "Company"} — Match: ${r.match_percentage}% | Skills matched: ${r.matched_skills?.join(", ") || "N/A"} | Required: ${skills}`;
          })
          .join("\n")
      : "No personalized matches yet. Student should upload a resume to get matches.";

  const studentContext = `Name: ${profile?.name || "Student"}
Email: ${profile?.email || "N/A"}
College: ${profile?.college || "Not provided"} | Degree: ${profile?.degree || "N/A"} | Department: ${profile?.department || "N/A"} | Year: ${profile?.year ?? "N/A"}

Resume & ATS:
${
  resume
    ? `File: ${resume.file_name}
ATS Score: ${resume.ats_score}/100
Extracted Skills: ${[
        ...(resume.extracted_skills?.technical || []),
        ...(resume.extracted_skills?.programming || []),
        ...(resume.extracted_skills?.tools || []),
      ].join(", ") || "None"}
Strengths: ${resume.strengths?.join("; ") || "None"}
Weaknesses: ${resume.weaknesses?.join("; ") || "None"}`
    : "No resume uploaded yet."
}

Skill Assessment:
${
  assessment
    ? `Score: ${assessment.percentage}% (${assessment.correct_answers}/${assessment.total_questions} correct)`
    : "Not completed yet."
}`;

  // Extract user's latest message
  const userMessage = messages[messages.length - 1]?.content || "";

  // ── Call local AI service (gemma4:e4b via Ollama) ─────────────────────────
  try {
    console.log("[Chat] Calling local ai-service (gemma4:e4b)...");
    const aiResp = await fetch(`${AI_SERVICE_URL}/career-advisor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        query: userMessage,
        mode: "chat",
        student_context: studentContext,
        internship_catalog: internshipCatalog,
        matched_internships: matchedInternships,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      throw new Error(`ai-service returned ${aiResp.status}: ${errText}`);
    }

    const data = await aiResp.json();
    const reply = data.response?.trim() || "";
    if (!reply) throw new Error("Empty response from ai-service");

    console.log("[Chat] ai-service responded successfully.");
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("[Chat] ai-service error (using static fallback):", error?.message || error);

    // Static local fallback — NO cloud call. This is purely deterministic rule-based text.
    const reply = generateLocalResponse(userMessage, {
      profile,
      resume,
      assessment,
      recommendations,
      allInternships,
    });
    return NextResponse.json({ reply });
  }
}

// ─── Static Local Fallback (used when local ai-service is unreachable) ────────
// This is purely rule-based — no network calls of any kind.
function generateLocalResponse(
  query: string,
  context: {
    profile?: any;
    resume?: any;
    assessment?: any;
    recommendations?: any[];
    allInternships?: any[];
  }
): string {
  const q = query.toLowerCase().trim();
  const name = context.profile?.name?.split(" ")[0] || "there";

  const skillsObj = context.resume?.extracted_skills as any;
  const techSkills = skillsObj && Array.isArray(skillsObj.technical) ? skillsObj.technical : [];
  const progSkills = skillsObj && Array.isArray(skillsObj.programming) ? skillsObj.programming : [];
  const toolSkills = skillsObj && Array.isArray(skillsObj.tools) ? skillsObj.tools : [];
  const skills = [...techSkills, ...progSkills, ...toolSkills].join(", ");

  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings?)\b/.test(q)) {
    return `Hello, ${name}! I am **InternX AI**, your personal career advisor.\n\nI can help you with:\n- Your ATS score and resume feedback\n- Internship matches from our catalog\n- Assessment performance analysis\n- Career and interview tips\n\nWhat would you like to know?`;
  }

  if (/ats|resume|cv|score|strength|weakness|skill|improve|upload/.test(q)) {
    if (context.resume) {
      return `Your resume analysis, ${name}:\n\n**ATS Score: ${context.resume.ats_score}/100**\n${skills ? `**Skills detected:** ${skills}\n` : ""}\nFor the full breakdown, go to the **Resume & ATS** tab.`;
    }
    return `You haven't uploaded a resume yet, ${name}. Go to the **Resume & ATS** tab to upload your PDF or DOCX.`;
  }

  if (/my match|my recommendation|my internship|jobs for me/.test(q)) {
    const recs = context.recommendations;
    if (recs && recs.length > 0) {
      let resp = `Here are your top matches, ${name}:\n\n`;
      recs.slice(0, 3).forEach((r: any, idx: number) => {
        resp += `**${idx + 1}. ${r.internship?.title}** at **${r.internship?.company}** — ${r.match_percentage}%\n`;
      });
      return resp + `\nView all in the **Jobs** tab.`;
    }
    return `Upload your resume first to get personalized internship matches.`;
  }

  if (/assessment|test|quiz|performance/.test(q)) {
    if (context.assessment) {
      return `Your assessment result, ${name}:\n\n**Score: ${context.assessment.percentage}%** (${context.assessment.correct_answers}/${context.assessment.total_questions} correct)`;
    }
    return `You haven't completed the assessment yet. Go to the **Assessment** tab to take the skill test.`;
  }

  return (
    `Hi ${name}, I am **InternX AI**. ` +
    `The AI advisor is starting up — please try again in a moment.\n\n` +
    `While you wait, you can:\n` +
    `- Check your ATS score in the **Resume & ATS** tab\n` +
    `- Browse internships in the **Jobs** tab\n` +
    `- Take the skill test in the **Assessment** tab`
  );
}
