import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── ATS Scoring Code copied from lib/ats.ts & lib/openai.ts to be self-contained ───

const HIGH_DEMAND_SKILLS = [
  "react", "next.js", "typescript", "node.js", "python", "aws", "docker",
  "kubernetes", "graphql", "postgresql", "mongodb", "redis", "ci/cd",
  "microservices", "system design", "machine learning", "tensorflow", "pytorch",
  "spring boot", "kafka", "elasticsearch", "terraform", "azure", "gcp",
  "nextjs", "react native", "flutter", "fastapi", "django", "nestjs",
];

const HIGH_DEMAND_CERTS = [
  "aws certified", "google cloud", "azure certified", "cka", "ckad",
  "pmp", "scrum master", "tensorflow developer", "meta developer",
  "coursera", "udemy", "nptel",
];

const SKILL_VOCAB: [string, string, string][] = [
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
  ["leadership",                       "soft", "Leadership"],
  ["communication",                    "soft", "Communication"],
  ["teamwork|team player",             "soft", "Teamwork"],
  ["problem.?solving",                 "soft", "Problem Solving"],
  ["critical.?thinking",               "soft", "Critical Thinking"],
  ["\\bagile\\b",                      "soft", "Agile"],
  ["\\bscrum\\b",                      "soft", "Scrum"],
  ["time.?management",                 "soft", "Time Management"],
  ["collaboration",                    "soft", "Collaboration"],
  ["aws.?certified",                   "cert", "AWS Certified"],
  ["google.?cloud.?cert",              "cert", "Google Cloud Certified"],
  ["azure.?cert",                      "cert", "Azure Certified"],
  ["coursera",                         "cert", "Coursera Certificate"],
  ["udemy",                            "cert", "Udemy Certificate"],
  ["\\bnptel\\b",                      "cert", "NPTEL Certificate"],
  ["certif",                           "cert", "Certification"],
];

function extractAllSkillsFromText(rawText: string) {
  const found: Record<string, Set<string>> = {
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
    } catch {}
  }

  const programming = Array.from(found.programming);
  const technical   = Array.from(found.technical);
  const tools       = Array.from(found.tools);
  const soft        = Array.from(found.soft);
  const certifications = Array.from(found.cert);
  const allSkills   = [...new Set([...programming, ...technical, ...tools])];

  return { programming, technical, tools, soft, certifications, allSkills };
}

function scoreSkillDepth(technical: string[], programming: string[], tools: string[]): number {
  const allSkills = [...technical, ...programming, ...tools].map(s => s.toLowerCase());
  const uniqueSkills = [...new Set(allSkills)];
  const highDemandCount = uniqueSkills.filter(s =>
    HIGH_DEMAND_SKILLS.some(h => s.includes(h) || h.includes(s))
  ).length;
  const totalSkills = uniqueSkills.length;

  const progDepth = Math.min(programming.length * 1.5, 5);
  const techDepth = Math.min(technical.length * 1.5, 10);
  const toolDepth = Math.min(tools.length * 1.5, 7);
  const demandBonus = Math.min(highDemandCount * 2.5, 8);
  const diversityBonus = totalSkills >= 12 ? 5 : totalSkills >= 8 ? 3 : totalSkills >= 4 ? 1 : 0;

  return Math.min(progDepth + techDepth + toolDepth + demandBonus + diversityBonus, 35);
}

function scoreProjects(projects: string[], rawText: string): number {
  const lower = rawText.toLowerCase();
  const hasMetrics = /\d+%|\d+ users?|\d+x|\$\d+|millions?|thousands?|reduced|improved|increased|optimized/.test(lower);
  const hasDeployment = /deployed|production|vercel|heroku|aws|live|hosted|netlify|railway/.test(lower);
  const hasGithub = /github\.com|open.?source|repository|repo/.test(lower);
  const hasTeam = /team|collaborated|led|agile|scrum|sprint|managed/.test(lower);
  const hasTechStack = /full.?stack|front.?end|back.?end|api|database|server/.test(lower);

  let score = 0;
  if (projects.length >= 3) score += 18;
  else if (projects.length >= 2) score += 15;
  else if (projects.length >= 1) score += 10;

  if (hasMetrics) score += 3;
  if (hasDeployment) score += 2;
  if (hasGithub) score += 2;
  if (hasTeam) score += 1;
  if (hasTechStack) score += 1;

  return Math.min(score, 25);
}

function scoreEducation(education: string[], rawText: string): number {
  const lower = rawText.toLowerCase();
  const hasBachelor = /b\.?tech|b\.?e\.|bachelor|b\.?sc|b\.?cs|undergraduate|bca|engineering/i.test(lower);
  const hasMaster = /m\.?tech|m\.?e\.|master|m\.?sc|postgraduate|mba|mca/i.test(lower);
  const hasGPA = /gpa|cgpa|percentage|grade|\d{1,2}\.\d{1,2}\s*cgpa|\d{2,3}%/i.test(lower);
  const hasReputed = /iit|nit|bits|vit|srm|anna university|national institute|top university|delhi university|mumbai university|college|institute|university/i.test(lower);

  let score = 0;
  if (hasMaster || hasBachelor || education.length > 0) score += 18;
  else score += 12;

  if (hasGPA) score += 1;
  if (hasReputed) score += 1;

  return Math.min(score, 20);
}

function scoreCertifications(certifications: string[], rawText: string): number {
  const lower = rawText.toLowerCase();
  const highDemandCertCount = HIGH_DEMAND_CERTS.filter(c => lower.includes(c)).length;
  const anyMooc = /coursera|udemy|edx|nptel|linkedin learning|pluralsight|alison/i.test(lower);
  const hasCert = /certif|certificate|certification/i.test(lower);

  let score = 0;
  if (highDemandCertCount >= 1 || certifications.length >= 1 || anyMooc || hasCert) {
    score += 10;
  }
  return Math.min(score, 10);
}

function scoreFormatting(rawText: string): number {
  const lower = rawText.toLowerCase();
  const sections = ["experience", "education", "skills", "projects", "summary", "objective", "contact", "achievements", "certifications", "internship", "work experience"];
  const foundSections = sections.filter(s => lower.includes(s));

  const hasBullets = rawText.includes("•") || rawText.includes("‣") || rawText.includes("→") ||
    /^[-*]\s/.test(rawText) || rawText.split("\n").some(l => l.trim().startsWith("-"));
  const hasQuantified = /\d+/.test(rawText);
  const hasContactInfo = /email|phone|\+91|@gmail|@yahoo|linkedin|github/.test(lower);
  const goodLength = rawText.length > 300 && rawText.length < 8000;
  const hasName = rawText.split("\n")[0]?.trim().length > 2;

  let score = 2; // base
  score += Math.min(foundSections.length * 2, 5); // up to 5 for sections
  if (hasBullets) score += 1;
  if (hasQuantified) score += 1;
  if (hasContactInfo) score += 1;
  if (goodLength) score += 1;
  if (hasName) score += 1;

  return Math.min(Math.round(score), 10);
}

function calculateATSScore(data: any) {
  const rawText = data.rawText || "";
  const skillsScore = scoreSkillDepth(data.technical, data.programming, data.tools);
  const projectsScore = scoreProjects(data.projects, rawText);
  const educationScore = scoreEducation(data.education, rawText);
  const certificationsScore = scoreCertifications(data.certifications, rawText);
  const formattingScore = scoreFormatting(rawText);

  const atsScore = Math.min(
    skillsScore + projectsScore + educationScore + certificationsScore + formattingScore,
    100
  );

  return {
    atsScore,
    extractedSkills: {
      technical: data.technical,
      programming: data.programming,
      tools: data.tools,
      certifications: data.certifications,
      projects: data.projects,
      education: data.education,
      soft: data.soft,
      allSkills: [...new Set([...data.technical, ...data.programming, ...data.tools])]
    },
    strengths: [
      `Excellent technical breadth with ${data.technical.length + data.programming.length + data.tools.length} skills across multiple technology stacks`,
      `Polyglot programmer with experience in ${data.programming.slice(0, 3).join(", ")}`,
      `Hands-on project experience demonstrating practical implementation skills`,
      `Educational background clearly documented`
    ],
    weaknesses: [],
    improvements: []
  };
}

// ─── Migration Runner ───

async function run() {
  console.log("Starting ATS Score Recalculation Migration (Self-Contained)...");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  
  const { data: resumes, error } = await sb.from("resumes").select("*");
  if (error) {
    console.error("Failed to fetch resumes:", error);
    return;
  }
  
  console.log(`Fetched ${resumes.length} resumes from database. Recalculating...`);
  
  for (const r of resumes) {
    const rawText = r.raw_text || "";
    if (!rawText) continue;
    
    // Parse skills locally
    const localSkills = extractAllSkillsFromText(rawText);
    
    // Parse projects
    const projectMatches = rawText.match(/(?:project|built|developed|created|implemented)[^\n]{0,80}/gi) || [];
    const projects = [...new Set(projectMatches.slice(0, 5).map((p: string) => p.trim().substring(0, 60)))];
    
    // Education
    const eduPatterns = ["b\\.tech", "b\\.e\\.", "bca", "m\\.tech", "mca", "bachelor", "master", "mba", "bsc", "msc", "btech", "mtech"];
    const education = [...new Set(
      eduPatterns
        .filter(e => new RegExp(e, "i").test(rawText))
        .map(e => e.replace(/\\\./g, ".").toUpperCase())
    )];
    
    const atsInput = {
      technical: localSkills.technical,
      programming: localSkills.programming,
      tools: localSkills.tools,
      certifications: localSkills.certifications,
      projects,
      education,
      soft: localSkills.soft,
      rawText
    };
    
    const review = calculateATSScore(atsInput);
    
    console.log(`Updating resume [ID: ${r.id}] for user [ID: ${r.user_id}]:`);
    console.log(`  Old Score: ${r.ats_score} -> New Score: ${review.atsScore}`);
    
    const { error: updateError } = await sb
      .from("resumes")
      .update({
        ats_score: review.atsScore,
        strengths: review.strengths,
        weaknesses: review.weaknesses,
        improvements: review.improvements,
        extracted_skills: review.extractedSkills,
        updated_at: new Date().toISOString()
      })
      .eq("id", r.id);
      
    if (updateError) {
      console.error(`  Failed to update resume ${r.id}:`, updateError.message);
    } else {
      console.log(`  Successfully updated!`);
    }
  }
  
  console.log("Migration complete!");
}

run();
