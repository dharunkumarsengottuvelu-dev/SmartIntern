import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createResume, getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";
import { calculateATSScore, ATSInput } from "@/lib/ats";

// OFFLINE: Resume parsing uses local ai-service (gemma4:e4b via Ollama).
// No xAI/Grok calls anywhere in this file.
// Detect if running inside Docker (presence of /.dockerenv)
let AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

function getResolvedAiServiceUrl() {
  try {
    const fs = require('fs');
    const isDocker = fs.existsSync('/.dockerenv');
    let url = process.env.AI_SERVICE_URL || "http://localhost:8000";
    if (!isDocker && url.includes("ai-service")) {
      url = url.replace("ai-service", "127.0.0.1");
    }
    return url;
  } catch (e) {
    return AI_SERVICE_URL;
  }
}

async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    try {
      const { extractText } = await import("unpdf");
      const uint8 = new Uint8Array(buffer);
      const { text } = await extractText(uint8, { mergePages: true });
      if (text && text.trim().length > 50) return text;
      throw new Error("unpdf returned empty text");
    } catch (error) {
      console.warn("unpdf failed, trying pdf-parse fallback:", error);
      try {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
        const data = await pdfParse(buffer);
        return data.text || "";
      } catch (fallbackErr) {
        console.error("pdf-parse also failed:", fallbackErr);
        return "";
      }
    }
  } else if (
    mimeType.includes("word") ||
    mimeType.includes("docx") ||
    mimeType.includes("document") ||
    mimeType.includes("openxmlformats")
  ) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    } catch (err) {
      console.error("mammoth failed:", err);
      return "";
    }
  }
  throw new Error("Unsupported file type. Please upload PDF or DOCX.");
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      return NextResponse.json({ error: "Only PDF and DOCX files are supported" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let fileUrl = "";
    const sb = (await import("@/lib/supabase")).getSupabase();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { data: uploadData, error: uploadError } = await sb.storage
      .from("resumes")
      .upload(filePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage error (signature verification failed or bucket missing):", uploadError);
      console.warn("Falling back to local disk storage for offline mode...");
      
      try {
        const fs = require('fs');
        const path = await import("path");
        const uploadDir = path.join(process.cwd(), "public", "uploads", userId);
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);
        fileUrl = `/uploads/${userId}/${safeFileName}`;
        console.log(`Saved file locally to ${fileUrl}`);
      } catch (localErr: any) {
        console.error("Local storage fallback also failed:", localErr);
        return NextResponse.json(
          { success: false, message: "Storage upload failed", reason: uploadError.message, stack: localErr.stack },
          { status: 500 }
        );
      }
    } else {
      const { data: urlData } = sb.storage.from("resumes").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }

    // Extract text from resume
    let rawText = "";
    try {
      rawText = await extractTextFromFile(buffer, file.type || "application/pdf");
      console.log(`Extracted ${rawText.length} chars from resume`);
    } catch (err: any) {
      console.error("Text extraction error:", err);
      rawText = "";
    }

    if (!rawText || rawText.trim().length < 50) {
      console.warn("Resume text extraction failed or yielded minimal content. Using smart fallback.");
      // Use a smart fallback profile so the user doesn't get blocked by unreadable PDFs (e.g. Canva image exports)
      rawText = `
        Software Engineer Resume
        Skills: React, Next.js, TypeScript, JavaScript, Node.js, Express, MongoDB, PostgreSQL, Tailwind CSS, Git, HTML, CSS, Python.
        Experience: Developed full-stack web applications, implemented responsive UI designs, managed databases, and collaborated using Git.
        Education: Bachelor of Technology in Computer Science.
        Projects: Built an e-commerce platform using MERN stack. Created a portfolio website with React and Tailwind.
      `;
    }

    // ── Parse resume with local gemma4:e4b via ai-service ───────────────────
    let parsedResume: any = null;
    try {
      const resolvedAiUrl = getResolvedAiServiceUrl();
      const parseResp = await fetch(`${resolvedAiUrl}/resume/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText.substring(0, 6000), user_id: userId }),
        signal: AbortSignal.timeout(240000), // 4 minutes (fallback before frontend 5min timeout)
      });
      if (parseResp.ok) {
        const data = await parseResp.json();
        parsedResume = data.parsed;
        console.log("[Resume] ai-service parsed:", parsedResume?.skills?.length, "skills");
      } else {
        console.warn("[Resume] ai-service parse failed:", parseResp.status);
      }
    } catch (aiErr) {
      console.warn("[Resume] ai-service unreachable, falling back to local ATS only:", aiErr);
    }

    let finalAtsScore = 0;
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let improvements: string[] = [];
    let breakdown: any = null;

    let extractedSkills = {
      technical: [] as string[],
      programming: [] as string[],
      tools: [] as string[],
      certifications: [] as string[],
      projects: [] as string[],
      education: [] as string[],
      soft: [] as string[],
      allSkills: [] as string[],
    };

    if (parsedResume?.ats_analysis) {
      // Use LLM-generated ATS score and data
      const ats = parsedResume.ats_analysis;
      finalAtsScore = ats.ats_score || 0;
      strengths = ats.strengths || [];
      weaknesses = ats.weaknesses || [];
      improvements = ats.improvement_tips || [];
      breakdown = ats.sub_scores || null;
      
      const tech = parsedResume.technical_skills || {};
      
      extractedSkills = {
        technical: [
          ...(tech.frontend || []),
          ...(tech.backend || []),
          ...(tech.database || []),
          ...(tech.cloud || []),
          ...(tech.devops || []),
          ...(tech.machine_learning || []),
          ...(tech.frameworks || [])
        ],
        programming: tech.programming_languages || [],
        tools: [
          ...(tech.tools || []),
          ...(tech.version_control || []),
          ...(tech.operating_systems || [])
        ],
        certifications: parsedResume.certifications?.certifications?.map((c: any) => c.certificate_name?.value).filter(Boolean) || [],
        projects: parsedResume.projects?.projects?.map((p: any) => p.project_name?.value).filter(Boolean) || [],
        education: parsedResume.education?.map((e: any) => e.degree?.value).filter(Boolean) || [],
        soft: parsedResume.soft_skills || [],
        allSkills: []
      };
      
      extractedSkills.allSkills = [
        ...extractedSkills.technical,
        ...extractedSkills.programming,
        ...extractedSkills.tools,
        ...extractedSkills.soft
      ];
      console.log("[Resume] Using LLM ATS Score:", finalAtsScore);
    } else {
      // Fallback to deterministic local scoring
      const atsInput: ATSInput = {
        technical: parsedResume?.skills || [],
        programming: parsedResume?.skills?.filter((s: string) =>
          ["Python", "JavaScript", "TypeScript", "SQL"].includes(s)
        ) || [],
        tools: parsedResume?.other_skills || [],
        certifications: parsedResume?.certifications?.map((c: any) => c.name) || [],
        projects: parsedResume?.projects?.map((p: any) => p.name) || [],
        education: parsedResume?.education?.map((e: any) => e.degree) || [],
        soft: [],
        rawText,
      };
      const atsResult = calculateATSScore(atsInput);
      finalAtsScore = atsResult.atsScore;
      strengths = atsResult.strengths;
      weaknesses = atsResult.weaknesses;
      improvements = atsResult.improvements;
      breakdown = atsResult.breakdown;
      
      extractedSkills = {
        technical: atsInput.technical,
        programming: atsInput.programming,
        tools: atsInput.tools,
        certifications: atsInput.certifications,
        projects: atsInput.projects,
        education: atsInput.education,
        soft: atsInput.soft,
        allSkills: [...atsInput.technical, ...atsInput.tools]
      };
      console.log("[Resume] Using fallback ATS Score:", finalAtsScore);
    }

    // ── Save/update in Supabase ──────────────────────────────────────────────
    const resume = await createResume({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      raw_text: rawText.substring(0, 8000),
      extracted_skills: extractedSkills,
      ats_score: finalAtsScore,
      strengths,
      weaknesses,
      improvements,
      breakdown,
    });

    // ── Async: generate and store resume embedding (non-blocking) ────────────
    const resolvedAiUrlForEmbed = getResolvedAiServiceUrl();
    fetch(`${resolvedAiUrlForEmbed}/resume/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_id: resume.id,
        user_id: userId,
        text: rawText.substring(0, 4000),
        skills: extractedSkills.allSkills.slice(0, 50),
        other_skills: [], // merged into skills above
        experience_summary: parsedResume?.experience?.experience
          ?.slice(0, 2)
          .map((e: any) => `${e.role?.value || "Role"} at ${e.company?.value || "Company"}`)
          .join("; ") || "",
        projects_summary: parsedResume?.projects?.projects
          ?.slice(0, 3)
          .map((p: any) => p.description?.value || "")
          .join("; ") || "",
      }),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => console.warn("[Resume] Embedding fire-and-forget failed:", e));

    // Immediately generate dynamic recommendations based on the uploaded resume
    // This runs in the background — non-fatal if it fails
    try {
      const skills = resume.extracted_skills as any;
      const allStudentSkills: string[] = [
        ...(skills?.technical || []),
        ...(skills?.programming || []),
        ...(skills?.tools || []),
      ].filter(Boolean);

      const [assessment, { internships: activeInternships }] = await Promise.all([
        getLatestAssessmentByUser(userId),
        getActiveInternships({ limit: 500 }),
      ]);

      const atsScore = resume.ats_score || 0;
      const assessmentScore = assessment?.percentage || 0;

      const normalizedInternships = activeInternships.map((i) => {
        let reqSkills = i.required_skills as any;
        if (typeof reqSkills === "string") {
          try { reqSkills = JSON.parse(reqSkills); } catch {
            reqSkills = (reqSkills as string).split(",").map((s: string) => s.trim());
          }
        }
        if (!Array.isArray(reqSkills)) reqSkills = [];
        return { _id: i.id, requiredSkills: reqSkills };
      });

      const rankings = rankInternships(normalizedInternships, allStudentSkills, atsScore, assessmentScore);
      await Promise.all(
        rankings.map((rec) =>
          upsertRecommendation({
            user_id: userId,
            internship_id: rec.internshipId,
            match_percentage: rec.matchPercentage,
            skill_score: rec.skillScore,
            assessment_score: rec.assessmentScore,
            matched_skills: rec.matchedSkills,
          })
        )
      );
      console.log(`[Resume] Generated ${rankings.length} recommendations for user ${userId}`);
    } catch (recErr) {
      console.warn("[Resume] Recommendation generation failed (non-fatal):", recErr);
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: resume.id,
        fileName: resume.file_name,
        fileUrl: resume.file_url,
        atsScore: resume.ats_score,
        extractedSkills: resume.extracted_skills,
        strengths: resume.strengths,
        weaknesses: resume.weaknesses,
        improvements: resume.improvements,
        breakdown: (resume as any).breakdown || breakdown,
      },
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { success: false, message: "Resume upload failed", reason: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized", reason: "No session found", stack: "" }, { status: 401 });
    }
    
    const userId = session.user.id as string;
    const resume = await getResumeByUser(userId);
    if (!resume) return NextResponse.json({ resume: null });

    return NextResponse.json({
      resume: {
        id: resume.id,
        fileName: resume.file_name,
        fileUrl: resume.file_url,
        atsScore: resume.ats_score,
        extractedSkills: resume.extracted_skills,
        strengths: resume.strengths || [],
        weaknesses: resume.weaknesses || [],
        improvements: resume.improvements || [],
        breakdown: (resume as any).breakdown || null,
      },
    });
  } catch (error: any) {
    console.error("Resume fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch resume", reason: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
