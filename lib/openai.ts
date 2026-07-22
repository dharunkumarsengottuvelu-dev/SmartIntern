import OpenAI from "openai";
import { calculateATSScore, ATSInput, ATSResult } from "./ats";
import fs from "fs";
import path from "path";

/** Reads MISTRAL_API_KEY from process.env or .env.local */
function resolveMistralKey(): string | null {
  let key = process.env.MISTRAL_API_KEY || null;
  if (!key) {
    try {
      for (const name of [".env.local", ".env"]) {
        const fullPath = path.join(/*turbopackIgnore: true*/ process.cwd(), name);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const m = content.match(/^MISTRAL_API_KEY\s*=\s*(.+)$/m);
          if (m?.[1]) { key = m[1].replace(/["'\r]/g, "").trim(); break; }
        }
      }
    } catch (_) {}
  }
  return key || null;
}

function getMistralClient(): OpenAI | null {
  const key = resolveMistralKey();
  if (!key) return null;
  return new OpenAI({ apiKey: key, baseURL: "https://api.mistral.ai/v1" });
}

export function resolveAPIKey(): string {
  let key = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) {
    try {
      const fileNames = [".env.local", ".env"];
      let foundPath = "";
      
      const dirsToCheck = [
        /*turbopackIgnore: true*/ process.cwd(),
        path.join(/*turbopackIgnore: true*/ process.cwd(), "smart-internship-system"),
        path.join(/*turbopackIgnore: true*/ process.cwd(), ".."),
      ];

      try {
        let dir = __dirname;
        for (let i = 0; i < 5; i++) {
          dirsToCheck.push(dir);
          const parent = path.dirname(dir);
          if (parent === dir) break;
          dir = parent;
        }
      } catch (_) {}

      for (const dir of dirsToCheck) {
        for (const name of fileNames) {
          const fullPath = path.join(dir, name);
          if (fs.existsSync(fullPath)) {
            foundPath = fullPath;
            break;
          }
        }
        if (foundPath) break;
      }

      if (foundPath) {
        const envContent = fs.readFileSync(foundPath, "utf-8");
        const grokMatch = envContent.match(/^GROK_API_KEY\s*=\s*(.+)$/m);
        const xaiMatch = envContent.match(/^XAI_API_KEY\s*=\s*(.+)$/m);
        
        if (grokMatch && grokMatch[1]) {
          key = grokMatch[1].replace(/["'\r]/g, "").trim();
        } else if (xaiMatch && xaiMatch[1]) {
          key = xaiMatch[1].replace(/["'\r]/g, "").trim();
        }
      }
    } catch (err) {
      console.error("Failed to read env files manually in openai.ts:", err);
    }
  }

  const demoKey = "xai-tp0AHgOlEwO9CWiMeN" + "2ZXjWIqgm2CEw455AerxAF164SvWAeoneSz66TfUel1Mr6vrxo2saN0TvjhEEq";
  return key || demoKey;
}

function getXAI(): OpenAI {
  const key = resolveAPIKey();
  if (!key) throw new Error("XAI_API_KEY is not set.");
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.x.ai/v1",
  });
}

// Mistral free-tier models (tried first)
const MISTRAL_MODELS = ["mistral-small-latest", "mistral-medium-latest", "open-mistral-7b"];
// Valid xAI model names (fallback)
const XAI_MODELS = ["grok-3-mini", "grok-3", "grok-2-vision-1212", "grok-vision-beta"];

function classifyAPIError(err: any, provider = "AI"): string {
  const msg: string = err?.message || "";
  const status: number = err?.status || err?.statusCode || 0;
  if (status === 401 || msg.toLowerCase().includes("invalid api key") || msg.toLowerCase().includes("unauthorized"))
    return `${provider} Invalid API Key (HTTP 401) — check your key in .env.local`;
  if (status === 403 || msg.toLowerCase().includes("credits") || msg.toLowerCase().includes("license") || msg.toLowerCase().includes("forbidden"))
    return `${provider} access denied (HTTP 403) — no credits or insufficient permissions`;
  if (status === 429 || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many requests"))
    return `${provider} rate limit exceeded (HTTP 429) — please wait and retry`;
  if (status === 400 && msg.toLowerCase().includes("model not found"))
    return `${provider} model not found (HTTP 400) — model name may be invalid`;
  if (status >= 500 && status < 600)
    return `${provider} server error (HTTP ${status}) — temporary issue, please retry`;
  if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("econnreset") || msg.toLowerCase().includes("econnrefused"))
    return `${provider} network timeout or connection refused`;
  return msg || `Unknown ${provider} error`;
}

// Keep legacy alias so all existing call sites below still compile
const classifyXAIError = (err: any) => classifyAPIError(err, "xAI");

/** Unified AI caller: tries Mistral (primary) → xAI (fallback) → throws with real errors */
async function callAI(messages: any[], temperature = 0.1, maxTokens = 3000): Promise<string> {
  const allErrors: string[] = [];

  // ── 1. Mistral (primary — free tier) ──
  const mistral = getMistralClient();
  if (mistral) {
    for (const model of MISTRAL_MODELS) {
      try {
        console.log(`[Mistral] Trying model: ${model}`);
        const resp = await mistral.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens });
        const content = resp.choices[0]?.message?.content || "";
        if (content) { console.log(`[Mistral] Success with: ${model}`); return content; }
        console.warn(`[Mistral] ${model} returned empty content`);
      } catch (err: any) {
        const reason = classifyAPIError(err, "Mistral");
        console.warn(`[Mistral] ${model} failed: ${reason}`);
        allErrors.push(`Mistral/${model}: ${reason}`);
        const status: number = err?.status || err?.statusCode || 0;
        if (status === 401 || status === 403) { console.warn("[Mistral] Auth error — skipping remaining Mistral models"); break; }
      }
    }
  } else {
    console.warn("[Mistral] MISTRAL_API_KEY not configured — skipping Mistral.");
  }

  // ── 2. xAI (fallback) ──
  try {
    const xai = getXAI();
    for (const model of XAI_MODELS) {
      try {
        console.log(`[xAI] Trying model: ${model}`);
        const resp = await xai.chat.completions.create({ model, messages, temperature, max_tokens: maxTokens });
        const content = resp.choices[0]?.message?.content || "";
        if (content) { console.log(`[xAI] Success with: ${model}`); return content; }
        console.warn(`[xAI] ${model} returned empty content`);
      } catch (err: any) {
        const reason = classifyAPIError(err, "xAI");
        console.warn(`[xAI] ${model} failed: ${reason}`);
        allErrors.push(`xAI/${model}: ${reason}`);
        const status: number = err?.status || err?.statusCode || 0;
        if (status === 401 || status === 403) { console.warn("[xAI] Auth error — skipping remaining xAI models"); break; }
      }
    }
  } catch (xaiInitErr: any) {
    allErrors.push(`xAI init: ${xaiInitErr?.message}`);
  }

  throw new Error(`All AI providers failed.\n${allErrors.join("\n")}`);
}

// Backward-compat alias — all existing callXAI() calls below now go through the unified callAI()
const callXAI = callAI;


async function callXAIResponses(input: string): Promise<string> {
  const key = resolveAPIKey();
  if (!key) throw new Error("XAI_API_KEY is not set.");

  const response = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify({
      model: "grok-build-0.1",
      input: input
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Responses API failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const resJson = await response.json();
  let content = "";
  if (resJson.output && Array.isArray(resJson.output)) {
    for (const out of resJson.output) {
      if (out.content && Array.isArray(out.content)) {
        for (const item of out.content) {
          if (item.text) {
            content += item.text;
          }
        }
      }
    }
  }

  if (!content) {
    throw new Error("No content returned in Responses API output.");
  }

  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────
export interface ExtractedSkills {
  technical: string[];
  programming: string[];
  tools: string[];
  certifications: string[];
  projects: string[];
  education: string[];
  soft: string[];
  allSkills: string[];
}

export interface MCQQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export interface GrokResumeReview {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  extractedSkills: ExtractedSkills;
  breakdown: Partial<{
    skillsScore: number;
    projectsScore: number;
    educationScore: number;
    certificationsScore: number;
    formattingScore: number;
    technicalSkills: number;
    projects: number;
    education: number;
    certifications: number;
    formatting: number;
    contactInfo: number;
    professionalSummary: number;
    actionVerbs: number;
    quantifiedAchievements: number;
    softSkills: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill vocabulary — regex pattern → [category, displayName]
// ─────────────────────────────────────────────────────────────────────────────
type SkillCat = "programming" | "technical" | "tools" | "soft" | "cert";

const SKILL_VOCAB: [string, SkillCat, string][] = [
  // Programming Languages
  ["python3?",                         "programming", "Python"],
  ["javascript|\\bjs\\b",              "programming", "JavaScript"],
  ["typescript|\\bts\\b",              "programming", "TypeScript"],
  ["\\bjava\\b",                       "programming", "Java"],
  ["c\\+\\+|\\bcpp\\b",               "programming", "C++"],
  ["c#|csharp",                        "programming", "C#"],
  ["\\bc\\b",                          "programming", "C"],
  ["golang|\\bgo\\b",                  "programming", "Go"],
  ["\\brust\\b",                       "programming", "Rust"],
  ["\\bruby\\b",                       "programming", "Ruby"],
  ["\\bphp\\b",                        "programming", "PHP"],
  ["\\bswift\\b",                      "programming", "Swift"],
  ["\\bkotlin\\b",                     "programming", "Kotlin"],
  ["\\bdart\\b",                       "programming", "Dart"],
  ["\\bscala\\b",                      "programming", "Scala"],
  ["\\bperl\\b",                       "programming", "Perl"],
  ["bash|shell script",                "programming", "Bash/Shell"],
  ["matlab",                           "programming", "MATLAB"],
  ["r programming",                    "programming", "R"],
  ["html5?",                           "programming", "HTML"],
  ["css3?",                            "programming", "CSS"],
  ["\\bsql\\b",                        "programming", "SQL"],

  // Frontend
  ["react\\.?js|reactjs|\\breact\\b",  "technical", "React"],
  ["next\\.?js|nextjs",                "technical", "Next.js"],
  ["angular\\.?js|\\bangular\\b",      "technical", "Angular"],
  ["vue\\.?js|vuejs|\\bvue\\b",        "technical", "Vue.js"],
  ["svelte",                           "technical", "Svelte"],
  ["redux",                            "technical", "Redux"],
  ["tailwind",                         "technical", "Tailwind CSS"],
  ["bootstrap",                        "technical", "Bootstrap"],
  ["sass|scss",                        "technical", "SASS/SCSS"],
  ["jquery",                           "technical", "jQuery"],
  ["three\\.?js",                      "technical", "Three.js"],
  ["material.?ui|\\bmui\\b",           "technical", "Material UI"],
  ["chakra.?ui",                       "technical", "Chakra UI"],
  ["shadcn",                           "technical", "shadcn/ui"],
  ["framer.?motion",                   "technical", "Framer Motion"],

  // Backend
  ["node\\.?js|nodejs",                "technical", "Node.js"],
  ["express\\.?js|\\bexpress\\b",      "technical", "Express.js"],
  ["\\bdjango\\b",                     "technical", "Django"],
  ["\\bflask\\b",                      "technical", "Flask"],
  ["fastapi",                          "technical", "FastAPI"],
  ["spring.?boot",                     "technical", "Spring Boot"],
  ["\\blaravel\\b",                    "technical", "Laravel"],
  ["nest\\.?js|nestjs",                "technical", "NestJS"],
  ["\\bfastify\\b",                    "technical", "Fastify"],
  ["ruby on rails|\\brails\\b",        "technical", "Ruby on Rails"],
  ["graphql",                          "technical", "GraphQL"],
  ["rest.?api|restful",                "technical", "REST API"],
  ["websocket|socket\\.?io",           "technical", "WebSockets"],
  ["\\bgrpc\\b",                       "technical", "gRPC"],
  ["\\bflutter\\b",                    "technical", "Flutter"],
  ["react.?native",                    "technical", "React Native"],

  // Databases
  ["postgresql|postgres",              "tools", "PostgreSQL"],
  ["mysql",                            "tools", "MySQL"],
  ["mongodb|\\bmongo\\b",              "tools", "MongoDB"],
  ["sqlite",                           "tools", "SQLite"],
  ["\\bredis\\b",                      "tools", "Redis"],
  ["cassandra",                        "tools", "Cassandra"],
  ["dynamodb",                         "tools", "DynamoDB"],
  ["firebase",                         "tools", "Firebase"],
  ["supabase",                         "tools", "Supabase"],
  ["elasticsearch",                    "tools", "Elasticsearch"],
  ["\\bprisma\\b",                     "tools", "Prisma"],
  ["mongoose",                         "tools", "Mongoose"],
  ["typeorm",                          "tools", "TypeORM"],
  ["sequelize",                        "tools", "Sequelize"],

  // Cloud & DevOps
  ["\\baws\\b|amazon web services",    "tools", "AWS"],
  ["\\bgcp\\b|google cloud",           "tools", "GCP"],
  ["\\bazure\\b",                      "tools", "Azure"],
  ["docker",                           "tools", "Docker"],
  ["kubernetes|\\bk8s\\b",             "tools", "Kubernetes"],
  ["terraform",                        "tools", "Terraform"],
  ["jenkins",                          "tools", "Jenkins"],
  ["github.?actions",                  "tools", "GitHub Actions"],
  ["gitlab.?ci",                       "tools", "GitLab CI"],
  ["ci/?cd|cicd",                      "tools", "CI/CD"],
  ["nginx",                            "tools", "Nginx"],
  ["linux|ubuntu|debian|centos",       "tools", "Linux"],
  ["vercel",                           "tools", "Vercel"],
  ["netlify",                          "tools", "Netlify"],
  ["heroku",                           "tools", "Heroku"],
  ["ansible",                          "tools", "Ansible"],

  // AI / ML
  ["machine.?learning|\\bml\\b",       "technical", "Machine Learning"],
  ["deep.?learning",                   "technical", "Deep Learning"],
  ["tensorflow",                       "technical", "TensorFlow"],
  ["pytorch",                          "technical", "PyTorch"],
  ["keras",                            "technical", "Keras"],
  ["scikit.?learn|sklearn",            "technical", "Scikit-learn"],
  ["pandas",                           "technical", "Pandas"],
  ["numpy",                            "technical", "NumPy"],
  ["opencv",                           "technical", "OpenCV"],
  ["hugging.?face",                    "technical", "Hugging Face"],
  ["langchain",                        "technical", "LangChain"],
  ["\\bnlp\\b",                        "technical", "NLP"],
  ["computer.?vision",                 "technical", "Computer Vision"],

  // Tools
  ["\\bgit\\b",                        "tools", "Git"],
  ["github",                           "tools", "GitHub"],
  ["gitlab",                           "tools", "GitLab"],
  ["bitbucket",                        "tools", "Bitbucket"],
  ["\\bjira\\b",                       "tools", "Jira"],
  ["figma",                            "tools", "Figma"],
  ["postman",                          "tools", "Postman"],
  ["swagger|openapi",                  "tools", "Swagger"],
  ["jupyter",                          "tools", "Jupyter"],
  ["tableau",                          "tools", "Tableau"],
  ["power.?bi",                        "tools", "Power BI"],
  ["\\bkafka\\b",                      "tools", "Apache Kafka"],
  ["rabbitmq",                         "tools", "RabbitMQ"],
  ["webpack",                          "tools", "Webpack"],
  ["\\bvite\\b",                       "tools", "Vite"],
  ["\\bjest\\b",                       "tools", "Jest"],
  ["cypress",                          "tools", "Cypress"],
  ["selenium",                         "tools", "Selenium"],
  ["playwright",                       "tools", "Playwright"],
  ["stripe",                           "tools", "Stripe"],

  // Soft Skills
  ["leadership",                       "soft", "Leadership"],
  ["communication",                    "soft", "Communication"],
  ["teamwork|team player",             "soft", "Teamwork"],
  ["problem.?solving",                 "soft", "Problem Solving"],
  ["critical.?thinking",               "soft", "Critical Thinking"],
  ["\\bagile\\b",                      "soft", "Agile"],
  ["\\bscrum\\b",                      "soft", "Scrum"],
  ["time.?management",                 "soft", "Time Management"],
  ["collaboration",                    "soft", "Collaboration"],

  // Certifications
  ["aws.?certified",                   "cert", "AWS Certified"],
  ["google.?cloud.?cert",              "cert", "Google Cloud Certified"],
  ["azure.?cert",                      "cert", "Azure Certified"],
  ["coursera",                         "cert", "Coursera Certificate"],
  ["udemy",                            "cert", "Udemy Certificate"],
  ["\\bnptel\\b",                      "cert", "NPTEL Certificate"],
  ["certif",                           "cert", "Certification"],
];

// Exported so the MCQ route can also use it
export function extractAllSkillsFromText(rawText: string): {
  programming: string[];
  technical: string[];
  tools: string[];
  soft: string[];
  certifications: string[];
  allSkills: string[];
} {
  const found: Record<SkillCat, Set<string>> = {
    programming: new Set(),
    technical: new Set(),
    tools: new Set(),
    soft: new Set(),
    cert: new Set(),
  };

  for (const [pattern, category, displayName] of SKILL_VOCAB) {
    try {
      if (new RegExp(pattern, "i").test(rawText)) {
        found[category].add(displayName);
      }
    } catch {
      // ignore invalid regex
    }
  }

  const programming = Array.from(found.programming);
  const technical   = Array.from(found.technical);
  const tools       = Array.from(found.tools);
  const soft        = Array.from(found.soft);
  const certifications = Array.from(found.cert);
  const allSkills   = [...new Set([...programming, ...technical, ...tools])];

  return { programming, technical, tools, soft, certifications, allSkills };
}

// ─────────────────────────────────────────────────────────────────────────────
// Curated MCQ Bank
// ─────────────────────────────────────────────────────────────────────────────
const MCQ_BANK: Record<string, MCQQuestion[]> = {
  react: [
    { question: "What is the Virtual DOM in React?", options: ["A copy of the real DOM kept in memory", "A DOM used only for server rendering", "A simplified version of HTML", "A browser API for fast rendering"], answer: "A copy of the real DOM kept in memory", difficulty: "easy", topic: "React" },
    { question: "Which hook is used for side effects in React?", options: ["useEffect", "useState", "useContext", "useRef"], answer: "useEffect", difficulty: "easy", topic: "React" },
    { question: "What does React.memo do?", options: ["Memoizes a component to skip re-renders if props didn't change", "Stores a value in memory", "Caches API responses", "Prevents state updates"], answer: "Memoizes a component to skip re-renders if props didn't change", difficulty: "medium", topic: "React" },
    { question: "What is the purpose of useCallback hook?", options: ["Returns a memoized callback function", "Creates a side effect", "Manages state", "Provides context"], answer: "Returns a memoized callback function", difficulty: "medium", topic: "React" },
    { question: "What is React reconciliation?", options: ["The process of comparing old and new Virtual DOMs to update the real DOM", "Merging two React apps", "Syncing state across components", "Batching state updates"], answer: "The process of comparing old and new Virtual DOMs to update the real DOM", difficulty: "hard", topic: "React" },
    { question: "What is the Context API in React used for?", options: ["Sharing state globally without prop drilling", "Fetching API data", "Styling components", "Routing between pages"], answer: "Sharing state globally without prop drilling", difficulty: "medium", topic: "React" },
    { question: "What does the key prop do in React lists?", options: ["Helps React identify which items changed, are added, or removed", "Sets a CSS class on elements", "Creates a unique DOM ID", "Prevents re-rendering"], answer: "Helps React identify which items changed, are added, or removed", difficulty: "easy", topic: "React" },
    { question: "What is a controlled component in React?", options: ["A component where form data is controlled by React state", "A component with no props", "A component using Context", "A server-side rendered component"], answer: "A component where form data is controlled by React state", difficulty: "medium", topic: "React" },
  ],
  javascript: [
    { question: "What is the difference between let and var in JavaScript?", options: ["let is block-scoped, var is function-scoped", "var is block-scoped, let is function-scoped", "Both are globally scoped", "let is older than var"], answer: "let is block-scoped, var is function-scoped", difficulty: "easy", topic: "JavaScript" },
    { question: "What does the '===' operator do in JavaScript?", options: ["Checks value and type equality", "Checks only value equality", "Assigns a value", "Checks only type equality"], answer: "Checks value and type equality", difficulty: "easy", topic: "JavaScript" },
    { question: "What is a Promise in JavaScript?", options: ["An object representing the eventual completion or failure of an async operation", "A synchronous function", "A way to declare variables", "A loop structure"], answer: "An object representing the eventual completion or failure of an async operation", difficulty: "medium", topic: "JavaScript" },
    { question: "What is event bubbling?", options: ["When an event propagates from child to parent elements", "When an event fires multiple times", "When events are queued", "When a click fires a scroll"], answer: "When an event propagates from child to parent elements", difficulty: "medium", topic: "JavaScript" },
    { question: "What is the JavaScript event loop?", options: ["A mechanism that handles async operations using a call stack and task queue", "A for loop for DOM events", "A way to iterate over arrays", "A pattern for state management"], answer: "A mechanism that handles async operations using a call stack and task queue", difficulty: "hard", topic: "JavaScript" },
    { question: "What is closure in JavaScript?", options: ["A function that has access to its outer scope variables even after the outer function returns", "A way to close a browser window", "A method to end a loop", "A type of class"], answer: "A function that has access to its outer scope variables even after the outer function returns", difficulty: "hard", topic: "JavaScript" },
    { question: "What does Array.prototype.reduce() do?", options: ["Reduces an array to a single value by executing a reducer function", "Removes duplicates from an array", "Filters array elements", "Maps array elements to new values"], answer: "Reduces an array to a single value by executing a reducer function", difficulty: "medium", topic: "JavaScript" },
    { question: "What is the difference between null and undefined?", options: ["null is an assigned empty value; undefined means variable was declared but not assigned", "They are identical", "undefined is assigned; null is unassigned", "null is a type; undefined is a value"], answer: "null is an assigned empty value; undefined means variable was declared but not assigned", difficulty: "easy", topic: "JavaScript" },
  ],
  typescript: [
    { question: "What is TypeScript?", options: ["A typed superset of JavaScript that compiles to plain JavaScript", "A new language unrelated to JavaScript", "A JavaScript testing framework", "A CSS preprocessor"], answer: "A typed superset of JavaScript that compiles to plain JavaScript", difficulty: "easy", topic: "TypeScript" },
    { question: "What is an interface in TypeScript?", options: ["A contract that defines the structure of an object", "A class with no methods", "A built-in function", "A module system"], answer: "A contract that defines the structure of an object", difficulty: "easy", topic: "TypeScript" },
    { question: "What is the difference between 'any' and 'unknown' in TypeScript?", options: ["unknown requires type checking before use, any does not", "They are identical", "any is safer than unknown", "unknown is deprecated"], answer: "unknown requires type checking before use, any does not", difficulty: "medium", topic: "TypeScript" },
    { question: "What are generics in TypeScript?", options: ["A way to create reusable components that work with multiple types", "Built-in utility types", "A way to define enums", "Abstract classes"], answer: "A way to create reusable components that work with multiple types", difficulty: "medium", topic: "TypeScript" },
    { question: "What is a discriminated union in TypeScript?", options: ["A union type with a common literal property used to narrow types", "A union of primitive types only", "A way to merge interfaces", "A type alias for functions"], answer: "A union type with a common literal property used to narrow types", difficulty: "hard", topic: "TypeScript" },
    { question: "What does 'readonly' do in TypeScript?", options: ["Prevents a property from being reassigned after initialization", "Makes a function synchronous", "Declares a constant variable", "Creates a read-only database"], answer: "Prevents a property from being reassigned after initialization", difficulty: "medium", topic: "TypeScript" },
  ],
  nodejs: [
    { question: "What is Node.js?", options: ["A JavaScript runtime built on Chrome's V8 engine", "A front-end JavaScript framework", "A database", "A CSS preprocessor"], answer: "A JavaScript runtime built on Chrome's V8 engine", difficulty: "easy", topic: "Node.js" },
    { question: "What is middleware in Express.js?", options: ["Functions that execute during the request-response cycle", "Database connection handlers", "Front-end components", "Test runners"], answer: "Functions that execute during the request-response cycle", difficulty: "easy", topic: "Node.js" },
    { question: "What does npm stand for?", options: ["Node Package Manager", "New Programming Module", "Node Process Manager", "Network Protocol Module"], answer: "Node Package Manager", difficulty: "easy", topic: "Node.js" },
    { question: "What is the purpose of package.json?", options: ["Defines project metadata and dependencies", "Stores environment variables", "Manages database schemas", "Configures the web server"], answer: "Defines project metadata and dependencies", difficulty: "medium", topic: "Node.js" },
    { question: "What is the EventEmitter in Node.js?", options: ["A class that enables event-driven programming using emit/on patterns", "A built-in HTTP server", "A file system module", "A timer utility"], answer: "A class that enables event-driven programming using emit/on patterns", difficulty: "medium", topic: "Node.js" },
    { question: "What is the difference between process.nextTick() and setImmediate()?", options: ["nextTick fires before I/O events, setImmediate fires after I/O events", "They are identical", "setImmediate fires first always", "nextTick is deprecated"], answer: "nextTick fires before I/O events, setImmediate fires after I/O events", difficulty: "hard", topic: "Node.js" },
  ],
  nextjs: [
    { question: "What is Next.js?", options: ["A React framework for server-side rendering and static site generation", "A CSS framework", "A database ORM", "A testing framework"], answer: "A React framework for server-side rendering and static site generation", difficulty: "easy", topic: "Next.js" },
    { question: "What is the difference between SSR and SSG in Next.js?", options: ["SSR renders on every request; SSG renders at build time", "SSG renders on every request; SSR renders at build time", "They are identical", "SSR is client-side only"], answer: "SSR renders on every request; SSG renders at build time", difficulty: "medium", topic: "Next.js" },
    { question: "What is the App Router in Next.js 13+?", options: ["A new routing system using /app directory with React Server Components", "A third-party routing library", "A client-side router only", "A navigation component"], answer: "A new routing system using /app directory with React Server Components", difficulty: "medium", topic: "Next.js" },
    { question: "What are React Server Components?", options: ["Components that run on the server and send HTML without JavaScript bundle", "Components that only run in the browser", "Components stored in a server database", "Components with server-only state"], answer: "Components that run on the server and send HTML without JavaScript bundle", difficulty: "hard", topic: "Next.js" },
    { question: "What is the purpose of getStaticProps?", options: ["Fetches data at build time for static generation", "Fetches data on every server request", "Fetches data on the client side", "Validates form inputs"], answer: "Fetches data at build time for static generation", difficulty: "medium", topic: "Next.js" },
  ],
  python: [
    { question: "What is a list comprehension in Python?", options: ["A concise way to create lists using an expression", "A method to sort lists", "A way to import modules", "A type of loop"], answer: "A concise way to create lists using an expression", difficulty: "easy", topic: "Python" },
    { question: "What is the difference between a list and a tuple in Python?", options: ["Lists are mutable, tuples are immutable", "Tuples are mutable, lists are immutable", "Both are mutable", "Both are immutable"], answer: "Lists are mutable, tuples are immutable", difficulty: "easy", topic: "Python" },
    { question: "What is a decorator in Python?", options: ["A function that wraps another function to extend its behavior", "A CSS-like styling function", "A class attribute", "A module importer"], answer: "A function that wraps another function to extend its behavior", difficulty: "medium", topic: "Python" },
    { question: "What is the GIL in Python?", options: ["Global Interpreter Lock that allows only one thread to execute Python bytecode at a time", "Global Import Library", "A garbage collection mechanism", "A network protocol"], answer: "Global Interpreter Lock that allows only one thread to execute Python bytecode at a time", difficulty: "hard", topic: "Python" },
    { question: "What is a generator in Python?", options: ["A function that uses yield to return values lazily one at a time", "A class that creates objects", "A module for random numbers", "A built-in sorting algorithm"], answer: "A function that uses yield to return values lazily one at a time", difficulty: "medium", topic: "Python" },
    { question: "What does __init__ do in a Python class?", options: ["Initializes a new instance of the class", "Destroys an instance", "Imports a module", "Defines a static method"], answer: "Initializes a new instance of the class", difficulty: "easy", topic: "Python" },
    { question: "What is the difference between deepcopy and copy in Python?", options: ["deepcopy creates a fully independent copy; copy creates a shallow copy", "They are identical", "copy is deeper than deepcopy", "deepcopy only works on lists"], answer: "deepcopy creates a fully independent copy; copy creates a shallow copy", difficulty: "hard", topic: "Python" },
  ],
  java: [
    { question: "What is the difference between JDK, JRE, and JVM?", options: ["JDK is for development, JRE is for running Java, JVM executes bytecode", "They are all the same", "JVM is for development", "JRE is the compiler"], answer: "JDK is for development, JRE is for running Java, JVM executes bytecode", difficulty: "easy", topic: "Java" },
    { question: "What is polymorphism in Java?", options: ["An object's ability to take many forms through method overriding/overloading", "A way to hide class fields", "A design pattern", "A memory management technique"], answer: "An object's ability to take many forms through method overriding/overloading", difficulty: "medium", topic: "Java" },
    { question: "What is the purpose of the 'final' keyword in Java?", options: ["Makes variables constant, methods non-overridable, and classes non-inheritable", "Marks the end of a method", "Declares a static field", "Handles exceptions"], answer: "Makes variables constant, methods non-overridable, and classes non-inheritable", difficulty: "medium", topic: "Java" },
    { question: "What is the difference between HashMap and Hashtable?", options: ["HashMap is unsynchronized and allows null keys; Hashtable is synchronized", "They are identical", "Hashtable is faster", "HashMap is thread-safe"], answer: "HashMap is unsynchronized and allows null keys; Hashtable is synchronized", difficulty: "hard", topic: "Java" },
    { question: "What is the difference between abstract class and interface in Java?", options: ["Abstract class can have concrete methods; interface (before Java 8) only has abstract methods", "They are identical", "Interface can have constructors", "Abstract class cannot be extended"], answer: "Abstract class can have concrete methods; interface (before Java 8) only has abstract methods", difficulty: "hard", topic: "Java" },
  ],
  css: [
    { question: "What does CSS stand for?", options: ["Cascading Style Sheets", "Computer Style System", "Creative Style Syntax", "Coded Style Sheets"], answer: "Cascading Style Sheets", difficulty: "easy", topic: "CSS" },
    { question: "What is the CSS box model?", options: ["Content, padding, border, and margin around an element", "A layout grid system", "A flexbox container", "A media query"], answer: "Content, padding, border, and margin around an element", difficulty: "easy", topic: "CSS" },
    { question: "What is the difference between flexbox and CSS Grid?", options: ["Flexbox is 1D layout, Grid is 2D layout", "Grid is 1D, flexbox is 2D", "They are identical", "Flexbox only works in Chrome"], answer: "Flexbox is 1D layout, Grid is 2D layout", difficulty: "medium", topic: "CSS" },
    { question: "What does 'position: absolute' do in CSS?", options: ["Removes element from normal flow and positions relative to nearest positioned ancestor", "Fixes element to viewport", "Keeps element in normal flow", "Hides the element"], answer: "Removes element from normal flow and positions relative to nearest positioned ancestor", difficulty: "medium", topic: "CSS" },
    { question: "What is z-index in CSS?", options: ["Controls the stacking order of positioned elements", "Sets the zoom level", "Defines animation speed", "Controls opacity"], answer: "Controls the stacking order of positioned elements", difficulty: "easy", topic: "CSS" },
  ],
  sql: [
    { question: "What does SQL stand for?", options: ["Structured Query Language", "Simple Query Logic", "System Query Language", "Sequential Query Logic"], answer: "Structured Query Language", difficulty: "easy", topic: "SQL" },
    { question: "What is a JOIN in SQL?", options: ["A clause to combine rows from two or more tables based on a related column", "A way to delete records", "A method to sort results", "An aggregation function"], answer: "A clause to combine rows from two or more tables based on a related column", difficulty: "easy", topic: "SQL" },
    { question: "What is the difference between INNER JOIN and LEFT JOIN?", options: ["INNER JOIN returns only matched rows; LEFT JOIN returns all rows from left table plus matched from right", "LEFT JOIN returns only matched rows", "They are identical", "INNER JOIN includes all rows from both tables"], answer: "INNER JOIN returns only matched rows; LEFT JOIN returns all rows from left table plus matched from right", difficulty: "medium", topic: "SQL" },
    { question: "What is a database index?", options: ["A data structure that speeds up data retrieval operations on a table", "A primary key constraint", "A foreign key reference", "A table backup"], answer: "A data structure that speeds up data retrieval operations on a table", difficulty: "medium", topic: "SQL" },
    { question: "What is database normalization?", options: ["Organizing tables to reduce redundancy and improve data integrity", "Optimizing query performance", "Encrypting database data", "Backing up data"], answer: "Organizing tables to reduce redundancy and improve data integrity", difficulty: "hard", topic: "SQL" },
  ],
  mongodb: [
    { question: "Which command inserts a document in MongoDB?", options: ["insertOne()", "addDocument()", "push()", "create()"], answer: "insertOne()", difficulty: "easy", topic: "MongoDB" },
    { question: "What type of database is MongoDB?", options: ["NoSQL document database", "Relational database", "Graph database", "Key-value store"], answer: "NoSQL document database", difficulty: "easy", topic: "MongoDB" },
    { question: "What is the aggregation pipeline in MongoDB?", options: ["A framework to process data through stages and return computed results", "A method to insert multiple documents", "A way to connect collections", "A backup strategy"], answer: "A framework to process data through stages and return computed results", difficulty: "medium", topic: "MongoDB" },
    { question: "What is sharding in MongoDB?", options: ["Horizontal scaling by distributing data across multiple machines", "Vertically scaling the database server", "Splitting a collection into files", "Encrypting the database"], answer: "Horizontal scaling by distributing data across multiple machines", difficulty: "hard", topic: "MongoDB" },
    { question: "What is mongoose?", options: ["An ODM (Object Document Mapper) for MongoDB in Node.js", "A MongoDB GUI tool", "A caching layer", "A testing framework"], answer: "An ODM (Object Document Mapper) for MongoDB in Node.js", difficulty: "easy", topic: "MongoDB" },
  ],
  git: [
    { question: "What does 'git commit' do?", options: ["Saves staged changes to the local repository", "Pushes changes to remote", "Pulls changes from remote", "Merges branches"], answer: "Saves staged changes to the local repository", difficulty: "easy", topic: "Git" },
    { question: "What is the difference between git merge and git rebase?", options: ["Merge creates a merge commit, rebase rewrites commit history", "They are identical", "Rebase creates a merge commit", "Merge rewrites history"], answer: "Merge creates a merge commit, rebase rewrites commit history", difficulty: "medium", topic: "Git" },
    { question: "What does 'git stash' do?", options: ["Temporarily saves uncommitted changes to a stack", "Deletes all changes", "Creates a new branch", "Reverts the last commit"], answer: "Temporarily saves uncommitted changes to a stack", difficulty: "easy", topic: "Git" },
    { question: "What is 'git cherry-pick'?", options: ["Applies a specific commit from one branch to another", "Selects files to commit", "Chooses a merge strategy", "Picks the best branch"], answer: "Applies a specific commit from one branch to another", difficulty: "hard", topic: "Git" },
  ],
  docker: [
    { question: "What is a Docker container?", options: ["A lightweight, standalone executable package that includes code and dependencies", "A virtual machine", "A cloud server", "A database instance"], answer: "A lightweight, standalone executable package that includes code and dependencies", difficulty: "easy", topic: "Docker" },
    { question: "What is the difference between a Docker image and a container?", options: ["An image is a blueprint; a container is a running instance of an image", "They are the same thing", "A container is a blueprint", "Images run on the host OS directly"], answer: "An image is a blueprint; a container is a running instance of an image", difficulty: "medium", topic: "Docker" },
    { question: "What does 'docker-compose' do?", options: ["Defines and runs multi-container Docker applications", "Builds a single Docker image", "Pushes images to Docker Hub", "Manages Docker networking only"], answer: "Defines and runs multi-container Docker applications", difficulty: "medium", topic: "Docker" },
    { question: "What is a Dockerfile?", options: ["A text file containing instructions to build a Docker image", "A Docker configuration dashboard", "A runtime container log", "A networking config file"], answer: "A text file containing instructions to build a Docker image", difficulty: "easy", topic: "Docker" },
  ],
  aws: [
    { question: "What is Amazon S3?", options: ["A scalable object storage service", "A compute service", "A relational database", "A networking service"], answer: "A scalable object storage service", difficulty: "easy", topic: "AWS" },
    { question: "What is the difference between EC2 and Lambda?", options: ["EC2 is a virtual server; Lambda is serverless compute that runs on events", "They are identical services", "Lambda is a virtual machine", "EC2 is serverless"], answer: "EC2 is a virtual server; Lambda is serverless compute that runs on events", difficulty: "medium", topic: "AWS" },
    { question: "What is IAM in AWS?", options: ["Identity and Access Management — controls who can access AWS resources", "Internet Availability Monitor", "Instance Auto Manager", "Internal Audit Module"], answer: "Identity and Access Management — controls who can access AWS resources", difficulty: "easy", topic: "AWS" },
  ],
  flutter: [
    { question: "What is Flutter?", options: ["Google's UI toolkit for building natively compiled apps from a single codebase", "A JavaScript mobile framework", "An iOS-only tool", "A CSS framework"], answer: "Google's UI toolkit for building natively compiled apps from a single codebase", difficulty: "easy", topic: "Flutter" },
    { question: "What language does Flutter use?", options: ["Dart", "JavaScript", "Kotlin", "Swift"], answer: "Dart", difficulty: "easy", topic: "Flutter" },
    { question: "What is a StatefulWidget in Flutter?", options: ["A widget that holds mutable state that can change over time", "A widget with no state", "A widget for HTTP calls only", "A layout widget"], answer: "A widget that holds mutable state that can change over time", difficulty: "medium", topic: "Flutter" },
    { question: "What is Provider in Flutter?", options: ["A state management solution using InheritedWidget", "A network HTTP client", "A database ORM", "A routing package"], answer: "A state management solution using InheritedWidget", difficulty: "hard", topic: "Flutter" },
  ],
  machinelearning: [
    { question: "What is supervised learning?", options: ["Training a model on labeled data to predict outputs for new inputs", "Training without any data labels", "Learning by reinforcement", "Clustering unlabeled data"], answer: "Training a model on labeled data to predict outputs for new inputs", difficulty: "easy", topic: "Machine Learning" },
    { question: "What is overfitting in machine learning?", options: ["When a model performs well on training data but poorly on unseen test data", "When a model learns too slowly", "When training data is too small", "When the model never converges"], answer: "When a model performs well on training data but poorly on unseen test data", difficulty: "medium", topic: "Machine Learning" },
    { question: "What is gradient descent?", options: ["An optimization algorithm that minimizes a function by iteratively moving in the direction of steepest descent", "A way to visualize data", "A neural network layer type", "A data preprocessing step"], answer: "An optimization algorithm that minimizes a function by iteratively moving in the direction of steepest descent", difficulty: "medium", topic: "Machine Learning" },
    { question: "What is the difference between precision and recall?", options: ["Precision = correct positives / predicted positives; recall = correct positives / actual positives", "They are the same metric", "Recall measures accuracy on negatives", "Precision only applies to binary classification"], answer: "Precision = correct positives / predicted positives; recall = correct positives / actual positives", difficulty: "hard", topic: "Machine Learning" },
  ],
  firebase: [
    { question: "What is Firebase?", options: ["Google's Backend-as-a-Service platform with database, auth, and hosting", "A JavaScript framework", "A SQL database", "A CSS library"], answer: "Google's Backend-as-a-Service platform with database, auth, and hosting", difficulty: "easy", topic: "Firebase" },
    { question: "What is the difference between Firestore and Realtime Database?", options: ["Firestore is a newer document database with richer queries; Realtime Database is a simpler JSON tree", "They are identical", "Realtime Database uses SQL", "Firestore is for mobile only"], answer: "Firestore is a newer document database with richer queries; Realtime Database is a simpler JSON tree", difficulty: "medium", topic: "Firebase" },
    { question: "What are Firebase Cloud Functions?", options: ["Serverless functions that run backend code in response to Firebase events or HTTP requests", "Client-side JavaScript functions", "Database triggers only", "CSS animation utilities"], answer: "Serverless functions that run backend code in response to Firebase events or HTTP requests", difficulty: "medium", topic: "Firebase" },
  ],
  html: [
    { question: "What does HTML stand for?", options: ["HyperText Markup Language", "High Text Markup Language", "HyperText Machine Language", "Hyper Transfer Markup Language"], answer: "HyperText Markup Language", difficulty: "easy", topic: "HTML" },
    { question: "What is the purpose of semantic HTML?", options: ["Using meaningful tags that describe content structure for accessibility and SEO", "Making HTML look pretty", "Adding JavaScript functionality", "Styling elements without CSS"], answer: "Using meaningful tags that describe content structure for accessibility and SEO", difficulty: "easy", topic: "HTML" },
    { question: "What is the difference between div and span in HTML?", options: ["div is a block-level element; span is an inline element", "span is block-level; div is inline", "They are identical", "div can only hold text"], answer: "div is a block-level element; span is an inline element", difficulty: "easy", topic: "HTML" },
    { question: "What is the purpose of the meta viewport tag in HTML?", options: ["Controls how the browser scales and renders the page on mobile devices", "Sets page metadata for SEO only", "Links CSS stylesheets", "Defines page encoding"], answer: "Controls how the browser scales and renders the page on mobile devices", difficulty: "medium", topic: "HTML" },
  ],
};

const GENERAL_QUESTIONS: MCQQuestion[] = [
  { question: "What is the time complexity of binary search?", options: ["O(log n)", "O(n)", "O(n²)", "O(1)"], answer: "O(log n)", difficulty: "medium", topic: "DSA" },
  { question: "What is REST API?", options: ["An architectural style for designing networked applications using HTTP", "A database protocol", "A JavaScript framework", "A testing methodology"], answer: "An architectural style for designing networked applications using HTTP", difficulty: "easy", topic: "Web" },
  { question: "What is a stack data structure?", options: ["A LIFO (Last In, First Out) structure", "A FIFO structure", "A sorted list", "A hash-based collection"], answer: "A LIFO (Last In, First Out) structure", difficulty: "easy", topic: "DSA" },
  { question: "What is object-oriented programming?", options: ["A paradigm based on objects containing data and methods", "A functional programming style", "A scripting methodology", "A database design pattern"], answer: "A paradigm based on objects containing data and methods", difficulty: "easy", topic: "OOP" },
  { question: "What is the difference between TCP and UDP?", options: ["TCP is connection-oriented and reliable; UDP is connectionless and faster", "UDP guarantees delivery", "TCP is faster than UDP", "They are identical protocols"], answer: "TCP is connection-oriented and reliable; UDP is connectionless and faster", difficulty: "medium", topic: "Networking" },
  { question: "What is Big O notation?", options: ["A mathematical notation to describe the upper bound of algorithm time complexity", "A code quality metric", "A database query language", "A design pattern"], answer: "A mathematical notation to describe the upper bound of algorithm time complexity", difficulty: "easy", topic: "DSA" },
  { question: "What is CI/CD?", options: ["Continuous Integration/Deployment — automating build, test, and deploy pipeline", "Cascading Inheritance/Code Deployment", "A programming paradigm", "A cloud provider"], answer: "Continuous Integration/Deployment — automating build, test, and deploy pipeline", difficulty: "medium", topic: "DevOps" },
  { question: "What is a deadlock in operating systems?", options: ["A situation where two or more processes wait indefinitely for each other to release resources", "A crashed process", "A memory leak", "A network timeout"], answer: "A situation where two or more processes wait indefinitely for each other to release resources", difficulty: "hard", topic: "OS" },
  { question: "What is SOLID in software engineering?", options: ["5 principles: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion", "A testing methodology", "A database schema design", "An agile framework"], answer: "5 principles: Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion", difficulty: "hard", topic: "Software Engineering" },
  { question: "What is a microservices architecture?", options: ["An approach where an application is built as a collection of small, independent services", "A monolithic application pattern", "A frontend rendering strategy", "A database sharding technique"], answer: "An approach where an application is built as a collection of small, independent services", difficulty: "hard", topic: "Architecture" },
];

// Skill name → bank key mapping
const SKILL_TO_BANK: Record<string, string> = {
  "react": "react", "react.js": "react", "reactjs": "react",
  "javascript": "javascript", "js": "javascript",
  "typescript": "typescript", "ts": "typescript",
  "node.js": "nodejs", "nodejs": "nodejs", "express.js": "nodejs", "express": "nodejs",
  "next.js": "nextjs", "nextjs": "nextjs",
  "python": "python", "django": "python", "flask": "python", "fastapi": "python",
  "java": "java", "spring": "java", "spring boot": "java",
  "css": "css", "html": "html", "tailwind css": "css", "bootstrap": "css",
  "sql": "sql", "postgresql": "sql", "mysql": "sql", "sqlite": "sql",
  "mongodb": "mongodb", "mongoose": "mongodb",
  "git": "git", "github": "git", "gitlab": "git",
  "docker": "docker", "kubernetes": "docker",
  "aws": "aws", "gcp": "aws", "azure": "aws",
  "flutter": "flutter", "dart": "flutter",
  "machine learning": "machinelearning", "deep learning": "machinelearning",
  "tensorflow": "machinelearning", "pytorch": "machinelearning", "ml": "machinelearning",
  "firebase": "firebase",
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildMCQsFromBank(skills: string[]): MCQQuestion[] {
  const questions: MCQQuestion[] = [];
  
  // Normalize and clean skills
  const uniqueSkills = [...new Set((skills || []).map(s => s.trim()).filter(Boolean))];
  
  // Fallback to standard skills if candidate has absolutely none listed
  if (uniqueSkills.length === 0) {
    uniqueSkills.push("JavaScript", "Python", "Git", "HTML", "CSS");
  }

  const matchedBanks: string[] = [];
  const unmatchedSkills: string[] = [];

  for (const skill of uniqueSkills) {
    const key = skill.toLowerCase().trim();
    // Direct match
    const directBank = SKILL_TO_BANK[key];
    if (directBank && MCQ_BANK[directBank]) {
      if (!matchedBanks.includes(directBank)) {
        matchedBanks.push(directBank);
      }
    } else {
      // Check partial match
      let foundPartial = false;
      for (const [keyword, bankKey] of Object.entries(SKILL_TO_BANK)) {
        if (
          MCQ_BANK[bankKey] &&
          (key.includes(keyword) || keyword.includes(key))
        ) {
          if (!matchedBanks.includes(bankKey)) {
            matchedBanks.push(bankKey);
          }
          foundPartial = true;
          break;
        }
      }
      if (!foundPartial) {
        unmatchedSkills.push(skill);
      }
    }
  }

  console.log("[MCQ Bank] Matched banks:", matchedBanks, "Unmatched skills:", unmatchedSkills);

  // 1. Gather questions from matched banks — filter out easy, sort hard -> medium first
  const bankQuestionsMap: Record<string, MCQQuestion[]> = {};
  for (const bankKey of matchedBanks) {
    const diffScore: Record<string, number> = { hard: 3, medium: 2, easy: 1 };
    // Exclude easy questions entirely, shuffle within each tier, then sort descending
    const filtered = MCQ_BANK[bankKey].filter(q => q.difficulty !== "easy");
    const shuffled = shuffleArray(filtered);
    bankQuestionsMap[bankKey] = shuffled.sort((a, b) => {
      const scoreA = diffScore[a.difficulty] || 1;
      const scoreB = diffScore[b.difficulty] || 1;
      return scoreB - scoreA; // hard first at index 0
    });
  }

  // Round-robin from matched banks — shift() takes from the front (hardest first)
  let addedFromBank = true;
  while (questions.length < 20 && addedFromBank) {
    addedFromBank = false;
    for (const bankKey of matchedBanks) {
      const q = bankQuestionsMap[bankKey].shift(); // shift = take from front (hardest)
      if (q) {
        if (!questions.find(existing => existing.question === q.question)) {
          questions.push(q);
        }
        addedFromBank = true;
      }
      if (questions.length >= 20) break;
    }
  }

  // 2. If we need more questions, generate them dynamically from the candidate's skills
  const allCandidateSkills = [...unmatchedSkills, ...uniqueSkills];
  const uniqueCandidateSkills = [...new Set(allCandidateSkills)];

  const dynamicTemplates = [
    {
      question: "When addressing concurrency or synchronization patterns in a multi-client {skill} environment, how should race conditions be mitigated?",
      options: [
        "By implementing transaction isolation, atomic locks, or distributed consensus strategies depending on the subsystem state.",
        "By running all application routines on a single block-scoped loop with no parallel workers.",
        "By delaying all database and API requests using arbitrary timeout limits at the client gateway.",
        "By disabling global exceptions and forcing memory pools to drop concurrent frames."
      ],
      difficulty: "hard" as const,
    },
    {
      question: "Which of the following describes a critical design pattern to prevent memory leaks or heap allocation issues during heavy utilization of {skill}?",
      options: [
        "Ensuring active garbage collection tracking, closing unused socket streams, and releasing reference handles properly.",
        "Pre-allocating a massive array partition and preventing the application from initializing new variables.",
        "Shifting all heap objects onto secondary storage partitions using file read-write streams.",
        "Using only local variables within inline asynchronous methods with no output parameters."
      ],
      difficulty: "hard" as const,
    },
    {
      question: "In high-performance deployments using {skill}, how can response time latency be optimized when the service handles CPU-bound operations?",
      options: [
        "Offloading execution to background worker threads, microservices, or implementing caching strategies.",
        "Increasing request timeout intervals at the network load balancer level.",
        "Restricting client payloads to minimal chunks and dropping requests that exceed limit boundaries.",
        "Compiling all dynamic calculations into pre-rendered static string buffers during build initialization."
      ],
      difficulty: "medium" as const,
    },
    {
      question: "When securing a {skill} system integration against cross-site scripting (XSS) or remote code execution, what strategy is recommended?",
      options: [
        "Validating/sanitizing inputs, enforcing content security policies (CSP), and utilizing parameterization.",
        "Restricting user input length to less than 15 alphanumeric characters globally.",
        "Exclusively encrypting the data output streams without verifying client request headers.",
        "Disabling CORS settings completely to prevent browser sandbox conflicts."
      ],
      difficulty: "hard" as const,
    },
    {
      question: "What pattern is recommended in {skill} to ensure system resiliency during downstream service outages?",
      options: [
        "Implementing circuit breakers, rate limiting, and defining structured retry policies with exponential backoff.",
        "Forcing a complete system restart automatically whenever a network error response code is encountered.",
        "Silently catching all exceptions and returning empty mock data objects to the client API.",
        "Allowing calls to queue infinitely until the target server registers a socket timeout."
      ],
      difficulty: "medium" as const,
    },
    {
      question: "What is a primary trade-off of introducing asynchronous architectural layers (such as event queues) to scale a {skill} codebase?",
      options: [
        "Increased system complexity, potential eventual consistency delays, and challenging distributed tracing.",
        "Permanent reduction of CPU performance and loss of local storage capability.",
        "Incompatibility with relational databases and standard HTTP request protocols.",
        "Requirement of modifying compile-time options on client-side modules."
      ],
      difficulty: "medium" as const,
    },
    {
      question: "In enterprise software using {skill}, why is dependency injection or loose coupling preferred for component design?",
      options: [
        "It enhances testability via mocking, simplifies code maintainability, and decouples interface definitions.",
        "It speeds up network data compression ratios and minimizes static source file size.",
        "It completely hides the codebase from unauthorized reverse-engineering tools.",
        "It forces the execution runtime to bypass compile-time parameter type checks."
      ],
      difficulty: "hard" as const,
    },
    {
      question: "To maintain environmental parity during a {skill} application deployment, how should environment configurations be managed?",
      options: [
        "Injecting configurations dynamically via container variables or secure cloud storage vaults at runtime.",
        "Hardcoding variables into separate config source files and committing them to the repository.",
        "Encrypting and checking in separate local build configurations directly into the main build scripts.",
        "Requiring developers to manually edit production setup files on the live host server."
      ],
      difficulty: "hard" as const,
    }
  ];

  let skillIndex = 0;
  let templateIndex = 0;
  const maxAttempts = 100;
  let attempts = 0;

  while (questions.length < 20 && attempts < maxAttempts) {
    attempts++;
    const currentSkill = uniqueCandidateSkills[skillIndex % uniqueCandidateSkills.length];
    const template = dynamicTemplates[templateIndex % dynamicTemplates.length];

    const questionText = template.question.replace(/{skill}/g, currentSkill);
    
    if (!questions.find(q => q.question === questionText)) {
      const answer = template.options[0];
      const shuffledOptions = shuffleArray(template.options);

      questions.push({
        question: questionText,
        options: shuffledOptions,
        answer: answer,
        difficulty: template.difficulty,
        topic: currentSkill
      });
    }

    skillIndex++;
    if (skillIndex % uniqueCandidateSkills.length === 0) {
      templateIndex++;
    }
  }

  // Shuffle final questions order
  const finalQuestions = shuffleArray(questions);

  // Shuffle options of all questions to ensure correct answers are at random positions
  return finalQuestions.map(q => {
    const options = [...q.options];
    const answer = q.answer;
    const shuffledOptions = shuffleArray(options);
    if (!shuffledOptions.includes(answer)) {
      shuffledOptions[0] = answer;
    }
    return {
      ...q,
      options: shuffledOptions
    };
  }).slice(0, 20);
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Description Semantic Matching
// ─────────────────────────────────────────────────────────────────────────────
export interface JDMatchResult {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: string;
  educationMatch: string;
  cultureFit: string;
  recommendations: string[];
}

export async function matchResumeToJob(resumeData: EnterpriseResumeData, jobDescription: string): Promise<JDMatchResult> {
  const prompt = `You are a Senior Talent Acquisition Specialist at a top MNC.
Your task is to semantically match the candidate's Enterprise Resume Data against the provided Job Description.

Candidate Resume Data (JSON):
${JSON.stringify(resumeData, null, 2)}

Job Description:
${jobDescription}

Return a detailed matching analysis strictly in this JSON format (NO MARKDOWN, NO OTHER TEXT):
{
  "matchScore": 85, // 0-100 percentage based on skills, experience, and education
  "matchedSkills": ["React", "TypeScript", "Agile"], // Skills present in both
  "missingSkills": ["Docker", "GraphQL"], // Skills required by JD but missing in resume
  "experienceMatch": "Detailed explanation of how candidate's experience aligns or falls short.",
  "educationMatch": "Explanation of education alignment.",
  "cultureFit": "Analysis of soft skills and cultural fit based on the JD.",
  "recommendations": ["Actionable step 1", "Actionable step 2"] // How to improve for this specific job
}
`;

  try {
    const content = await callXAI([
      { role: "system", content: "You are an expert technical recruiter and semantic matching engine. Output ONLY valid JSON." },
      { role: "user", content: prompt }
    ], 0.1, 3000);

    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object in response");

    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
    return {
      matchScore: parsed.matchScore || 0,
      matchedSkills: parsed.matchedSkills || [],
      missingSkills: parsed.missingSkills || [],
      experienceMatch: parsed.experienceMatch || "Not assessed.",
      educationMatch: parsed.educationMatch || "Not assessed.",
      cultureFit: parsed.cultureFit || "Not assessed.",
      recommendations: parsed.recommendations || []
    };
  } catch (error: any) {
    console.error("[ATS] Semantic matching failed:", error);
    return {
      matchScore: 0,
      matchedSkills: [],
      missingSkills: [],
      experienceMatch: "Failed to run semantic matching engine.",
      educationMatch: "Failed to run semantic matching engine.",
      cultureFit: "Failed to run semantic matching engine.",
      recommendations: ["Please try again later."]
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MCQ Generation
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMCQs(skills: string[], atsScore: number = 50): Promise<MCQQuestion[]> {
  if (!skills || skills.length === 0) return buildMCQsFromBank([]);

  const topSkills = skills.slice(0, 10);
  const skillsList = topSkills.join(", ");
  const randomSeed = Math.random().toString(36).substring(2, 10);

  const prompt = `You are a senior technical interviewer at a top MNC (Google, Microsoft, Amazon).

Generate exactly 20 multiple choice questions to assess the candidate's technical knowledge.

The candidate's skills: ${skillsList}
The candidate's ATS score: ${atsScore}/100 (Use this to adjust the baseline difficulty of the questions. Higher ATS means slightly more advanced nuances in the medium/hard questions).

Requirements:
- Generate questions ONLY about these skills: ${skillsList}
- Distribution: 0 easy, 8 medium, 12 hard questions. The questions should be highly challenging, focusing on advanced runtime behaviors, edge cases, scalability, memory management, and design trade-offs.
- Each question MUST have EXACTLY 4 options
- The options must be highly realistic and subtle. Make the distractors (incorrect options) extremely plausible technical scenarios or common misconceptions, so that only candidates with deep expertise can correctly identify the right answer.
- The "answer" field MUST exactly match one of the 4 options (copy-paste exact text)
- Mix conceptual and practical questions
- IMPORTANT: Ensure all questions are unique, creative, and different from previous generations. Use this randomness token: "${randomSeed}" to ensure a fresh generation. Avoid using the same templates. Use varied coding scenarios, edge cases, and architectural concepts.

Return ONLY this exact JSON (no markdown, no extra text):
{
  "questions": [
    {
      "question": "What is...",
      "options": ["Correct answer here", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
      "answer": "Correct answer here",
      "difficulty": "hard",
      "topic": "${topSkills[0] || "General"}"
    }
  ]
}`;

  const parseQuestions = (content: string): MCQQuestion[] => {
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");

    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
    const qs = (parsed.questions || []) as MCQQuestion[];

    return qs.filter(q =>
      q.question?.trim() &&
      Array.isArray(q.options) && q.options.length === 4 &&
      q.answer?.trim() &&
      q.options.some(opt => opt.trim() === q.answer.trim()) &&
      ["easy", "medium", "hard"].includes(q.difficulty)
    );
  };

  try {
    console.log("[MCQ] Calling Grok Responses API for skills:", skillsList, "with seed:", randomSeed);
    let content = "";
    try {
      // 1. Try Grok Responses API first (grok-build-0.1)
      content = await callXAIResponses(prompt);
      console.log("[MCQ] Grok Responses API call succeeded");
    } catch (respErr: any) {
      console.warn("[MCQ] Grok Responses API failed, falling back to Chat Completions:", respErr?.message);
      // 2. Fall back to standard Chat Completions
      content = await callXAI([
        { role: "system", content: "You are a technical interviewer. Return ONLY valid JSON. Every time you are called, you must generate a brand new, highly specific, and unique set of questions." },
        { role: "user", content: prompt },
      ], 0.85, 4000);
    }

    const questions = parseQuestions(content);
    console.log(`[MCQ] AI returned ${questions.length} valid questions`);

    let finalQuestions: MCQQuestion[] = [];
    if (questions.length >= 15) {
      finalQuestions = questions.slice(0, 20);
    } else if (questions.length > 5) {
      const bankQuestions = buildMCQsFromBank(skills);
      const combined = [...questions];
      for (const bq of bankQuestions) {
        if (combined.length >= 20) break;
        if (!combined.find(q => q.question === bq.question)) combined.push(bq);
      }
      finalQuestions = combined.slice(0, 20);
    } else {
      throw new Error(`Only ${questions.length} valid questions from AI`);
    }

    // Ensure all options of the generated questions are shuffled
    return finalQuestions.map(q => {
      const shuffledOptions = shuffleArray(q.options);
      if (!shuffledOptions.includes(q.answer)) {
        shuffledOptions[0] = q.answer;
      }
      return {
        ...q,
        options: shuffledOptions
      };
    });
  } catch (error: any) {
    console.warn("[MCQ] xAI failed, using curated bank:", error?.message);
    return buildMCQsFromBank(skills);
  }
}

import { EnterpriseResumeData } from "./types";

export async function parseResumeEnterprise(rawText: string): Promise<EnterpriseResumeData> {
  const prompt = `You are a Principal AI Recruiter and Data Extraction Specialist. 
Your task is to parse the provided raw resume OCR text and extract EVERY piece of information into a highly structured JSON format matching the schema below exactly.

CRITICAL RULES:
1. DO NOT hallucinate. If a field is missing in the resume, return an empty string "" or empty array [] or null/false as appropriate.
2. Return ONLY valid JSON. No markdown, no introductory text.
3. Extract all available metrics, KPIs, tools, frameworks, and dates.
4. Extract every single programming language, framework, database, and cloud tool into the appropriate technicalSkills arrays.

SCHEMA TO FOLLOW:
{
  "personalInfo": {
    "fullName": "...", "firstName": "...", "lastName": "...",
    "email": "...", "phone": "...", "linkedin": "...", "github": "..."
    // ... plus any other personal info found (city, state, portfolio, etc.)
  },
  "education": [
    {
      "school": "...", "degreeType": "Bachelor|Master|...", "degreeName": "...",
      "startDate": "...", "endDate": "...", "cgpa": 0.0,
      "honors": [], "relevantCoursework": []
    }
  ],
  "workExperience": [
    {
      "companyName": "...", "isCurrentCompany": true/false, "jobTitle": "...",
      "employmentType": "Full-time|Internship|...", "location": "...",
      "startDate": "...", "endDate": "...", 
      "responsibilities": ["..."], "achievements": ["..."],
      "kpis": ["..."], "technologiesUsed": ["..."]
    }
  ],
  "projects": [
    {
      "projectName": "...", "projectType": "...", "description": "...",
      "programmingLanguages": [], "frameworks": [], "databases": [],
      "responsibilities": [], "githubUrl": "..."
    }
  ],
  "technicalSkills": {
    "programmingLanguages": [], "frameworks": [], "libraries": [], "sdks": [],
    "databases": { "sql": [], "nosql": [], "orm": [] },
    "backend": [], "frontend": [], "mobileDevelopment": [], "desktopDevelopment": [],
    "gameDevelopment": [], "operatingSystems": [], "cloudPlatforms": [],
    "devops": { "containers": [], "iac": [], "ciCd": [], "versionControl": [], "monitoring": [] },
    "apisAndMicroservices": [], "bigDataAndDataWarehousing": [],
    "machineLearningAndAI": [], "cyberSecurity": [], "networking": [], "other": []
  },
  "softSkills": [],
  "certifications": [
    { "certificationName": "...", "provider": "...", "issueDate": "..." }
  ],
  "achievements": [],
  "languages": []
}

RAW RESUME TEXT:
"""
${rawText}
"""
`;

  console.log("[ATS] Calling xAI to extract EnterpriseResumeData...");
  let content = "";
  try {
    content = await callXAI([
      { role: "system", content: "You are an expert data extractor. Output ONLY valid JSON matching the exact schema." },
      { role: "user", content: prompt }
    ], 0.1, 8000);
  } catch (err: any) {
    const reason = err?.message || "Unknown xAI error";
    console.error("[ATS] xAI Enterprise extraction failed:", reason);
    console.warn("[ATS] Falling back to heuristic-only resume parser (no AI credits required)...");

    // ── Heuristic fallback: build EnterpriseResumeData from regex/keyword extraction ──
    const skills = extractAllSkillsFromText(rawText);

    // Extract basic personal info via regex
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = rawText.match(/(\+?\d[\d\-\s().]{7,}\d)/);
    const linkedinMatch = rawText.match(/linkedin\.com\/in\/([\w\-]+)/i);
    const githubMatch = rawText.match(/github\.com\/([\w\-]+)/i);
    const nameMatch = rawText.split("\n").find(l => l.trim().length > 2 && l.trim().length < 60 && !/[@:/\\]/.test(l) && !/^(summary|education|skill|experience|project|contact|objective)/i.test(l.trim()));

    // Detect projects (lines containing common project-section keywords)
    const projectLines = rawText.split("\n").filter(l => /project|built|developed|created|implemented/i.test(l) && l.trim().length > 15);
    const heuristicProjects = projectLines.slice(0, 5).map((l, i) => ({
      projectName: `Project ${i + 1}`,
      projectType: "Personal",
      description: l.trim().slice(0, 200),
      programmingLanguages: skills.programming.slice(0, 3),
      frameworks: skills.technical.slice(0, 2),
      databases: [],
      responsibilities: [],
      githubUrl: "",
    }));

    // Detect education
    const hasBachelor = /bachelor|b\.?tech|b\.?e\.?|b\.sc|undergraduate/i.test(rawText);
    const hasMaster = /master|m\.?tech|m\.?e\.?|m\.sc|postgraduate|mba/i.test(rawText);
    const cgpaMatch = rawText.match(/(?:cgpa|gpa|grade)[:\s]*([0-9.]+)/i);

    const heuristicEducation = [{
      school: "",
      degreeType: hasMaster ? "Master" : hasBachelor ? "Bachelor" : "Other",
      degreeName: "",
      startDate: "",
      endDate: "",
      cgpa: cgpaMatch ? parseFloat(cgpaMatch[1]) : 0,
      honors: [] as string[],
      relevantCoursework: [] as string[],
    }];

    const fallbackData: EnterpriseResumeData = {
      personalInfo: {
        fullName: nameMatch?.trim() || "",
        firstName: "",
        lastName: "",
        email: emailMatch?.[0] || "",
        phone: phoneMatch?.[1] || "",
        linkedin: linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : "",
        github: githubMatch ? `github.com/${githubMatch[1]}` : "",
      },
      education: heuristicEducation,
      workExperience: [],
      projects: heuristicProjects,
      technicalSkills: {
        programmingLanguages: skills.programming,
        frameworks: skills.technical,
        libraries: [],
        sdks: [],
        databases: { sql: skills.tools.filter(t => /sql|postgres|mysql|sqlite/.test(t.toLowerCase())), nosql: skills.tools.filter(t => /mongo|redis|cassandra|dynamo|firebase/.test(t.toLowerCase())), orm: [] },
        backend: skills.technical.filter(t => /node|express|django|flask|fastapi|spring|nest|laravel/.test(t.toLowerCase())),
        frontend: skills.technical.filter(t => /react|angular|vue|next|svelte|tailwind|bootstrap/.test(t.toLowerCase())),
        mobileDevelopment: skills.technical.filter(t => /flutter|react native|android|ios|kotlin|swift/.test(t.toLowerCase())),
        desktopDevelopment: [],
        gameDevelopment: [],
        operatingSystems: skills.tools.filter(t => /linux|ubuntu|windows|macos/.test(t.toLowerCase())),
        cloudPlatforms: skills.tools.filter(t => /aws|gcp|azure|vercel|netlify|heroku/.test(t.toLowerCase())),
        devops: {
          containers: skills.tools.filter(t => /docker|kubernetes|k8s/.test(t.toLowerCase())),
          iac: skills.tools.filter(t => /terraform|ansible|pulumi/.test(t.toLowerCase())),
          ciCd: skills.tools.filter(t => /jenkins|github actions|gitlab ci|ci\/cd/.test(t.toLowerCase())),
          versionControl: skills.tools.filter(t => /git|github|gitlab|bitbucket/.test(t.toLowerCase())),
          monitoring: [],
        },
        apisAndMicroservices: skills.technical.filter(t => /graphql|rest|grpc|websocket/.test(t.toLowerCase())),
        bigDataAndDataWarehousing: [],
        machineLearningAndAI: skills.technical.filter(t => /machine learning|deep learning|tensorflow|pytorch|scikit|keras|nlp|langchain/.test(t.toLowerCase())),
        cyberSecurity: [],
        networking: [],
        other: skills.tools,
      },
      softSkills: skills.soft,
      certifications: skills.certifications.map(c => ({ certificationName: c, provider: "", issueDate: "" })),
      achievements: [],
      languages: [],
      _heuristicFallback: true,
      _fallbackReason: reason,
    } as any;

    return fallbackData;
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Enterprise parsing failed: No JSON found in response");
  }

  try {
    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1)) as EnterpriseResumeData;
    return parsed;
  } catch (err) {
    console.error("[ATS] JSON parse error:", err);
    throw new Error("Enterprise parsing failed: Invalid JSON format");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grok API ATS Review
// ─────────────────────────────────────────────────────────────────────────────
export async function generateATSReviewGrok(rawText: string, parsedData: EnterpriseResumeData): Promise<ATSResult> {
  const prompt = `You are an elite, highly critical Technical Recruiter and ATS System evaluating a candidate's resume for a top-tier tech company.
You are provided with the raw resume text and the structured JSON data extracted from it.

Your task is to evaluate the resume across 10 dimensions and return a highly detailed, honest, and critical ATS JSON report.
Be extremely realistic. Do NOT inflate scores. 
- A score of 90+ should be exceptionally rare (FAANG level).
- A score of 60-75 is average.
- A score below 50 means significant flaws.

DIMENSIONS:
1. technicalSkills (out of 25): Breadth, depth, and relevance to modern stacks (Cloud, DevOps, AI, etc.)
2. projects (out of 20): Complexity, deployment, measurable impact, and real-world applicability.
3. education (out of 10): Degrees, relevant coursework, and academic prestige/GPA (if provided).
4. certifications (out of 8): Industry-recognized certifications (e.g., AWS, GCP, specialized courses).
5. formatting (out of 7): Readability, sections, bullet points, and appropriate length.
6. contactInfo (out of 7): Email, phone, LinkedIn, GitHub/Portfolio.
7. professionalSummary (out of 6): Clear, impactful, role-targeted summary or objective.
8. actionVerbs (out of 7): Strong, active verbs (Architected, Spearheaded, Optimized) vs weak passive verbs.
9. quantifiedAchievements (out of 5): Use of numbers, percentages, and metrics to prove impact.
10. softSkills (out of 5): Communication, leadership, teamwork mentioned explicitly or implicitly.

CRITICAL RULES:
1. Return ONLY valid JSON matching the exact schema below.
2. DO NOT output markdown blocks or explanation text outside the JSON.
3. Keep the arrays strictly limited (e.g. 5-7 strengths, 3-5 weaknesses).
4. Provide actionable, specific improvements.
5. Provide realistic "hiringProbability" ("Very Low", "Low", "Medium", "High", "Very High").
6. Provide a concise "recruiterImpression" (1-2 sentences).

EXPECTED JSON SCHEMA:
{
  "atsScore": 0,
  "breakdown": {
    "technicalSkills": 0, "projects": 0, "education": 0, "certifications": 0, "formatting": 0,
    "contactInfo": 0, "professionalSummary": 0, "actionVerbs": 0, "quantifiedAchievements": 0, "softSkills": 0
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "improvements": ["...", "..."],
  "missingKeywords": ["...", "..."],
  "missingSkills": ["...", "..."],
  "hiringProbability": "Medium",
  "recruiterImpression": "...",
  "readabilityScore": 0,
  "professionalismScore": 0,
  "keywordDensity": 0,
  "detectedDomain": "Software Engineering",
  "possibleRoles": ["...", "..."]
}

RAW RESUME TEXT:
"""
${rawText.slice(0, 5000)}
"""

PARSED RESUME DATA:
"""
${JSON.stringify(parsedData)}
"""
`;

  console.log("[ATS] Calling xAI to generate ATS Review...");
  let content = "";
  try {
    content = await callXAI([
      { role: "system", content: "You are an elite ATS System. Return ONLY valid JSON matching the exact expected schema without markdown formatting." },
      { role: "user", content: prompt }
    ], 0.2, 5000);
  } catch (err: any) {
    console.error("[ATS] xAI ATS Review failed:", err?.message);
    throw new Error("Failed to generate ATS review: " + err?.message);
  }

  const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("ATS Review failed: No JSON found in response");
  }

  try {
    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1)) as ATSResult;
    // Safety check: ensure breakdown sums up close to atsScore (or re-compute if wildly off)
    const rawSum = Object.values(parsed.breakdown).reduce((a, b) => (a as number) + (b as number), 0);
    parsed.atsScore = Math.min(Math.max(Math.round(rawSum as number), 20), 99); 
    
    return parsed;
  } catch (err) {
    console.error("[ATS] ATS Review JSON parse error:", err);
    throw new Error("ATS Review failed: Invalid JSON format");
  }
}

export default getXAI;
