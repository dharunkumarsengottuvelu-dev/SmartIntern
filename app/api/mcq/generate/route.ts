import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResumeById } from "@/lib/db/resumes";
import { createAssessment } from "@/lib/db/assessments";

// OFFLINE: MCQ generation uses local ai-service (gemma4:e4b via Ollama).
// No xAI/Grok calls anywhere in this file.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ── Broad, case-insensitive skill extractor that works directly on raw resume text
function extractSkillsFromRawText(rawText: string): string[] {
  const text = rawText || "";
  const found = new Set<string>();

  // Master skill vocabulary — normalized (lowercase) → display name
  const skillVocab: Record<string, string> = {
    // Programming Languages
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "c\\+\\+": "C++",
    "c#": "C#",
    "c programming": "C",
    "\\bc\\b": "C",
    "golang": "Go",
    "\\bgo\\b": "Go",
    "rust": "Rust",
    "ruby": "Ruby",
    "php": "PHP",
    "swift": "Swift",
    "kotlin": "Kotlin",
    "dart": "Dart",
    "scala": "Scala",
    "perl": "Perl",
    "bash": "Bash",
    "shell": "Shell Scripting",
    "r programming": "R",
    "matlab": "MATLAB",
    "html5?": "HTML",
    "css3?": "CSS",
    "sql": "SQL",

    // Frontend
    "react\\.?js": "React",
    "reactjs": "React",
    "\\breact\\b": "React",
    "next\\.?js": "Next.js",
    "nextjs": "Next.js",
    "angular\\.?js": "Angular",
    "\\bangular\\b": "Angular",
    "vue\\.?js": "Vue.js",
    "vuejs": "Vue.js",
    "\\bvue\\b": "Vue.js",
    "svelte": "Svelte",
    "redux": "Redux",
    "tailwind": "Tailwind CSS",
    "bootstrap": "Bootstrap",
    "sass": "SASS",
    "scss": "SCSS",
    "jquery": "jQuery",
    "three\\.?js": "Three.js",
    "material.ui": "Material UI",
    "chakra": "Chakra UI",

    // Backend
    "node\\.?js": "Node.js",
    "nodejs": "Node.js",
    "express\\.?js": "Express.js",
    "express": "Express.js",
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "spring boot": "Spring Boot",
    "\\bspring\\b": "Spring",
    "laravel": "Laravel",
    "nestjs": "NestJS",
    "nest\\.?js": "NestJS",
    "fastify": "Fastify",
    "gin": "Gin",
    "fiber": "Fiber",
    "rails": "Ruby on Rails",
    "graphql": "GraphQL",
    "rest api": "REST API",
    "restful": "REST API",
    "websocket": "WebSockets",
    "grpc": "gRPC",

    // Mobile
    "flutter": "Flutter",
    "react native": "React Native",
    "android": "Android",
    "\\bios\\b": "iOS",
    "jetpack compose": "Jetpack Compose",
    "swift ui": "SwiftUI",

    // Databases
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "mongodb": "MongoDB",
    "\\bmongo\\b": "MongoDB",
    "sqlite": "SQLite",
    "redis": "Redis",
    "cassandra": "Cassandra",
    "dynamodb": "DynamoDB",
    "firebase": "Firebase",
    "supabase": "Supabase",
    "elasticsearch": "Elasticsearch",
    "neo4j": "Neo4j",
    "prisma": "Prisma",
    "mongoose": "Mongoose",
    "typeorm": "TypeORM",
    "sequelize": "Sequelize",

    // Cloud & DevOps
    "\\baws\\b": "AWS",
    "amazon web services": "AWS",
    "\\bgcp\\b": "GCP",
    "google cloud": "GCP",
    "\\bazure\\b": "Azure",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "\\bk8s\\b": "Kubernetes",
    "terraform": "Terraform",
    "jenkins": "Jenkins",
    "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "nginx": "Nginx",
    "apache": "Apache",
    "linux": "Linux",
    "ubuntu": "Ubuntu",
    "ansible": "Ansible",
    "vercel": "Vercel",
    "netlify": "Netlify",
    "heroku": "Heroku",

    // AI / ML
    "machine learning": "Machine Learning",
    "deep learning": "Deep Learning",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "keras": "Keras",
    "scikit.?learn": "Scikit-learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "matplotlib": "Matplotlib",
    "\\bnlp\\b": "NLP",
    "computer vision": "Computer Vision",
    "\\bcv\\b": "Computer Vision",
    "opencv": "OpenCV",
    "hugging face": "Hugging Face",
    "langchain": "LangChain",
    "\\bllm\\b": "LLMs",

    // Tools & Platforms
    "\\bgit\\b": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "bitbucket": "Bitbucket",
    "jira": "Jira",
    "figma": "Figma",
    "postman": "Postman",
    "swagger": "Swagger",
    "linux terminal": "Linux Terminal",
    "vscode": "VS Code",
    "vs code": "VS Code",
    "jupyter": "Jupyter Notebook",
    "tableau": "Tableau",
    "power bi": "Power BI",
    "excel": "Excel",
    "kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",
    "webpack": "Webpack",
    "vite": "Vite",
    "jest": "Jest",
    "cypress": "Cypress",
    "selenium": "Selenium",
    "playwright": "Playwright",
    "socket\\.?io": "Socket.io",
    "stripe": "Stripe",
    "twilio": "Twilio",
    "openai": "OpenAI API",
  };

  for (const [pattern, displayName] of Object.entries(skillVocab)) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(text)) {
        found.add(displayName);
      }
    } catch {
      // ignore invalid regex
    }
  }

  return Array.from(found);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id as string;
    const { resumeId } = await request.json();
    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }

    // Get resume with extracted skills + raw_text
    const resume = await getResumeById(resumeId, userId);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // ── Step 1: Try to get skills from stored extracted_skills fields
    const stored = (resume.extracted_skills || {}) as any;
    let skillsFromDB: string[] = [
      ...((stored.allSkills as string[]) || []),
      ...((stored.programming as string[]) || []),
      ...((stored.technical as string[]) || []),
      ...((stored.tools as string[]) || []),
    ].filter(Boolean);

    console.log("[MCQ] Skills from DB:", skillsFromDB.length, skillsFromDB.slice(0, 5));

    // ── Step 2: If DB skills are empty/too few, re-extract directly from raw_text
    if (skillsFromDB.length < 3) {
      console.log("[MCQ] DB skills insufficient, re-extracting from raw_text...");
      let rawText = (resume as any).raw_text || "";

      // ── Step 2.5: Dynamic fallback for legacy resumes with no raw_text in DB
      if (!rawText || rawText.trim().length < 30) {
        console.log("[MCQ] raw_text empty in DB, dynamically downloading and parsing PDF...");
        try {
          const fetchRes = await fetch(resume.file_url);
          if (fetchRes.ok) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = fetchRes.headers.get("content-type") || "application/pdf";

            if (mimeType.includes("pdf")) {
              const { extractText } = await import("unpdf");
              const uint8 = new Uint8Array(buffer);
              const { text } = await extractText(uint8, { mergePages: true });
              rawText = text || "";
            } else if (mimeType.includes("word") || mimeType.includes("docx") || mimeType.includes("document")) {
              const mammoth = await import("mammoth");
              const result = await mammoth.extractRawText({ buffer });
              rawText = result.value || "";
            }
          }
        } catch (downloadErr) {
          console.error("[MCQ] Failed to download/parse PDF dynamically:", downloadErr);
        }
      }

      if (rawText && rawText.trim().length > 30) {
        skillsFromDB = extractSkillsFromRawText(rawText);
        console.log("[MCQ] Re-extracted skills from raw_text:", skillsFromDB.length, skillsFromDB);
      }

      // ── Step 3: If raw_text is also empty, throw error
      if (skillsFromDB.length < 2) {
        console.warn("[MCQ] raw_text also empty or no skills found — no skills available");
        return NextResponse.json(
          {
            error: "Could not extract skills from your resume. Please re-upload your resume file and try again.",
            hint: "Make sure your PDF/DOCX is text-based (not a scanned image).",
          },
          { status: 400 }
        );
      }
    }

    // Deduplicate and take top 12
    const uniqueSkills = [...new Set(skillsFromDB.map((s) => s.trim()).filter(Boolean))].slice(0, 12);
    console.log("[MCQ] Final skills for question generation:", uniqueSkills);

    // ── Generate MCQs via local ai-service (gemma4:e4b) ───────────────────
    let questions: any[] = [];
    try {
      const mcqResp = await fetch(`${AI_SERVICE_URL}/generate-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: uniqueSkills, count: 20 }),
      });
      if (mcqResp.ok) {
        const data = await mcqResp.json();
        questions = data.questions || [];
        console.log("[MCQ] ai-service generated", questions.length, "questions");
      } else {
        console.warn("[MCQ] ai-service returned", mcqResp.status);
      }
    } catch (aiErr) {
      console.error("[MCQ] ai-service unreachable:", aiErr);
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate assessment questions. Please try again." },
        { status: 500 }
      );
    }

    // Save assessment to Supabase
    const assessment = await createAssessment({
      user_id: userId,
      resume_id: resume.id,
      questions,
      total_questions: questions.length,
    });

    // Return questions WITHOUT correct answers
    const clientQuestions = questions.map((q: any, index: number) => ({
      index,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
      topic: q.topic,
    }));

    return NextResponse.json({
      assessmentId: assessment.id,
      totalQuestions: questions.length,
      questions: clientQuestions,
      timeLimit: 30 * 60,
      skillsUsed: uniqueSkills,
    });
  } catch (error: any) {
    console.error("MCQ generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate assessment" },
      { status: 500 }
    );
  }
}
