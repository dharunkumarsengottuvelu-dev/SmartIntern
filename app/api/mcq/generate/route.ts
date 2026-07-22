import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getResumeById } from "@/lib/db/resumes";
import { createAssessment } from "@/lib/db/assessments";
import { apiError } from "@/lib/api-response";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────
// Skill extractor from raw text
// ─────────────────────────────────────────────────────────────
function extractSkillsFromRawText(rawText: string): string[] {
  const text = rawText || "";
  const found = new Set<string>();

  const skillVocab: Record<string, string> = {
    "python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "java": "Java", "c\\+\\+": "C++", "c#": "C#", "golang": "Go", "\\bgo\\b": "Go",
    "rust": "Rust", "ruby": "Ruby", "php": "PHP", "swift": "Swift", "kotlin": "Kotlin",
    "dart": "Dart", "scala": "Scala", "bash": "Bash", "html5?": "HTML", "css3?": "CSS", "sql": "SQL",
    "react\\.?js": "React", "\\breact\\b": "React", "next\\.?js": "Next.js",
    "angular": "Angular", "vue\\.?js": "Vue.js", "svelte": "Svelte", "redux": "Redux",
    "tailwind": "Tailwind CSS", "bootstrap": "Bootstrap",
    "node\\.?js": "Node.js", "express": "Express.js", "django": "Django", "flask": "Flask",
    "fastapi": "FastAPI", "spring boot": "Spring Boot", "laravel": "Laravel",
    "nestjs": "NestJS", "graphql": "GraphQL", "rest api": "REST API",
    "flutter": "Flutter", "react native": "React Native", "android": "Android",
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL", "mysql": "MySQL",
    "mongodb": "MongoDB", "sqlite": "SQLite", "redis": "Redis", "firebase": "Firebase",
    "supabase": "Supabase", "elasticsearch": "Elasticsearch", "prisma": "Prisma",
    "\\baws\\b": "AWS", "\\bgcp\\b": "GCP", "\\bazure\\b": "Azure",
    "docker": "Docker", "kubernetes": "Kubernetes", "terraform": "Terraform",
    "jenkins": "Jenkins", "github actions": "GitHub Actions", "ci/cd": "CI/CD",
    "linux": "Linux", "nginx": "Nginx", "vercel": "Vercel",
    "machine learning": "Machine Learning", "deep learning": "Deep Learning",
    "tensorflow": "TensorFlow", "pytorch": "PyTorch", "scikit.?learn": "Scikit-learn",
    "pandas": "Pandas", "numpy": "NumPy", "\\bnlp\\b": "NLP",
    "computer vision": "Computer Vision", "langchain": "LangChain",
    "\\bgit\\b": "Git", "github": "GitHub", "gitlab": "GitLab",
    "jira": "Jira", "figma": "Figma", "postman": "Postman",
    "jest": "Jest", "cypress": "Cypress", "selenium": "Selenium",
    "openai": "OpenAI API", "kafka": "Apache Kafka", "webpack": "Webpack", "vite": "Vite",
  };

  for (const [pattern, displayName] of Object.entries(skillVocab)) {
    try {
      if (new RegExp(pattern, "i").test(text)) found.add(displayName);
    } catch { /* ignore invalid regex */ }
  }
  return Array.from(found);
}

// ─────────────────────────────────────────────────────────────
// Hardcoded Built-in Question Bank
// ─────────────────────────────────────────────────────────────
export const QUESTION_BANK: Record<string, any[]> = {
  "Python": [
    { question: "What is a Python decorator?", options: ["A design pattern", "A function that wraps another function", "A Python class", "A module"], answer: "A function that wraps another function", difficulty: "medium", topic: "Python" },
    { question: "Which keyword is used to define a generator function in Python?", options: ["return", "yield", "generate", "async"], answer: "yield", difficulty: "easy", topic: "Python" },
    { question: "What does GIL stand for in Python?", options: ["Global Instance Lock", "General Input Loader", "Global Interpreter Lock", "Generic Interface Layer"], answer: "Global Interpreter Lock", difficulty: "hard", topic: "Python" },
  ],
  "JavaScript": [
    { question: "What does `===` check in JavaScript?", options: ["Value only", "Type only", "Value and type", "Reference"], answer: "Value and type", difficulty: "easy", topic: "JavaScript" },
    { question: "What is a closure in JavaScript?", options: ["A function with access to its outer scope", "A sealed object", "A type of loop", "An arrow function"], answer: "A function with access to its outer scope", difficulty: "medium", topic: "JavaScript" },
    { question: "What does `Promise.all()` do?", options: ["Runs promises sequentially", "Runs all promises in parallel and waits for all", "Returns the first resolved promise", "Cancels all promises"], answer: "Runs all promises in parallel and waits for all", difficulty: "medium", topic: "JavaScript" },
  ],
  "TypeScript": [
    { question: "What is a TypeScript interface?", options: ["A class definition", "A contract that defines the shape of an object", "A function type", "A module"], answer: "A contract that defines the shape of an object", difficulty: "easy", topic: "TypeScript" },
    { question: "What is the purpose of `unknown` type in TypeScript?", options: ["Same as any", "Type-safe alternative to any", "Undefined value", "Null type"], answer: "Type-safe alternative to any", difficulty: "medium", topic: "TypeScript" },
    { question: "What does the `keyof` operator do?", options: ["Returns object keys as a union type", "Gets array keys", "Deletes keys", "Copies keys"], answer: "Returns object keys as a union type", difficulty: "hard", topic: "TypeScript" },
  ],
  "React": [
    { question: "What is the purpose of `useEffect` in React?", options: ["Manage state", "Handle side effects", "Create components", "Style components"], answer: "Handle side effects", difficulty: "easy", topic: "React" },
    { question: "What is the Virtual DOM?", options: ["A backend database", "A lightweight copy of the real DOM", "A CSS framework", "A state manager"], answer: "A lightweight copy of the real DOM", difficulty: "easy", topic: "React" },
    { question: "What does React.memo do?", options: ["Memoizes a component to prevent unnecessary re-renders", "Stores state in memory", "Creates a memo list", "Caches API calls"], answer: "Memoizes a component to prevent unnecessary re-renders", difficulty: "medium", topic: "React" },
  ],
  "Next.js": [
    { question: "What is the purpose of `getServerSideProps` in Next.js?", options: ["Fetch data at build time", "Fetch data on every request at server side", "Fetch data on the client", "Cache API routes"], answer: "Fetch data on every request at server side", difficulty: "medium", topic: "Next.js" },
    { question: "What folder contains API routes in Next.js App Router?", options: ["/pages/api", "/app/api", "/routes", "/server"], answer: "/app/api", difficulty: "easy", topic: "Next.js" },
    { question: "What does ISR stand for in Next.js?", options: ["Instant Site Rendering", "Incremental Static Regeneration", "Internal Server Routing", "Index Static Rebuild"], answer: "Incremental Static Regeneration", difficulty: "medium", topic: "Next.js" },
  ],
  "SQL": [
    { question: "Which SQL clause filters rows after grouping?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], answer: "HAVING", difficulty: "medium", topic: "SQL" },
    { question: "What is the difference between INNER JOIN and LEFT JOIN?", options: ["No difference", "INNER JOIN returns matching rows; LEFT JOIN returns all from left table", "LEFT JOIN only returns left rows", "INNER JOIN returns all rows"], answer: "INNER JOIN returns matching rows; LEFT JOIN returns all from left table", difficulty: "easy", topic: "SQL" },
    { question: "What does ACID stand for in databases?", options: ["Atomicity, Consistency, Isolation, Durability", "Access, Control, Index, Data", "Atomic, Complete, Indexed, Durable", "None of the above"], answer: "Atomicity, Consistency, Isolation, Durability", difficulty: "hard", topic: "SQL" },
  ],
  "Docker": [
    { question: "What is a Docker container?", options: ["A virtual machine", "A lightweight isolated runtime environment", "A server", "A programming language"], answer: "A lightweight isolated runtime environment", difficulty: "easy", topic: "Docker" },
    { question: "What does `docker-compose up` do?", options: ["Builds images only", "Starts services defined in docker-compose.yml", "Stops all containers", "Pushes images"], answer: "Starts services defined in docker-compose.yml", difficulty: "easy", topic: "Docker" },
    { question: "What is a Dockerfile?", options: ["A log file", "A script with instructions to build a Docker image", "A database config", "A container registry"], answer: "A script with instructions to build a Docker image", difficulty: "easy", topic: "Docker" },
  ],
  "Git": [
    { question: "What does `git rebase` do?", options: ["Merges branches", "Moves commits to a new base", "Deletes commits", "Resets the repo"], answer: "Moves commits to a new base", difficulty: "medium", topic: "Git" },
    { question: "What is the difference between `git merge` and `git rebase`?", options: ["No difference", "Merge creates a merge commit; rebase rewrites history linearly", "Rebase creates merge commit", "Merge rewrites history"], answer: "Merge creates a merge commit; rebase rewrites history linearly", difficulty: "hard", topic: "Git" },
    { question: "What does `git stash` do?", options: ["Deletes changes", "Temporarily stores uncommitted changes", "Commits to a branch", "Pushes to remote"], answer: "Temporarily stores uncommitted changes", difficulty: "easy", topic: "Git" },
  ],
  "AWS": [
    { question: "What is AWS S3 used for?", options: ["Compute", "Object storage", "Networking", "Database"], answer: "Object storage", difficulty: "easy", topic: "AWS" },
    { question: "What is the difference between EC2 and Lambda?", options: ["No difference", "EC2 is a server; Lambda is serverless functions", "Lambda is a server", "EC2 is serverless"], answer: "EC2 is a server; Lambda is serverless functions", difficulty: "medium", topic: "AWS" },
    { question: "What is AWS IAM?", options: ["A database service", "Identity and Access Management for permissions", "An EC2 instance type", "A load balancer"], answer: "Identity and Access Management for permissions", difficulty: "easy", topic: "AWS" },
  ],
  "Node.js": [
    { question: "What is the event loop in Node.js?", options: ["A for loop", "A mechanism to handle async operations non-blockingly", "A server loop", "A timer"], answer: "A mechanism to handle async operations non-blockingly", difficulty: "medium", topic: "Node.js" },
    { question: "What does `require()` do in Node.js?", options: ["Declares a variable", "Imports a module", "Exports a module", "Creates a server"], answer: "Imports a module", difficulty: "easy", topic: "Node.js" },
    { question: "What is `package.json` used for?", options: ["Storing API keys", "Defining project metadata and dependencies", "A config for TypeScript", "A Docker file"], answer: "Defining project metadata and dependencies", difficulty: "easy", topic: "Node.js" },
  ],
  "MongoDB": [
    { question: "What type of database is MongoDB?", options: ["Relational", "Document-based NoSQL", "Graph", "Key-value"], answer: "Document-based NoSQL", difficulty: "easy", topic: "MongoDB" },
    { question: "What is a MongoDB index used for?", options: ["Storing data", "Speeding up query performance", "Creating collections", "Backing up data"], answer: "Speeding up query performance", difficulty: "easy", topic: "MongoDB" },
    { question: "What is the difference between `find()` and `findOne()` in MongoDB?", options: ["No difference", "find() returns a cursor of all matches; findOne() returns the first match", "findOne() returns all", "find() is faster"], answer: "find() returns a cursor of all matches; findOne() returns the first match", difficulty: "medium", topic: "MongoDB" },
  ],
  "Machine Learning": [
    { question: "What is overfitting in machine learning?", options: ["Model performs well on training but poorly on new data", "Model performs well on all data", "Model is too simple", "Data is missing"], answer: "Model performs well on training but poorly on new data", difficulty: "medium", topic: "Machine Learning" },
    { question: "What is cross-validation?", options: ["A testing method using multiple subsets to evaluate model performance", "A type of neural network", "A data cleaning step", "A loss function"], answer: "A testing method using multiple subsets to evaluate model performance", difficulty: "medium", topic: "Machine Learning" },
    { question: "What does a confusion matrix show?", options: ["Model accuracy only", "True/false positives and negatives for classification", "Training loss", "Feature importance"], answer: "True/false positives and negatives for classification", difficulty: "hard", topic: "Machine Learning" },
  ],
  "PostgreSQL": [
    { question: "What is a PostgreSQL schema?", options: ["A table", "A namespace that contains database objects", "A query", "An index"], answer: "A namespace that contains database objects", difficulty: "medium", topic: "PostgreSQL" },
    { question: "What is the purpose of `EXPLAIN ANALYZE` in PostgreSQL?", options: ["Creates an index", "Shows query execution plan and timing", "Deletes slow queries", "Optimizes tables"], answer: "Shows query execution plan and timing", difficulty: "hard", topic: "PostgreSQL" },
    { question: "What does `ON DELETE CASCADE` do in a foreign key?", options: ["Prevents deletion", "Automatically deletes child rows when parent is deleted", "Sets child to NULL", "Does nothing"], answer: "Automatically deletes child rows when parent is deleted", difficulty: "medium", topic: "PostgreSQL" },
  ],
  "default": [
    { question: "What does OOP stand for?", options: ["Object Oriented Programming", "Open Output Protocol", "Optimized Online Processing", "Object Output Pipeline"], answer: "Object Oriented Programming", difficulty: "easy", topic: "General" },
    { question: "What is an API?", options: ["A programming language", "An interface that allows applications to communicate", "A database", "A server"], answer: "An interface that allows applications to communicate", difficulty: "easy", topic: "General" },
    { question: "What is the purpose of version control?", options: ["Speed up code", "Track and manage changes to code over time", "Deploy applications", "Test code"], answer: "Track and manage changes to code over time", difficulty: "easy", topic: "General" },
    { question: "What does REST stand for?", options: ["Remote Execution State Transfer", "Representational State Transfer", "Resource Entity Service Transmission", "Remote Endpoint Service Transfer"], answer: "Representational State Transfer", difficulty: "easy", topic: "General" },
    { question: "What is a relational database?", options: ["A database using JSON documents", "A database that organizes data into tables with relationships", "A key-value store", "An in-memory cache"], answer: "A database that organizes data into tables with relationships", difficulty: "easy", topic: "General" },
  ],
};

function generateQuestionsFromBank(skills: string[], count: number = 20): any[] {
  const questions: any[] = [];
  const usedSkills = new Set<string>();

  // First pass: pick questions for matching skills
  for (const skill of skills) {
    const bankKey = Object.keys(QUESTION_BANK).find(
      k => k.toLowerCase() === skill.toLowerCase()
    );
    if (bankKey && QUESTION_BANK[bankKey]) {
      for (const q of QUESTION_BANK[bankKey]) {
        if (questions.length < count) questions.push(q);
      }
      usedSkills.add(bankKey);
    }
    if (questions.length >= count) break;
  }

  // Second pass: fill remaining with default questions
  if (questions.length < count) {
    for (const q of QUESTION_BANK["default"]) {
      if (questions.length < count) questions.push(q);
    }
  }

  // Third pass: fill from any bank if still not enough
  if (questions.length < Math.min(5, count)) {
    for (const [key, qs] of Object.entries(QUESTION_BANK)) {
      if (key === "default") continue;
      for (const q of qs) {
        if (questions.length < count) questions.push(q);
      }
      if (questions.length >= count) break;
    }
  }

  // Shuffle questions
  return questions.sort(() => Math.random() - 0.5).slice(0, count);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiError("Unauthorized", "No active session found", "Please log in to generate an assessment.", 401);
    }

    const userId = session.user.id as string;
    const { resumeId, selectedSkills, questionCount = 15 } = await request.json();
    if (!resumeId) {
      return apiError("Bad Request", "resumeId is required", undefined, 400);
    }

    const resume = await getResumeById(resumeId, userId);
    if (!resume) {
      return apiError("Not Found", "Resume not found", "Please ensure your resume is uploaded correctly.", 404);
    }

    let skillsToUse: string[] = [];

    // ── Step 1: Use user-selected skills if provided
    if (Array.isArray(selectedSkills) && selectedSkills.length > 0) {
      skillsToUse = selectedSkills;
      console.log("[MCQ] Using user-selected skills:", skillsToUse);
    } else {
      // ── Step 2: Get skills from DB fallback
      const stored = (resume.extracted_skills || {}) as any;
      let skillsFromDB: string[] = [
        ...((stored.allSkills as string[]) || []),
        ...((stored.programming as string[]) || []),
        ...((stored.technical as string[]) || []),
        ...((stored.tools as string[]) || []),
      ].filter(Boolean);

      console.log("[MCQ] Skills from DB:", skillsFromDB.length, skillsFromDB.slice(0, 5));

      // ── Step 3: Re-extract from raw_text if DB skills insufficient
      if (skillsFromDB.length < 3) {
        let rawText = (resume as any).raw_text || "";

        if (!rawText || rawText.trim().length < 30) {
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
              } else if (mimeType.includes("word") || mimeType.includes("docx")) {
                const mammoth = await import("mammoth");
                const result = await mammoth.extractRawText({ buffer });
                rawText = result.value || "";
              }
            }
          } catch (downloadErr) {
            console.error("[MCQ] Failed to download/parse file:", downloadErr);
          }
        }

        if (rawText && rawText.trim().length > 30) {
          skillsFromDB = extractSkillsFromRawText(rawText);
        }
      }
      skillsToUse = skillsFromDB;
    }

    const uniqueSkills = [...new Set(skillsToUse.map((s) => s.trim()).filter(Boolean))].slice(0, 15);
    console.log("[MCQ] Final skills for generation:", uniqueSkills);

    // ── Step 3: Try AI service first, fall back to question bank
    let questions: any[] = [];

    try {
      const mcqResp = await fetch(`${AI_SERVICE_URL}/generate-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: uniqueSkills, count: questionCount }),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
      if (mcqResp.ok) {
        const data = await mcqResp.json();
        questions = data.questions || [];
        console.log("[MCQ] AI service generated", questions.length, "questions");
      }
    } catch (aiErr) {
      console.warn("[MCQ] AI service not available, using built-in question bank");
    }

    // ── Step 4: Use built-in question bank if AI service did not provide questions
    if (!questions || questions.length === 0) {
      const skillsToUse = uniqueSkills.length > 0 ? uniqueSkills : ["JavaScript", "Python", "SQL"];
      questions = generateQuestionsFromBank(skillsToUse, questionCount);
      console.log("[MCQ] Generated", questions.length, "questions from built-in bank for skills:", skillsToUse);
    }


    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate assessment questions. Please try again." },
        { status: 500 }
      );
    }

    // Save assessment to DB
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
      timeLimit: questionCount * 90, // 1.5 min per question
      skillsUsed: uniqueSkills,
    });

  } catch (error: any) {
    console.error("MCQ generation error:", error);
    return apiError("MCQ Generation Failed", "Failed to generate assessment", error, 500);
  }
}
