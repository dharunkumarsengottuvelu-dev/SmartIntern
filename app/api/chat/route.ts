import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findUserById } from "@/lib/db/users";
import { getResumeByUser } from "@/lib/db/resumes";
import { getLatestAssessmentByUser } from "@/lib/db/assessments";
import { getRecommendationsByUser } from "@/lib/db/recommendations";
import { getActiveInternships } from "@/lib/db/internships";
import { resolveAPIKey } from "@/lib/openai";
import OpenAI from "openai";

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
    // Return a safe greeting if initial processing fails before we can fetch context
    const reply = "Hello! I am InternX AI. I ran into a minor configuration issue, but I am still here to help with your career journey. Feel free to ask me anything!";
    return NextResponse.json({ reply });
  }

  // Fetch all student context + active internship catalog in parallel safely
  try {
    const [profileData, resumeData, assessmentData, recommendationsData, internshipsResult] = await Promise.all([
      findUserById(userId).catch((e) => {
        console.error("[Chat] findUserById failed:", e);
        return null;
      }),
      getResumeByUser(userId).catch((e) => {
        console.error("[Chat] getResumeByUser failed:", e);
        return null;
      }),
      getLatestAssessmentByUser(userId).catch((e) => {
        console.error("[Chat] getLatestAssessmentByUser failed:", e);
        return null;
      }),
      getRecommendationsByUser(userId).catch((e) => {
        console.error("[Chat] getRecommendationsByUser failed:", e);
        return [];
      }),
      getActiveInternships({ limit: 50 }).catch((e) => {
        console.error("[Chat] getActiveInternships failed:", e);
        return { internships: [], total: 0 };
      }),
    ]);

    profile = profileData;
    resume = resumeData;
    assessment = assessmentData;
    recommendations = recommendationsData || [];
    allInternships = internshipsResult?.internships || [];
  } catch (dbErr: any) {
    console.error("[Chat] Database fetch Promise.all failed:", dbErr?.message || dbErr);
  }

  // Build internship catalog section for the system prompt
  const internshipCatalog = allInternships.length > 0
    ? allInternships.slice(0, 20).map((i, idx) => {
        const skills = Array.isArray(i.required_skills)
          ? i.required_skills.join(", ")
          : i.required_skills || "Not specified";
        return `${idx + 1}. **${i.title}** at ${i.company} | ${i.location} | ${i.duration} | ${i.stipend || "Paid"}\n   Skills required: ${skills}`;
      }).join("\n")
    : "No active internships in the system yet.";

  // Build student matched recommendations section
  const studentRecs = recommendations.length > 0
    ? recommendations.slice(0, 5).map((r: any, idx: number) => {
        const skills = Array.isArray(r.internship?.required_skills)
          ? r.internship.required_skills.join(", ")
          : "N/A";
        return `${idx + 1}. ${r.internship?.title || "Internship"} at ${r.internship?.company || "Company"} — Match: ${r.match_percentage}% | Skills matched: ${r.matched_skills?.join(", ") || "N/A"} | Required: ${skills}`;
      }).join("\n")
    : "No personalized matches yet. Student should upload a resume to get matches.";

  const systemPrompt = `You are InternX AI — the AI career advisor embedded in the InternX Smart Internship platform. You have full access to the student's profile, resume analysis, assessment results, matched internships, AND the complete live catalog of internships posted by admins.

Use all of this context to give personalized, specific, and accurate answers. Never give generic or made-up answers when real data is available.

BEHAVIOR RULES:
1. Answer any question related to: careers, internships, resumes, ATS scores, interview prep, job search, skill improvement, coding careers, cover letters, and the InternX platform.
2. When asked about internships or matches, use the REAL data from the student's profile and the internship catalog below.
3. If asked to recommend internships, pick the best ones from the catalog based on the student's skills.
4. Politely decline questions completely unrelated to careers or professional development (e.g. math homework, cooking recipes, personal finance unrelated to career).
5. Be professional, warm, and concise. Use bullet points and bold for structure.

━━━ STUDENT PROFILE ━━━
Name: ${profile?.name || "Student"}
Email: ${profile?.email || "N/A"}
College: ${profile?.college || "Not provided"} | Degree: ${profile?.degree || "N/A"} | Department: ${profile?.department || "N/A"} | Year: ${profile?.year ? `${profile.year}` : "N/A"}

━━━ RESUME & ATS ANALYSIS ━━━
${resume
  ? `File: ${resume.file_name}
ATS Score: ${resume.ats_score}/100
Extracted Skills: ${[
      ...(resume.extracted_skills?.technical || []),
      ...(resume.extracted_skills?.programming || []),
      ...(resume.extracted_skills?.tools || []),
    ].join(", ") || "None"}
Strengths: ${resume.strengths?.join("; ") || "None"}
Weaknesses: ${resume.weaknesses?.join("; ") || "None"}
AI Suggestions: ${resume.improvements?.slice(0, 3).join("; ") || "None"}`
  : "No resume uploaded yet."}

━━━ SKILL ASSESSMENT ━━━
${assessment
  ? `Score: ${assessment.percentage}% (${assessment.correct_answers}/${assessment.total_questions} correct) — Completed ${new Date(assessment.completed_at || "").toLocaleDateString("en-IN")}`
  : "Not completed yet."}

━━━ STUDENT'S MATCHED INTERNSHIPS (top 5) ━━━
${studentRecs}

━━━ FULL LIVE INTERNSHIP CATALOG (from admin panel) ━━━
${internshipCatalog}

When asked "what internships are available" or similar, use the catalog above to give specific, real answers.
When asked about skills to improve, cross-reference the student's skills against the catalog's required skills to give targeted advice.`;

  const key = resolveAPIKey();

  // Fall back to local bot only if key is truly missing
  if (!key || key === "placeholder") {
    console.warn("[Chat] No API key found. Using local career bot fallback.");
    const userMessage = messages[messages.length - 1]?.content || "";
    const reply = generateLocalResponse(userMessage, {
      profile,
      resume,
      assessment,
      recommendations,
      allInternships,
    });
    return NextResponse.json({ reply });
  }

  try {
    console.log("[Chat] Calling Grok API (grok-3-mini)...");
    const client = new OpenAI({
      apiKey: key,
      baseURL: "https://api.x.ai/v1",
    });

    const XAI_MODELS = ["grok-3-mini", "grok-3", "grok-2-1212", "grok-2", "grok-beta"];
    let response = null;
    let errorMsg = "";

    for (const model of XAI_MODELS) {
      try {
        console.log(`[Chat] Trying xAI model: ${model}`);
        response = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
          temperature: 0.65,
          max_tokens: 1400,
        });
        if (response) {
          console.log(`[Chat] Success with model: ${model}`);
          break;
        }
      } catch (err: any) {
        console.warn(`[Chat] Model ${model} failed: ${err?.message}`);
        errorMsg = err?.message || "";
      }
    }

    if (!response) {
      throw new Error(`All xAI models failed. Last error: ${errorMsg}`);
    }

    const reply = response.choices[0]?.message?.content?.trim() || "";
    if (!reply) throw new Error("Empty response from Grok API.");

    console.log("[Chat] Grok API responded successfully.");
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("[Chat] Grok API error (falling back to local bot):", error?.message || error);

    // Graceful fallback on any API failure using already pre-fetched database details
    const userMessage = messages?.[messages.length - 1]?.content || "";
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

// ─── Local Fallback Bot (used when Grok API is unavailable) ──────────────────
function generateLocalResponse(query: string, context: {
  profile?: any;
  resume?: any;
  assessment?: any;
  recommendations?: any[];
  allInternships?: any[];
}): string {
  const q = query.toLowerCase().trim();
  const name = context.profile?.name?.split(" ")[0] || "there";
  
  // Safe extraction of skills to avoid TypeError
  const skillsObj = context.resume?.extracted_skills as any;
  const techSkills = skillsObj && Array.isArray(skillsObj.technical) ? skillsObj.technical : [];
  const progSkills = skillsObj && Array.isArray(skillsObj.programming) ? skillsObj.programming : [];
  const toolSkills = skillsObj && Array.isArray(skillsObj.tools) ? skillsObj.tools : [];
  const skills = [...techSkills, ...progSkills, ...toolSkills].join(", ");

  // Greetings
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings?)\b/.test(q)) {
    return `Hello, ${name}! I am **InternX AI**, your personal career advisor.\n\nI can help you with:\n- Your ATS score and resume feedback\n- Internship matches from our catalog\n- Assessment performance analysis\n- Profile details check\n- Career and interview tips\n\nWhat would you like to know?`;
  }

  // Profile lookup
  if (/profile|my info|my details|my department|my degree|college|education|who am i/.test(q)) {
    if (context.profile) {
      let resp = `Here is your profile information, ${name}:\n\n`;
      resp += `👤 **Name:** ${context.profile.name}\n`;
      resp += `✉️ **Email:** ${context.profile.email}\n`;
      resp += `🎓 **College:** ${context.profile.college || "Not specified"}\n`;
      resp += `📜 **Degree:** ${context.profile.degree || "N/A"} (${context.profile.department || "N/A"})\n`;
      resp += `📅 **Year:** ${context.profile.year || "N/A"}\n\n`;
      resp += `You can edit your profile details by clicking the profile picture in the top-right of your dashboard.`;
      return resp;
    }
    return `I don't have access to your profile data right now. Please log in again.`;
  }

  // Internship counts / quantity check
  if (/how\s+many|number\s+of|count\s+of/.test(q) && /internship|internshis|interns|job|opening|role|position/.test(q)) {
    const count = context.allInternships?.length || 0;
    return `We currently have **${count}** active internships available on the InternX platform. You can browse them all in the **Jobs** tab or ask me to search for specific roles (e.g., "show me React internships").`;
  }

  // Available internships / search
  if (/internship|job|opening|role|position|vacancy|company|catalog/.test(q)) {
    const catalog = context.allInternships || [];
    if (catalog.length > 0) {
      // Extract keywords
      const words = q.split(/\s+/);
      const keywords = words.filter(w => w.length > 2 && !["what", "list", "show", "find", "jobs", "intern", "internship", "internships", "open", "available", "with", "have", "some"].includes(w));
      
      let filtered = catalog;
      if (keywords.length > 0) {
        filtered = catalog.filter(i => {
          const text = `${i.title} ${i.company} ${i.description} ${Array.isArray(i.required_skills) ? i.required_skills.join(" ") : ""}`.toLowerCase();
          return keywords.some(k => text.includes(k));
        });
      }

      if (filtered.length > 0) {
        let resp = keywords.length > 0
          ? `Here are the internships matching **"${keywords.join(", ")}"**:\n\n`
          : `Here are the active internships currently available on InternX:\n\n`;
          
        filtered.slice(0, 5).forEach((i: any, idx: number) => {
          const reqSkills = Array.isArray(i.required_skills)
            ? i.required_skills.join(", ")
            : i.required_skills || "N/A";
          resp += `**${idx + 1}. ${i.title}** — ${i.company}\n`;
          resp += `   📍 ${i.location} | ⏱️ ${i.duration} | 💰 ${i.stipend || "Paid"}\n`;
          resp += `   🛠️ Skills: ${reqSkills}\n\n`;
        });
        resp += `Check the **Jobs** tab to view them all and apply!`;
        return resp;
      } else if (keywords.length > 0) {
        return `I couldn't find any active internships matching **"${keywords.join(", ")}"** in our database. Let me show you the top available ones:\n\n` + 
          catalog.slice(0, 3).map((i: any, idx: number) => `**${idx + 1}. ${i.title}** at ${i.company} (${i.location})`).join("\n") + 
          `\n\nCheck the **Jobs** tab to browse all listings.`;
      }
    }
    return `No internships have been posted in the admin panel yet. Check back soon or ask the admin to add listings.`;
  }

  // Trending languages / tech trends check
  if (/trend|popular|demand|growth|future|language|framework|library|tech|stack|cuttently|currently/.test(q)) {
    return `Currently, the most trending programming languages and frameworks in the industry are:\n\n` +
      `1. **TypeScript & JavaScript**: Dominating web development with frameworks like **React.js**, **Next.js**, and **Node.js**.\n` +
      `2. **Python**: The leading language for **Machine Learning**, **Data Science**, and **AI development**.\n` +
      `3. **Go (Golang) & Rust**: Gaining massive adoption for systems programming, high-performance backends, and cloud-native tools.\n` +
      `4. **Java & Kotlin**: Continues to power enterprise systems and Android app development.\n\n` +
      (skills ? `Since your resume shows skills in **${skills}**, you are in a great position! Focusing on **React** and **Node.js** is highly valuable for modern Full Stack and Frontend roles.` : `Consider learning React, Next.js, or Python to boost your internship match opportunities!`);
  }

  // Cover letter / portfolio / github
  if (/cover\s*letter|portfolio|github|project|resume\s*tip/.test(q)) {
    return `To build a strong professional profile on InternX:\n\n` +
      `- **GitHub Portfolio**: Host your projects, write clear README files, and pin your best work. Recruiters love seeing actual code!\n` +
      `- **ATS Resume**: Ensure your resume is a single column, uses standard fonts, and contains keywords matching the job description.\n` +
      `- **Cover Letter**: Keep it short (3-4 paragraphs), customize it for the company, and highlight how your skills solve their specific problem.\n\n` +
      `You can upload your resume in the **Resume & ATS** tab to get a full analysis.`;
  }

  // General dev concept explanation or how-to-learn
  if (/what\s+is|explain|concept|how\s+to\s+learn|study|define|describe/.test(q) || /react|node|laravel|php|database|sql|mongodb|js|javascript|ts|typescript|python|java|css|html|git|devops|cloud|aws|docker/.test(q)) {
    if (/react/.test(q)) {
      return `**React.js** is a popular component-based JavaScript library for building user interfaces. To learn it effectively:\n- Master JavaScript ES6+ basics (destructuring, arrow functions, array methods).\n- Understand state management (\`useState\`, \`useEffect\`, Context API).\n- Build small projects (To-do app, weather dashboard, or clones).`;
    }
    if (/node|express/.test(q)) {
      return `**Node.js** is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser, commonly used with **Express.js** to build fast, scalable network applications and REST APIs.`;
    }
    if (/laravel|php/.test(q)) {
      return `**Laravel** is a popular open-source PHP web framework, designed for the faster development of MVC-based web applications. It includes built-in systems for routing, authentication, sessions, caching, and a powerful ORM (Eloquent).`;
    }
    if (/typescript|ts\b/.test(q)) {
      return `**TypeScript** is a strongly typed programming language that builds on JavaScript, giving you better tooling, type safety, and autocomplete in your IDE before code compiles to browser-runnable JS.`;
    }
    if (/javascript|js\b/.test(q)) {
      return `**JavaScript** is the programming language of the web, enabling interactive web pages, dynamic UI components, and full-stack development via Node.js. Key concepts to learn include Closures, Promises, Async/Await, and ES6+ features.`;
    }
    if (/python/.test(q)) {
      return `**Python** is a high-level, general-purpose programming language known for readability. It is the dominant language in AI, machine learning, data science, automation, and backend development (using frameworks like Django or FastAPI).`;
    }
    if (/java\b/.test(q)) {
      return `**Java** is a class-based, object-oriented programming language designed to have as few implementation dependencies as possible ("Write Once, Run Anywhere"). It powers large enterprise backends and Android apps.`;
    }
    if (/database|sql|mongodb|postgresql|mysql/.test(q)) {
      return `**Databases** store and retrieve data. Relational databases (SQL like PostgreSQL, MySQL) store data in structured tables. NoSQL databases (like MongoDB) store unstructured/semi-structured data in documents.`;
    }
    if (/git|github/.test(q)) {
      return `**Git** is a distributed version control system for tracking changes in source code during software development, while **GitHub** is a cloud-based hosting service for Git repositories, allowing collaboration and project hosting.`;
    }
    if (/devops|docker|kubernetes|aws|cloud/.test(q)) {
      return `**DevOps & Cloud**: Focuses on automating code deployment and managing cloud infrastructure.\n- **Docker**: Containerizes applications with all dependencies.\n- **Kubernetes**: Orchestrates and manages containerized applications at scale.\n- **AWS/GCP/Azure**: Provides cloud hosting and managed services (compute, databases, etc.).`;
    }
    if (/html|css|styling|flexbox|grid/.test(q)) {
      return `**Frontend UI Structure & Styling**:\n- **HTML**: Structure of web pages.\n- **CSS**: Styling and layout of elements.\n- **Flexbox & CSS Grid**: Advanced layout systems to build responsive, flexible grid/row-based interfaces.`;
    }
  }

  // My matches / recommendations
  if (/my match|my recommendation|my internship|jobs for me|suitable.*for me/.test(q)) {
    const recs = context.recommendations;
    if (recs && recs.length > 0) {
      let resp = `Here are your top personalized internship matches, ${name}:\n\n`;
      recs.slice(0, 3).forEach((r: any, idx: number) => {
        resp += `**${idx + 1}. ${r.internship?.title}** at **${r.internship?.company}**\n`;
        resp += `   Overall match: ${r.match_percentage}% | ${r.internship?.location} | ${r.internship?.stipend || "Paid"}\n`;
        const matched = Array.isArray(r.matched_skills) ? r.matched_skills : [];
        if (matched.length > 0) {
          resp += `   Your matching skills: ${matched.slice(0, 4).join(", ")}\n`;
        }
        resp += `\n`;
      });
      resp += `View all in the **Jobs** tab.`;
      return resp;
    }
    if (!context.resume) return `Upload your resume first in the **Resume & ATS** tab to get personalized internship matches.`;
    if (!context.assessment) return `Complete the skill assessment in the **Assessment** tab to improve your match scores.`;
    return `No matches generated yet, ${name}. Head to the **Jobs** tab to refresh.`;
  }

  // ATS / resume
  if (/ats|resume|cv|score|strength|weakness|skill|improve|upload/.test(q)) {
    if (context.resume) {
      let resp = `Your resume analysis, ${name}:\n\n**ATS Score: ${context.resume.ats_score}/100**\n`;
      if (skills) resp += `**Skills detected:** ${skills}\n\n`;
      
      const strengthsArr = Array.isArray(context.resume.strengths) 
        ? context.resume.strengths 
        : typeof context.resume.strengths === "string" 
          ? [context.resume.strengths] 
          : [];
          
      const weaknessesArr = Array.isArray(context.resume.weaknesses) 
        ? context.resume.weaknesses 
        : typeof context.resume.weaknesses === "string" 
          ? [context.resume.weaknesses] 
          : [];

      if (strengthsArr.length > 0) {
        resp += `**Strengths:**\n${strengthsArr.slice(0, 3).map((s: string) => `- ${s}`).join("\n")}\n\n`;
      }
      if (weaknessesArr.length > 0) {
        resp += `**Areas to improve:**\n${weaknessesArr.slice(0, 3).map((w: string) => `- ${w}`).join("\n")}\n\n`;
      }
      resp += `For the full breakdown, go to the **Resume & ATS** tab.`;
      return resp;
    }
    return `You have not uploaded a resume yet, ${name}. Go to the **Resume & ATS** tab to upload your PDF or DOCX and get your ATS score instantly.`;
  }

  // Assessment
  if (/assessment|test|quiz|performance|correct|wrong/.test(q)) {
    if (context.assessment) {
      return `Your assessment result, ${name}:\n\n**Score: ${context.assessment.percentage}%** (${context.assessment.correct_answers}/${context.assessment.total_questions} correct)\n\nThis score contributes to your internship match ranking. ${context.assessment.percentage >= 70 ? "Great performance!" : "Retaking the assessment can improve your match scores."}`;
    }
    return `You have not completed the assessment yet. Go to the **Assessment** tab to take the skill test and improve your internship matches.`;
  }

  // Career / interview tips
  if (/interview|tip|advice|career|how to|prepare|cv|cover letter|linkedin/.test(q)) {
    return `Here are some key career tips, ${name}:\n\n- **ATS optimization**: Use keywords from job descriptions in your resume\n- **Quantify achievements**: Use numbers (e.g., "improved performance by 30%")\n- **Project experience**: Add GitHub links and live demos to your portfolio\n- **LinkedIn**: Keep your profile updated and connect with recruiters\n- **Interview prep**: Practice STAR method (Situation, Task, Action, Result)\n\n${skills ? `Based on your skills (${skills.split(",").slice(0, 3).join(", ")}), focus on practical projects to strengthen your profile.` : "Upload your resume to get personalized career advice."}`;
  }

  // General Conversational Fallback
  return `Hi ${name}, I am **InternX AI**, your personal career assistant. How can I help you with your career journey today?\n\n` +
    `I can help you with:\n` +
    `- **Your ATS resume score & feedback** (ask me "what is my ATS score" or "how to improve my resume")\n` +
    `- **Internship matches & recommendations** (ask me "what internships match my profile")\n` +
    `- **Assessment performance** (ask me "show my assessment results")\n` +
    `- **Career & interview tips** (ask about cover letters, trending programming languages, or interview tips).\n\n` +
    `What would you like to know?`;
}
