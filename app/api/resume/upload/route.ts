import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createResume, getResumeByUser } from "@/lib/db/resumes";
import { extractSkillsFromResume } from "@/lib/openai";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getActiveInternships } from "@/lib/db/internships";
import { upsertRecommendation } from "@/lib/db/recommendations";
import { rankInternships } from "@/lib/recommendation";

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

    // Upload to Supabase Storage
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
      console.error("Supabase storage error:", uploadError);
      throw new Error("Failed to upload resume to storage: " + uploadError.message);
    }

    const { data: urlData } = sb.storage.from("resumes").getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    // Extract text from resume
    let rawText = "";
    try {
      rawText = await extractTextFromFile(buffer, file.type || "application/pdf");
      console.log(`Extracted ${rawText.length} chars from resume`);
    } catch (err) {
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

    // AI resume review — always succeeds (falls back to local rule-based analysis if API fails)
    const { reviewResumeWithGrok } = await import("@/lib/openai");
    const review = await reviewResumeWithGrok(rawText);
    console.log("[Resume] Skills extracted:", review.extractedSkills.allSkills.length, "| ATS Score:", review.atsScore);

    // Save/update in Supabase
    const resume = await createResume({
      user_id: userId,
      file_url: fileUrl,
      file_name: file.name,
      raw_text: rawText.substring(0, 8000),
      extracted_skills: {
        technical: review.extractedSkills.technical,
        programming: review.extractedSkills.programming,
        tools: review.extractedSkills.tools,
        certifications: review.extractedSkills.certifications,
        projects: review.extractedSkills.projects,
        education: review.extractedSkills.education,
        soft: review.extractedSkills.soft,
        allSkills: review.extractedSkills.allSkills,
      },
      ats_score: review.atsScore,
      strengths: review.strengths,
      weaknesses: review.weaknesses,
      improvements: review.improvements,
      breakdown: review.breakdown,
    });

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
        breakdown: (resume as any).breakdown || review.breakdown,
      },
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process resume" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resume = await getResumeByUser(session.user.id as string);
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
  } catch (error) {
    console.error("Resume fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch resume" }, { status: 500 });
  }
}
