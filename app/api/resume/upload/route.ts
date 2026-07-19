import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createResume, getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";
import { StructuredLogger } from "@/lib/logger";

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

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  const logger = new StructuredLogger(reqId);
  logger.info("Request Initialization", "Request received");

  let userId: string = "";
  
  // =================================================
  // STEP 12: Check environment variables.
  // =================================================
  try {
    logger.debug("Environment Check", "Checking environment variables");
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  } catch (envErr: any) {
    logger.error("Environment Check", "Validation failed", envErr);
    return NextResponse.json({
      success: false, stage: "Environment Check", reason: envErr.message, solution: "Check .env file"
    }, { status: 500 });
  }

  // =================================================
  // Auth Check
  // =================================================
  try {
    logger.debug("Authentication", "Checking authentication");
    const session = await auth();
    if (!session?.user) {
      logger.warn("Authentication", "No active session found");
      return NextResponse.json({ success: false, stage: "Authentication", reason: "Unauthorized", solution: "Please log in." }, { status: 401 });
    }
    userId = session.user.id as string;
    logger.userId = userId;
    logger.info("Authentication", "User authenticated");
  } catch (authErr: any) {
    logger.error("Authentication", "Error checking session", authErr);
    return NextResponse.json({ success: false, stage: "Authentication", reason: authErr.message, solution: "Check auth provider configuration." }, { status: 500 });
  }

  let formData: FormData;
  let file: File;
  let buffer: Buffer;

  // =================================================
  // STEP 4 & 5: Validate incoming request & Verify file upload
  // =================================================
  try {
    logger.debug("FormData", "Parsing FormData");
    formData = await request.formData();
    logger.info("FormData", "FormData parsed");

    const uploadedFile = formData.get("resume") as File | null;
    if (!uploadedFile) {
      throw new Error("No file uploaded");
    }
    file = uploadedFile;
    logger.fileName = file.name;
    logger.info("File Validation", "File found");

    if (file.size === 0) {
      throw new Error("Empty file uploaded");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File exceeds 10MB limit");
    }
    
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      throw new Error("Unsupported file extension. Only PDF and DOCX are allowed.");
    }
    
    logger.info("File Validation", "File validated");

    const bytes = await file.arrayBuffer();
    buffer = Buffer.from(bytes);
  } catch (fileErr: any) {
    logger.warn("File Validation", "Validation failed", fileErr);
    return NextResponse.json({ success: false, stage: "File Validation", reason: fileErr.message, solution: "Attach a valid PDF or DOCX file under 10MB." }, { status: 400 });
  }

  let fileUrl = "";
  let safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

  // =================================================
  // Database / Storage Upload
  // =================================================
  try {
    logger.info("Storage", "Saving to Supabase storage");
    const sb = (await import("@/lib/supabase")).getSupabase();
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { data: uploadData, error: uploadError } = await sb.storage
      .from("resumes")
      .upload(filePath, buffer, { contentType: file.type || "application/pdf", upsert: true });

    if (uploadError) {
      logger.warn("Storage", "Supabase storage failed, falling back to local FS", uploadError);
      const fs = require('fs');
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", userId);
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, safeFileName), buffer);
      fileUrl = `/uploads/${userId}/${safeFileName}`;
    } else {
      const { data: urlData } = sb.storage.from("resumes").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }
    logger.info("Storage", `File stored at: ${fileUrl}`);
  } catch (storageErr: any) {
    logger.error("Storage", "Storage exception", storageErr);
    return NextResponse.json({ success: false, stage: "Storage", reason: storageErr.message, solution: "Check Supabase bucket permissions." }, { status: 500 });
  }

  let parsedResume: any = null;

  // =================================================
  // AI Service Integration & PDF Parsing
  // =================================================
  try {
    const resolvedAiUrl = getResolvedAiServiceUrl();
    
    // Pre-flight check (Phase 5)
    try {
      logger.debug("Ollama Service", "Running pre-flight health check");
      const healthCheck = await fetch(`${resolvedAiUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (!healthCheck.ok) {
        throw new Error("AI Service returned unhealthy status");
      }
      logger.info("Ollama Service", "Ollama is running and healthy");
    } catch (healthErr: any) {
      logger.error("Ollama Service", "Health check failed", healthErr);
      return NextResponse.json({ success: false, stage: "Ollama Pre-flight", reason: "Ollama server is not running", solution: "Ensure smartintern-ai and smartintern-ollama containers are up." }, { status: 500 });
    }

    logger.info("PDF Extraction", "PDF extraction started");
    const aiFormData = new FormData();
    aiFormData.append("file", new Blob([buffer], { type: file.type || "application/pdf" }), safeFileName);
    aiFormData.append("user_id", userId);

    logger.info("Ollama Service", "Sending prompt to Ollama (via AI Service)");
    const parseResp = await fetch(`${resolvedAiUrl}/resume/parse`, {
      method: "POST",
      body: aiFormData,
      signal: AbortSignal.timeout(240000), // 4 minutes
    });

    if (parseResp.ok) {
      const data = await parseResp.json();
      logger.info("PDF Extraction", "PDF extraction completed");
      logger.info("Ollama Service", "Ollama responded");
      
      // JSON Validation (Phase 7 equivalent in JS)
      if (!data.parsed || typeof data.parsed !== 'object') {
        throw new Error("Invalid JSON structure returned by AI Service");
      }
      parsedResume = data.parsed;
      logger.info("JSON Validation", "JSON validated");
    } else {
      const errText = await parseResp.text();
      throw new Error(`AI Service returned ${parseResp.status}: ${errText}`);
    }
  } catch (aiErr: any) {
    logger.error("Resume Parser", "AI parsing pipeline failed", aiErr);
    return NextResponse.json({ success: false, stage: "Resume Parser / Ollama Client", reason: aiErr.message, solution: "Ensure ai-service docker container compiled correctly and PyMuPDF didn't crash." }, { status: 500 });
  }

  // =================================================
  // Transform and Save to DB
  // =================================================
  let finalAtsScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let improvements: string[] = [];
  let breakdown: any = null;
  let extractedSkills: any = {};
  let resumeRecord: any = null;

  try {
    logger.debug("Database", "Transforming parsed payload");
    if (!parsedResume) throw new Error("Parsed resume is null");

    finalAtsScore = parsedResume.ats_score || 0;
    strengths = parsedResume.strengths || [];
    weaknesses = parsedResume.weaknesses || [];
    improvements = parsedResume.missing_skills || [];
    breakdown = { confidence: parsedResume.confidence_score };
    
    const pSkills = parsedResume.skills || {};
    extractedSkills = {
      technical: [...(pSkills.cloud || []), ...(pSkills.databases || [])],
      programming: pSkills.programming_languages || [],
      tools: [...(pSkills.tools || []), ...(pSkills.frameworks || [])],
      certifications: parsedResume.certifications?.map((c: any) => c.name).filter(Boolean) || [],
      projects: parsedResume.projects?.map((p: any) => p.title).filter(Boolean) || [],
      education: parsedResume.education?.map((e: any) => e.degree).filter(Boolean) || [],
      soft: pSkills.soft_skills || [],
      allSkills: [
        ...(pSkills.cloud || []), ...(pSkills.databases || []),
        ...(pSkills.programming_languages || []),
        ...(pSkills.tools || []), ...(pSkills.frameworks || []),
        ...(pSkills.soft_skills || [])
      ]
    };
    
    logger.debug("Database", "Executing INSERT into resumes table");
    resumeRecord = await createResume({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      raw_text: "Extracted securely via Enterprise ATS Pipeline",
      extracted_skills: extractedSkills,
      ats_score: finalAtsScore,
      strengths,
      weaknesses,
      improvements,
      breakdown,
    });
    logger.info("Database", "Saved to database");
  } catch (dbErr: any) {
    logger.error("Database", "SQL Insert Failed", dbErr);
    return NextResponse.json({ success: false, stage: "Database", reason: dbErr.message, solution: "Check Database schema constraints." }, { status: 500 });
  }

  // =================================================
  // Background Processing (Non-fatal)
  // =================================================
  logger.debug("Background Tasks", "Triggering non-blocking pipelines");
  try {
    const resolvedAiUrlForEmbed = getResolvedAiServiceUrl();
    fetch(`${resolvedAiUrlForEmbed}/resume/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume_id: resumeRecord.id,
        user_id: userId,
        text: "Extracted securely via Enterprise ATS Pipeline",
        skills: extractedSkills.allSkills.slice(0, 50),
        other_skills: [],
        experience_summary: parsedResume?.experience?.slice(0, 2).map((e: any) => `${e.role || "Role"} at ${e.company || "Company"}`).join("; ") || "",
        projects_summary: parsedResume?.projects?.slice(0, 3).map((p: any) => p.description || "").join("; ") || "",
      }),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => logger.warn("Background Tasks", "Embedding failed", e));

    const skills = resumeRecord.extracted_skills as any;
    const allStudentSkills: string[] = [...(skills?.technical || []), ...(skills?.programming || []), ...(skills?.tools || [])].filter(Boolean);

    const [assessment, { internships: activeInternships }] = await Promise.all([
      getLatestAssessmentByUser(userId), getActiveInternships({ limit: 500 }),
    ]);

    const normalizedInternships = activeInternships.map((i) => {
      let reqSkills = i.required_skills as any;
      if (typeof reqSkills === "string") {
        try { reqSkills = JSON.parse(reqSkills); } catch { reqSkills = (reqSkills as string).split(",").map((s: string) => s.trim()); }
      }
      if (!Array.isArray(reqSkills)) reqSkills = [];
      return { _id: i.id, requiredSkills: reqSkills };
    });

    const rankings = rankInternships(normalizedInternships, allStudentSkills, resumeRecord.ats_score || 0, assessment?.percentage || 0);
    await Promise.all(
      rankings.map((rec) => upsertRecommendation({
        user_id: userId, internship_id: rec.internshipId, match_percentage: rec.matchPercentage,
        skill_score: rec.skillScore, assessment_score: rec.assessmentScore, matched_skills: rec.matchedSkills,
      }))
    );
    logger.info("Background Tasks", "Ranking completed successfully");
  } catch (bgErr: any) {
    logger.warn("Background Tasks", "Failed to generate recommendations", bgErr);
  }

  logger.info("Response", "Response returned");
  return NextResponse.json({
    success: true,
    resume: {
      id: resumeRecord.id,
      fileName: resumeRecord.file_name,
      fileUrl: resumeRecord.file_url,
      atsScore: resumeRecord.ats_score,
      extractedSkills: resumeRecord.extracted_skills,
      strengths: resumeRecord.strengths,
      weaknesses: resumeRecord.weaknesses,
      improvements: resumeRecord.improvements,
      breakdown: (resumeRecord as any).breakdown || breakdown,
    },
  });
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
