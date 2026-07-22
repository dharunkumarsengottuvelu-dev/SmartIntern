import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createResume, getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";
import { StructuredLogger } from "@/lib/logger";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { apiError } from "@/lib/api-response";

// ─────────────────────────────────────────────────────────────
// Extract Text from Uploaded File (PDF / DOCX)
// ─────────────────────────────────────────────────────────────
async function extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
  let rawText = "";
  if (fileName.match(/\.pdf$/i)) {
    try {
      const result = await pdfParse(buffer);
      rawText = result.text || "";
    } catch (e) {
      console.warn("PDF parsing failed:", e);
    }
  } else if (fileName.match(/\.(docx|doc)$/i)) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value || "";
    } catch (e) {
      console.warn("DOCX parsing failed:", e);
    }
  }
  
  if (!rawText.trim()) {
    throw new Error("Unable to extract any text. The file might be corrupted or empty.");
  }
  
  return rawText;
}

export async function POST(request: NextRequest) {
  const reqId = crypto.randomUUID();
  const logger = new StructuredLogger(reqId);
  logger.info("Request Initialization", "Request received");

  let userId: string = "";

  // =================================================
  // Check environment variables
  // =================================================
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  } catch (envErr: any) {
    logger.error("Environment Check", "Validation failed", envErr);
    return apiError("Server Configuration Error", "Missing required environment variables", envErr, 500);
  }

  // =================================================
  // Auth Check
  // =================================================
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "No active session found", "Please log in to upload a resume.", 401);
    }
    userId = session.user.id as string;
    logger.userId = userId;
    logger.info("Authentication", "User authenticated");
  } catch (authErr: any) {
    logger.error("Authentication", "Error checking session", authErr);
    return apiError("Authentication Failed", "Unable to verify user session", authErr, 500);
  }

  let formData: FormData;
  let file: File;
  let buffer: Buffer;

  // =================================================
  // Validate incoming request & file
  // =================================================
  try {
    formData = await request.formData();
  } catch (err: any) {
    return apiError("Bad Request", "Failed to parse form data", err, 400);
  }

  const uploadedFile = formData.get("resume") as File | null;
  if (!uploadedFile) {
    return apiError("Missing File", "No file was uploaded.", null, 400);
  }
  
  file = uploadedFile;
  logger.fileName = file.name;

  if (file.size === 0) {
    return apiError("Empty File", "The uploaded file is empty.", null, 400);
  }
  
  if (file.size > 10 * 1024 * 1024) {
    return apiError("File Too Large", "The file exceeds the 10MB limit.", null, 413);
  }

  const allowedTypes = [
    "application/pdf", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    "application/msword"
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
    return apiError("Unsupported Format", "Only PDF and DOCX files are allowed.", null, 415);
  }

  // Note: Duplicate file names will simply overwrite the existing database record 
  // via the upsert logic in createResume, matching standard product behavior.

  try {
    const bytes = await file.arrayBuffer();
    buffer = Buffer.from(bytes);
    logger.info("File Validation", "File validated");
  } catch (fileErr: any) {
    return apiError("File Validation Error", "An error occurred while reading the file", fileErr, 500);
  }

  let fileUrl = "";
  let safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");

  // =================================================
  // Storage Upload
  // =================================================
  try {
    logger.info("Storage", "Saving to Supabase storage");
    const sb = (await import("@/lib/supabase")).getSupabase();
    const filePath = `${userId}/${Date.now()}-${safeFileName}`;

    const { data: uploadData, error: uploadError } = await sb.storage
      .from("resumes")
      .upload(filePath, buffer, { contentType: file.type || "application/pdf", upsert: true });

    if (uploadError) {
      logger.warn("Storage", "Supabase storage upload error (using local fallback)", uploadError);
      // Fallback: save locally
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
    return apiError("Storage Error", "Failed to save the uploaded resume", storageErr, 500);
  }

  // =================================================
  // Text Extraction & Initial DB Save
  // =================================================
  let rawText = "";
  let resumeRecord: any = null;
  
  try {
    rawText = await extractTextFromFile(buffer, file.name);
    if (!rawText || rawText.trim().length < 50) {
      return apiError("Corrupted File", "Could not extract sufficient text from the file. It may be corrupted or image-based.", null, 422);
    }

    // Save initial record BEFORE AI processing. This guarantees the file is tracked
    // even if the AI step fails due to rate limits or credits.
    logger.debug("Database", "Saving initial resume record to database");
    resumeRecord = await createResume({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      raw_text: rawText,
      extracted_skills: { technicalSkills: { programmingLanguages: [], frameworks: [], libraries: [], databases: { sql: [], nosql: [], orm: [] }, cloudPlatforms: [], devops: { containers: [], ciCd: [] }, backend: [], frontend: [], mobileDevelopment: [], machineLearningAndAI: [] } } as any,
      ats_score: 0,
      strengths: [],
      weaknesses: [],
      improvements: [],
    });
    logger.info("Database", "Initial resume saved to database");
  } catch (extractErr: any) {
    logger.error("Text Extraction", "Failed to extract text or save initial record", extractErr);
    return apiError("File Processing Error", "Failed to extract text from the file", extractErr, 500);
  }

  // =================================================
  // AI Parsing via Enterprise Engine
  // =================================================
  let extractedSkills: any = resumeRecord.extracted_skills;
  let finalAtsScore = 0;
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let improvements: string[] = [];
  let breakdown: any = null;
  let atsResult: any = null;
  let aiFailed = false;
  let aiErrorMessage = "";

  try {
    logger.info("AI Service", "Parsing resume text via Enterprise LLM parser");
    const { parseResumeEnterprise, generateATSReviewGrok } = await import("@/lib/openai");
    const { calculateATSScore } = await import("@/lib/ats");

    const enterpriseData = await parseResumeEnterprise(rawText);
    
    // Attempt Grok API for ATS Evaluation
    try {
      logger.info("AI Service", "Generating intelligent ATS Review via Grok API...");
      atsResult = await generateATSReviewGrok(rawText, enterpriseData);
      logger.info("AI Service", "Grok ATS Review succeeded");
    } catch (grokErr: any) {
      logger.warn("AI Service", "Grok ATS Review failed, falling back to heuristic engine", grokErr);
      atsResult = calculateATSScore({ ...enterpriseData, rawText });
    }

    extractedSkills = enterpriseData;
    finalAtsScore = atsResult.atsScore;
    strengths = atsResult.strengths;
    weaknesses = atsResult.weaknesses;
    improvements = atsResult.improvements;
    breakdown = atsResult.breakdown;
    
    extractedSkills.allSkills = [
      ...enterpriseData.technicalSkills.programmingLanguages,
      ...enterpriseData.technicalSkills.frameworks,
      ...enterpriseData.technicalSkills.libraries,
      ...enterpriseData.technicalSkills.databases.sql,
      ...enterpriseData.technicalSkills.databases.nosql,
      ...enterpriseData.technicalSkills.cloudPlatforms,
    ];

    // Update DB with AI results
    resumeRecord = await createResume({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      raw_text: rawText,
      extracted_skills: extractedSkills,
      ats_score: finalAtsScore,
      strengths,
      weaknesses,
      improvements,
      breakdown,
    });
    logger.info("Database", "Resume updated with AI analysis");

  } catch (err: any) {
    logger.error("Resume AI Processing", "AI parsing failed, but file is saved", err);
    aiFailed = true;
    // Capture the real error reason for the frontend
    const rawReason: string = err?.message || "Unknown AI error";
    if (rawReason.includes("credits") || rawReason.includes("license") || rawReason.includes("403")) {
      aiErrorMessage = "xAI API credits exhausted — the team has no active license. Please purchase credits at https://console.x.ai or try again with a funded API key.";
    } else if (rawReason.includes("401") || rawReason.includes("Invalid xAI API Key") || rawReason.includes("unauthorized")) {
      aiErrorMessage = "Invalid xAI API Key — check the XAI_API_KEY value in .env.local.";
    } else if (rawReason.includes("429") || rawReason.includes("rate limit")) {
      aiErrorMessage = "xAI API rate limit exceeded — please wait a moment and try again.";
    } else if (rawReason.includes("timeout") || rawReason.includes("ECONNRESET") || rawReason.includes("ECONNREFUSED")) {
      aiErrorMessage = "xAI API network timeout — check your internet connection.";
    } else if (rawReason.includes("500") || rawReason.includes("502") || rawReason.includes("503")) {
      aiErrorMessage = "xAI API returned a server error (5xx) — this is a temporary issue, please retry.";
    } else {
      aiErrorMessage = rawReason;
    }
  }

  // =================================================
  // Background: Generate Recommendations (non-fatal)
  // =================================================
  try {
    if (!aiFailed) {
      const skills = resumeRecord.extracted_skills as any;
      const allStudentSkills: string[] = [
        ...(skills?.technical || []), ...(skills?.programming || []), ...(skills?.tools || [])
      ].filter(Boolean);

      const [assessment, { internships: activeInternships }] = await Promise.all([
        getLatestAssessmentByUser(userId),
        getActiveInternships({ limit: 500 }),
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
      logger.info("Recommendations", "Recommendations generated");
    }
  } catch (bgErr: any) {
    logger.warn("Recommendations", "Failed to generate recommendations (non-fatal)", bgErr);
  }

  const responsePayload: any = {
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
      missingKeywords: (resumeRecord as any).missing_keywords || [],
      missingSkills: (resumeRecord as any).missing_skills || [],
      hiringProbability: (resumeRecord as any).hiring_probability || null,
      recruiterImpression: (resumeRecord as any).recruiter_impression || null,
      readabilityScore: (resumeRecord as any).readability_score || null,
      professionalismScore: (resumeRecord as any).professionalism_score || null,
      keywordDensity: (resumeRecord as any).keyword_density || null,
      detectedDomain: (resumeRecord as any).detected_domain || null,
      possibleRoles: (resumeRecord as any).possible_roles || [],
    },
  };

  if (aiFailed) {
    responsePayload.message = `Resume uploaded successfully. AI analysis failed: ${aiErrorMessage}`;
    responsePayload.aiAnalysisFailed = true;
    responsePayload.aiErrorReason = aiErrorMessage;
  } else if ((atsResult as any)?._heuristicFallback) {
    responsePayload.message = "Resume uploaded and scored using the local heuristic engine (AI API was unavailable). The ATS score is an approximation.";
    responsePayload.aiAnalysisFallback = true;
  }

  return NextResponse.json(responsePayload);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "No active session found", "Please log in.", 401);
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
        missingKeywords: (resume as any).missing_keywords || [],
        missingSkills: (resume as any).missing_skills || [],
        hiringProbability: (resume as any).hiring_probability || null,
        recruiterImpression: (resume as any).recruiter_impression || null,
        readabilityScore: (resume as any).readability_score || null,
        professionalismScore: (resume as any).professionalism_score || null,
        keywordDensity: (resume as any).keyword_density || null,
        detectedDomain: (resume as any).detected_domain || null,
        possibleRoles: (resume as any).possible_roles || [],
      },
    });
  } catch (error: any) {
    console.error("Resume fetch error:", error);
    return apiError("Resume fetch failed", "An unexpected error occurred while fetching the resume", error, 500);
  }
}
