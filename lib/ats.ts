export interface ATSInput {
  technical: string[];
  programming: string[];
  tools: string[];
  certifications: string[];
  projects: string[];
  education: string[];
  soft: string[];
  rawText?: string;
}

export interface ATSResult {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  breakdown: {
    skillsScore: number;
    projectsScore: number;
    educationScore: number;
    certificationsScore: number;
    formattingScore: number;
  };
}

// Premium MNC-level skills that significantly boost score
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

function dedupeSkills(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim().toLowerCase()))]
    .map(s => s.charAt(0).toUpperCase() + s.slice(1));
}

// ─── Score Skills ─────────────────────────────────────────────────────────────
function scoreSkillDepth(technical: string[], programming: string[], tools: string[]): number {
  const allSkills = [...technical, ...programming, ...tools].map(s => s.toLowerCase());
  const uniqueSkills = [...new Set(allSkills)];

  const highDemandCount = uniqueSkills.filter(s =>
    HIGH_DEMAND_SKILLS.some(h => s.includes(h) || h.includes(s))
  ).length;

  const totalSkills = uniqueSkills.length;

  // Score components - calibrated for students (fewer skills needed for max)
  const progDepth = Math.min(programming.length * 1.5, 5);      // 3-4 languages get max 5
  const techDepth = Math.min(technical.length * 1.5, 10);       // 6-7 frameworks get max 10
  const toolDepth = Math.min(tools.length * 1.5, 7);            // 4-5 tools get max 7
  const demandBonus = Math.min(highDemandCount * 2.5, 8);       // 3-4 demand skills get max 8
  const diversityBonus = totalSkills >= 12 ? 5 : totalSkills >= 8 ? 3 : totalSkills >= 4 ? 1 : 0;

  return Math.min(progDepth + techDepth + toolDepth + demandBonus + diversityBonus, 35);
}

// ─── Score Projects ────────────────────────────────────────────────────────────
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

// ─── Score Education ───────────────────────────────────────────────────────────
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

// ─── Score Certifications ──────────────────────────────────────────────────────
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

// ─── Score Formatting ──────────────────────────────────────────────────────────
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

// ─── Generate Strengths ────────────────────────────────────────────────────────
function generateStrengths(input: ATSInput, rawText: string): string[] {
  const lower = rawText.toLowerCase();
  const strengths: string[] = [];

  const totalSkills = input.technical.length + input.programming.length + input.tools.length;

  if (totalSkills >= 15) strengths.push(`Excellent technical breadth with ${totalSkills} skills across multiple technology stacks`);
  else if (totalSkills >= 10) strengths.push(`Strong technical profile with ${totalSkills} skills across multiple domains`);
  else if (totalSkills >= 6) strengths.push(`Good range of ${totalSkills} technical skills listed`);
  else if (totalSkills >= 3) strengths.push(`Core technical skills identified: ${[...input.programming, ...input.technical].slice(0, 3).join(", ")}`);

  if (input.programming.length >= 4) strengths.push(`Polyglot programmer with experience in ${input.programming.slice(0, 4).join(", ")} and more`);
  else if (input.programming.length >= 2) strengths.push(`Programming skills in ${input.programming.join(" and ")}`);
  else if (input.programming.length === 1) strengths.push(`Programming skills in ${input.programming[0]}`);

  if (input.tools.length >= 5) strengths.push(`Well-versed in industry tools and platforms: ${input.tools.slice(0, 4).join(", ")}`);
  else if (input.tools.length >= 2) strengths.push(`Familiar with development tools: ${input.tools.join(", ")}`);

  if (input.projects.length >= 4) strengths.push("Extensive hands-on project experience demonstrating practical implementation skills");
  else if (input.projects.length >= 2) strengths.push("Multiple hands-on projects showing ability to apply skills in real-world scenarios");
  else if (input.projects.length >= 1) strengths.push("Project experience demonstrates ability to build complete applications");

  if (input.education.length >= 1) strengths.push("Educational background clearly documented");

  if (input.certifications.length >= 2) strengths.push(`${input.certifications.length} certifications demonstrate commitment to continuous learning`);
  else if (input.certifications.length === 1) strengths.push("Certification shows dedication to professional development");

  const hasMnc = /internship|google|microsoft|amazon|infosys|tcs|wipro|accenture|cognizant|ibm/.test(lower);
  if (hasMnc) strengths.push("Work experience or internship with a reputed organization adds credibility");

  const hasMetrics = /\d+%|\d+x|reduced|improved|optimized|achieved/.test(lower);
  if (hasMetrics) strengths.push("Quantified achievements with measurable impact — excellent for ATS systems");

  const hasGithub = /github\.com/.test(lower);
  if (hasGithub) strengths.push("GitHub profile included — allows recruiters to verify actual code contributions");

  return strengths.slice(0, 5);
}

// ─── Generate Weaknesses ───────────────────────────────────────────────────────
function generateWeaknesses(input: ATSInput, rawText: string): string[] {
  const lower = rawText.toLowerCase();
  const weaknesses: string[] = [];

  const totalSkills = input.technical.length + input.programming.length + input.tools.length;
  if (totalSkills < 4) weaknesses.push("Very few technical skills listed — ATS systems at MNCs expect 8+ skills for most roles");
  else if (totalSkills < 7) weaknesses.push("Limited number of skills detected — consider listing more tools and frameworks you know");

  if (input.programming.length === 0) weaknesses.push("No programming languages detected — this is a critical gap for any technical role");

  if (input.projects.length === 0) weaknesses.push("No projects section found — projects are essential for ATS shortlisting in tech companies");
  else if (input.projects.length === 1) weaknesses.push("Only 1 project listed — MNC ATS systems prefer 2-4 projects with tech stack details");

  if (input.certifications.length === 0 && !/(coursera|udemy|nptel|google|aws|microsoft)/i.test(lower)) {
    weaknesses.push("No certifications or online courses found — even free certificates from Coursera/NPTEL help ATS scoring");
  }

  const hasAction = /developed|built|created|implemented|designed|led|managed|reduced|improved|architected|optimized/.test(lower);
  if (!hasAction) weaknesses.push("Resume lacks action verbs — start bullet points with 'Built', 'Developed', 'Implemented', 'Architected'");

  const hasMetrics = /\d+%|\d+x|reduced|improved/.test(lower);
  if (!hasMetrics) weaknesses.push("No quantified achievements — add metrics like '40% faster load time' or 'Served 500+ users daily'");

  const hasLinkedin = /linkedin/.test(lower);
  if (!hasLinkedin) weaknesses.push("LinkedIn profile URL not included — important for recruiter verification at MNCs");

  return weaknesses.slice(0, 4);
}

// ─── Generate Improvements ─────────────────────────────────────────────────────
function generateImprovements(input: ATSInput, rawText: string): string[] {
  const lower = rawText.toLowerCase();
  const improvements: string[] = [];

  const allSkills = [...input.technical, ...input.programming, ...input.tools].map(s => s.toLowerCase());

  if (!allSkills.some(s => s.includes("cloud") || s.includes("aws") || s.includes("azure") || s.includes("gcp"))) {
    improvements.push("Add cloud platform skills (AWS/GCP/Azure) — 85%+ of MNC job postings require cloud knowledge");
  }

  if (!allSkills.some(s => s.includes("docker") || s.includes("kubernetes") || s.includes("devops") || s.includes("ci/cd"))) {
    improvements.push("Learn Docker & CI/CD pipelines — DevOps knowledge significantly increases shortlisting chances at MNCs");
  }

  if (!allSkills.some(s => s.includes("sql") || s.includes("postgres") || s.includes("mysql") || s.includes("database"))) {
    improvements.push("Add database skills (PostgreSQL/MySQL) — virtually every backend role requires SQL proficiency");
  }

  if (input.projects.length < 3) {
    improvements.push("Build 2-3 end-to-end projects with live deployment links on GitHub + Vercel/Netlify/Railway");
  }

  if (!/(github\.com)/.test(lower)) {
    improvements.push("Add your GitHub profile URL — MNC recruiters actively check GitHub contributions and code quality");
  }

  if (input.certifications.length === 0) {
    improvements.push("Earn at least one recognized certification: AWS Cloud Practitioner, Google IT Support, or Meta Front-End Developer");
  }

  if (!/(linkedin\.com)/.test(lower)) {
    improvements.push("Include LinkedIn profile URL with a headline matching the role you're applying for");
  }

  const hasQuantified = /\d+%|\d+x/.test(rawText);
  if (!hasQuantified) {
    improvements.push("Quantify every achievement: e.g. 'Reduced API response time by 40%' or 'Built app with 1000+ active users'");
  }

  improvements.push("Use standard ATS section headings: 'Technical Skills', 'Work Experience', 'Projects', 'Education', 'Certifications'");

  return improvements.slice(0, 6);
}

// ─── Main ATS Calculator ───────────────────────────────────────────────────────
export function calculateATSScore(data: ATSInput): ATSResult {
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

  const strengths = generateStrengths(data, rawText);
  const weaknesses = generateWeaknesses(data, rawText);
  const improvements = generateImprovements(data, rawText);

  return {
    atsScore,
    strengths,
    weaknesses,
    improvements,
    breakdown: {
      skillsScore,
      projectsScore,
      educationScore,
      certificationsScore,
      formattingScore,
    },
  };
}
