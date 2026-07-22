/**
 * Professional ATS Scoring Engine
 * ─────────────────────────────────
 * 10-dimension scoring system that evaluates resumes like enterprise ATS platforms.
 * Score ranges:
 *   20–40: Poor Resume
 *   41–60: Average Resume
 *   61–80: Good Resume
 *   81–92: Excellent Resume
 *   93–99: Outstanding Resume
 */

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
import { EnterpriseResumeData } from "./types";

export interface ATSInput extends EnterpriseResumeData {
  rawText: string;
}

export interface ATSBreakdown {
  technicalSkills: number;      // /25
  projects: number;             // /20
  education: number;            // /10
  certifications: number;       // /8
  formatting: number;           // /7
  contactInfo: number;          // /7
  professionalSummary: number;  // /6
  actionVerbs: number;          // /7
  quantifiedAchievements: number; // /5
  softSkills: number;           // /5
}

export interface ATSResult {
  atsScore: number;
  breakdown: ATSBreakdown;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  missingKeywords: string[];
  missingSkills: string[];
  hiringProbability: "Very Low" | "Low" | "Medium" | "High" | "Very High";
  recruiterImpression: string;
  readabilityScore: number;
  professionalismScore: number;
  keywordDensity: number;
  detectedDomain?: string;
  possibleRoles?: string[];
}

// ─────────────────────────────────────────────────────────────
// HIGH-DEMAND SKILL SETS
// ─────────────────────────────────────────────────────────────
const HIGH_DEMAND_SKILLS = [
  "react", "next.js", "nextjs", "typescript", "node.js", "nodejs", "python", "aws",
  "docker", "kubernetes", "k8s", "graphql", "postgresql", "postgres", "mongodb", "redis",
  "ci/cd", "microservices", "machine learning", "deep learning", "tensorflow", "pytorch",
  "spring boot", "kafka", "elasticsearch", "terraform", "azure", "gcp", "fastapi",
  "django", "nestjs", "react native", "flutter", "langchain", "llm", "devops",
  "system design", "data structures", "algorithms",
];

const CLOUD_SKILLS = ["aws", "gcp", "azure", "google cloud", "digitalocean", "heroku", "vercel"];
const DEVOPS_SKILLS = ["docker", "kubernetes", "k8s", "ci/cd", "github actions", "jenkins", "terraform", "ansible", "helm"];
const DATABASE_SKILLS = ["postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle", "dynamodb", "cassandra", "elasticsearch", "supabase", "firebase"];
const AI_ML_SKILLS = ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy", "nlp", "computer vision", "llm", "langchain", "openai", "data science"];

const ACTION_VERBS = [
  "developed", "built", "created", "implemented", "designed", "engineered", "architected",
  "deployed", "optimized", "improved", "reduced", "increased", "led", "managed", "delivered",
  "launched", "automated", "integrated", "collaborated", "mentored", "established", "maintained",
  "researched", "analyzed", "migrated", "refactored", "scaled", "contributed", "coordinated",
];

const CERTIFICATION_PLATFORMS = [
  "aws certified", "google certified", "azure certified", "cka", "ckad", "pmp",
  "scrum master", "cisco", "comptia", "oracle certified", "salesforce", "kubernetes",
  "coursera", "udemy", "edx", "nptel", "linkedin learning", "pluralsight", "alison",
  "hackerrank", "leetcode", "codechef",
];

// ─────────────────────────────────────────────────────────────
// DIMENSION 1: Technical Skills (max 25)
// ─────────────────────────────────────────────────────────────
function scoreTechnicalSkills(input: ATSInput): number {
  const ts = input.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.sdks,
    ...ts.databases.sql, ...ts.databases.nosql, ...ts.databases.orm,
    ...ts.backend, ...ts.frontend, ...ts.mobileDevelopment,
    ...ts.cloudPlatforms, ...ts.devops.containers, ...ts.devops.ciCd
  ].map(s => s.toLowerCase().trim());
  const unique = [...new Set(allSkills)];

  const highDemandCount = unique.filter(s =>
    HIGH_DEMAND_SKILLS.some(h => s.includes(h) || h.includes(s))
  ).length;

  const progScore = Math.min(ts.programmingLanguages.length >= 4 ? 6 : ts.programmingLanguages.length * 1.5, 6);
  const techScore = Math.min((ts.frameworks.length + ts.libraries.length) >= 6 ? 7 : (ts.frameworks.length + ts.libraries.length) * 1.2, 7);
  const toolScore = Math.min((ts.databases.sql.length + ts.cloudPlatforms.length) >= 5 ? 5 : (ts.databases.sql.length + ts.cloudPlatforms.length) * 1.0, 5);
  const demandBonus = Math.min(highDemandCount * 1.5, 5);
  
  const hasCloud = ts.cloudPlatforms.length > 0;
  const hasDevOps = ts.devops.containers.length > 0 || ts.devops.ciCd.length > 0;
  const hasDB = ts.databases.sql.length > 0 || ts.databases.nosql.length > 0;
  const hasAIML = ts.machineLearningAndAI.length > 0;
  const stackBonus = (hasCloud ? 0.5 : 0) + (hasDevOps ? 0.5 : 0) + (hasDB ? 0.5 : 0) + (hasAIML ? 0.5 : 0);
  
  const totalSkills = unique.length;
  const diversityBonus = totalSkills >= 20 ? 1 : totalSkills >= 14 ? 0.75 : totalSkills >= 8 ? 0.5 : 0;

  return Math.min(Math.round(progScore + techScore + toolScore + demandBonus + stackBonus + diversityBonus), 25);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 2: Projects (max 20)
// ─────────────────────────────────────────────────────────────
function scoreProjects(projects: ATSInput["projects"], rawText: string): number {
  let score = 0;
  if (projects.length >= 4) score += 14;
  else if (projects.length >= 3) score += 12;
  else if (projects.length >= 2) score += 10;
  else if (projects.length === 1) score += 7;

  let hasMetrics = false;
  let hasDeployment = false;
  let hasGithub = false;
  let hasTeam = false;
  let hasTechStack = false;

  for (const p of projects) {
    if (p.metrics && p.metrics.length > 0) hasMetrics = true;
    if (p.cloudServices && p.cloudServices.length > 0) hasDeployment = true;
    if (p.githubUrl) hasGithub = true;
    if (p.programmingLanguages && p.programmingLanguages.length > 0) hasTechStack = true;
  }

  if (hasMetrics) score += 2;
  if (hasDeployment) score += 2;
  if (hasGithub) score += 1;
  if (hasTeam) score += 1;
  if (hasTechStack) score += 1;

  return Math.min(Math.round(score), 20);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 3: Education (max 10)
// ─────────────────────────────────────────────────────────────
function scoreEducation(education: ATSInput["education"], rawText: string): number {
  let hasMaster = false;
  let hasBachelor = false;
  let hasGPA = false;
  let hasCoursework = false;

  for (const ed of education) {
    if (ed.degreeType === "Master" || ed.degreeType === "Doctorate") hasMaster = true;
    if (ed.degreeType === "Bachelor") hasBachelor = true;
    if (ed.cgpa || ed.gpa || ed.percentage) hasGPA = true;
    if (ed.relevantCoursework && ed.relevantCoursework.length > 0) hasCoursework = true;
  }

  let score = 0;
  if (hasMaster) score += 9;
  else if (hasBachelor || education.length > 0) score += 7;
  else score += 4;

  if (hasGPA) score += 1;
  if (hasCoursework) score += 1;

  return Math.min(Math.round(score), 10);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 4: Certifications (max 8)
// ─────────────────────────────────────────────────────────────
function scoreCertifications(certifications: ATSInput["certifications"], rawText: string): number {
  let score = 0;
  if (certifications.length >= 3) score = 8;
  else if (certifications.length >= 2) score = 6;
  else if (certifications.length >= 1) score = 4;
  
  return Math.min(Math.round(score), 8);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 5: Formatting (max 7)
// ─────────────────────────────────────────────────────────────
function scoreFormatting(rawText: string): number {
  const lower = rawText.toLowerCase();
  const sections = [
    "experience", "education", "skills", "projects", "summary", "objective",
    "contact", "achievements", "certifications", "internship", "work experience",
    "publications", "awards", "volunteer", "technical skills",
  ];
  const foundSections = sections.filter(s => lower.includes(s)).length;
  const hasBullets = rawText.includes("•") || rawText.includes("▪") || rawText.includes("◆") ||
    /^[-*→✓]\s/m.test(rawText) || rawText.split("\n").filter(l => l.trim().startsWith("-")).length > 3;
  const hasNumbers = /\d+/.test(rawText);
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const goodLength = wordCount >= 150 && wordCount <= 1000;
  const tooShort = wordCount < 100;
  const tooLong = wordCount > 1500;

  let score = 0;
  if (foundSections >= 5) score += 3;
  else if (foundSections >= 3) score += 2;
  else if (foundSections >= 1) score += 1;

  if (hasBullets) score += 1;
  if (hasNumbers) score += 0.5;
  if (goodLength) score += 1.5;
  else if (tooShort || tooLong) score -= 1;

  // Penalize bad formatting signals
  if (/[^\x00-\x7F]{50,}/.test(rawText)) score -= 1; // excessive unicode/symbols

  return Math.min(Math.max(Math.round(score), 0), 7);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 6: Contact Info (max 7)
// ─────────────────────────────────────────────────────────────
function scoreContactInfo(rawText: string, input: ATSInput): number {
  let score = 0;
  const p = input.personalInfo;
  
  if (p.email) score += 2;
  if (p.phone) score += 2;
  if (p.linkedin) score += 1.5;
  if (p.github || p.portfolio || p.personalWebsite) score += 1.5;

  return Math.min(Math.round(score), 7);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 7: Professional Summary (max 6)
// ─────────────────────────────────────────────────────────────
function scoreProfessionalSummary(rawText: string): number {
  const lower = rawText.toLowerCase();

  const hasSummarySection = /\b(summary|objective|profile|about me|professional summary|career objective|professional profile)\b/i.test(lower);

  if (!hasSummarySection) return 0;

  const summaryIdx = Math.max(
    lower.indexOf("summary"), lower.indexOf("objective"),
    lower.indexOf("profile"), lower.indexOf("about me"),
  );
  const summaryText = rawText.slice(summaryIdx, summaryIdx + 600).toLowerCase();
  const wordCount = summaryText.split(/\s+/).filter(Boolean).length;
  const hasRoleKeyword = /developer|engineer|analyst|scientist|designer|manager|intern|fresher|student/i.test(summaryText);
  const hasYearsExp = /\d+\+?\s*years?|fresher|recent graduate|entry.?level/i.test(summaryText);
  const hasSkillMention = /experience (in|with)|skilled in|proficient|expertise|passionate/i.test(summaryText);

  let score = 2; // has summary section
  if (wordCount >= 40 && wordCount <= 120) score += 2;
  else if (wordCount >= 20) score += 1;
  if (hasRoleKeyword) score += 1;
  if (hasYearsExp) score += 0.5;
  if (hasSkillMention) score += 0.5;

  return Math.min(Math.round(score), 6);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 8: Action Verbs (max 7)
// ─────────────────────────────────────────────────────────────
function scoreActionVerbs(rawText: string): number {
  const lower = rawText.toLowerCase();
  const foundVerbs = ACTION_VERBS.filter(v => lower.includes(v));
  const uniqueVerbs = [...new Set(foundVerbs)];
  const strongVerbs = ["architected", "engineered", "spearheaded", "orchestrated", "pioneered", "optimized", "scaled", "automated", "delivered"];
  const strongCount = strongVerbs.filter(v => lower.includes(v)).length;

  let score = 0;
  if (uniqueVerbs.length >= 10) score = 7;
  else if (uniqueVerbs.length >= 7) score = 5.5;
  else if (uniqueVerbs.length >= 4) score = 4;
  else if (uniqueVerbs.length >= 2) score = 2.5;
  else if (uniqueVerbs.length >= 1) score = 1;

  if (strongCount >= 2) score = Math.min(score + 1, 7);

  return Math.min(Math.round(score), 7);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 9: Quantified Achievements (max 5)
// ─────────────────────────────────────────────────────────────
function scoreQuantifiedAchievements(rawText: string): number {
  const metrics = rawText.match(/\d+\s*%|\d+\s*x\s*(faster|improvement|reduction|increase)|\d[\d,]*\+?\s*(users?|customers?|requests?|queries?|transactions?|records?)|reduced|improved\s+by|\$[\d,.]+[kKmMbB]?/gi) || [];
  const uniqueMetrics = [...new Set(metrics.map(m => m.toLowerCase()))];

  let score = 0;
  if (uniqueMetrics.length >= 5) score = 5;
  else if (uniqueMetrics.length >= 3) score = 4;
  else if (uniqueMetrics.length >= 2) score = 3;
  else if (uniqueMetrics.length >= 1) score = 2;

  return Math.min(Math.round(score), 5);
}

// ─────────────────────────────────────────────────────────────
// DIMENSION 10: Soft Skills (max 5)
// ─────────────────────────────────────────────────────────────
function scoreSoftSkills(softSkills: string[], rawText: string): number {
  let score = 0;
  if (softSkills.length >= 4) score = 5;
  else if (softSkills.length === 3) score = 4;
  else if (softSkills.length === 2) score = 3;
  else if (softSkills.length === 1) score = 2;
  return Math.min(Math.round(score), 5);
}

// ─────────────────────────────────────────────────────────────
// DOMAIN DETECTION
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// DOMAIN DETECTION MOVED TO BOTTOM
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// MISSING KEYWORDS & SKILLS ANALYSIS
// ─────────────────────────────────────────────────────────────
function analyzeMissing(input: ATSInput, rawText: string): { missingKeywords: string[]; missingSkills: string[] } {
  const ts = input.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.databases.sql,
    ...ts.cloudPlatforms
  ].map(s => s.toLowerCase());

  const lower = rawText.toLowerCase();
  
  const criticalKeywords = [
    "team", "agile", "sprint", "project", "github", "git", "testing", "documentation",
  ];
  const missingKeywords = criticalKeywords.filter(k => !lower.includes(k));

  const essentialSkills: Record<string, string> = {
    "Git/GitHub": "git|github",
    "SQL": "sql|postgresql|mysql|database",
    "Cloud (AWS/GCP/Azure)": "aws|gcp|azure|cloud",
    "Docker": "docker",
    "REST API": "rest api|restful|api",
    "Linux": "linux|unix|bash|shell",
  };

  const missingSkills = Object.entries(essentialSkills)
    .filter(([, pattern]) => !new RegExp(pattern, "i").test(lower))
    .map(([label]) => label);

  return { missingKeywords: missingKeywords.slice(0, 8), missingSkills: missingSkills.slice(0, 6) };
}

// ─────────────────────────────────────────────────────────────
// STRENGTHS
// ─────────────────────────────────────────────────────────────
function generateStrengths(input: ATSInput, rawText: string, breakdown: ATSBreakdown): string[] {
  const lower = rawText.toLowerCase();
  const strengths: string[] = [];
  const ts = input.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.databases.sql,
    ...ts.cloudPlatforms
  ];

  if (breakdown.technicalSkills >= 20) strengths.push(`Outstanding technical profile — ${allSkills.length} technologies across multiple stacks`);
  else if (breakdown.technicalSkills >= 15) strengths.push(`Strong technical breadth — ${allSkills.length} skills across relevant domains`);
  else if (breakdown.technicalSkills >= 8) strengths.push(`Good technical foundation with ${allSkills.length} relevant technologies`);

  if (breakdown.projects >= 15) strengths.push("Extensive project portfolio with deployed, production-grade applications");
  else if (breakdown.projects >= 10) strengths.push("Multiple end-to-end projects demonstrating full development lifecycle experience");
  else if (breakdown.projects >= 7) strengths.push("Hands-on project experience building complete applications");

  if (breakdown.quantifiedAchievements >= 3) strengths.push("Strong use of quantified metrics — highly appealing to ATS parsers and recruiters");
  if (breakdown.contactInfo >= 6) strengths.push("Complete professional contact information including LinkedIn and GitHub");
  if (breakdown.certifications >= 6) strengths.push("Industry-recognized certifications that validate technical expertise");
  if (breakdown.actionVerbs >= 5) strengths.push("Strong use of action verbs that highlight contribution and impact");
  if (breakdown.professionalSummary >= 4) strengths.push("Well-crafted professional summary that sets clear career direction");
  if (breakdown.education >= 8) strengths.push("Strong educational credentials from a recognized institution");

  if (/google|microsoft|amazon|meta|apple|infosys|tcs|wipro|accenture|cognizant|ibm|mnc/i.test(lower)) {
    strengths.push("Industry experience or internship with a reputed organization");
  }
  if (/open.?source|contributor|maintained|npm package|published/i.test(lower)) {
    strengths.push("Open-source contributions demonstrate community involvement and code quality");
  }

  return strengths.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────
// WEAKNESSES
// ─────────────────────────────────────────────────────────────
function generateWeaknesses(input: ATSInput, rawText: string, breakdown: ATSBreakdown): string[] {
  const lower = rawText.toLowerCase();
  const weaknesses: string[] = [];

  if (breakdown.technicalSkills < 8) weaknesses.push("Insufficient technical skills — ATS systems at top companies typically scan for 10+ specific technologies");
  else if (breakdown.technicalSkills < 14) weaknesses.push("Limited technical stack — consider expanding with complementary tools and cloud technologies");

  if (breakdown.projects < 7) weaknesses.push("Too few projects listed — recruiters expect 2–4 projects with clear technology details and links");
  else if (breakdown.projects < 12) weaknesses.push("Projects lack impact indicators — add deployment links, user counts, or performance improvements");

  if (breakdown.quantifiedAchievements === 0) weaknesses.push("Zero quantified achievements — this is a critical ATS filter; add numbers like '40% faster', '500+ users'");
  else if (breakdown.quantifiedAchievements < 2) weaknesses.push("Very few metrics — quantify more achievements to pass automated ATS screening");

  if (breakdown.contactInfo < 4) weaknesses.push("Incomplete contact information — missing LinkedIn and/or GitHub profile links");
  if (breakdown.certifications === 0) weaknesses.push("No certifications found — even free MOOC certificates improve ATS ranking significantly");
  if (breakdown.professionalSummary === 0) weaknesses.push("Missing professional summary — ATS systems specifically look for this section to match job descriptions");
  if (breakdown.actionVerbs < 3) weaknesses.push("Weak use of action verbs — replace passive descriptions with 'Built', 'Engineered', 'Optimized'");

  if (!/(github\.com)/i.test(lower)) weaknesses.push("GitHub profile URL missing — essential for tech companies to verify code quality");
  if (!/(linkedin\.com)/i.test(lower)) weaknesses.push("LinkedIn URL missing — most ATS systems auto-link this for recruiter review");

  return weaknesses.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────
// IMPROVEMENTS (Actionable, Prioritized)
// ─────────────────────────────────────────────────────────────
function generateImprovements(input: ATSInput, rawText: string, atsScore: number): string[] {
  const lower = rawText.toLowerCase();
  const ts = input.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.databases.sql,
    ...ts.cloudPlatforms
  ].map(s => s.toLowerCase());
  
  const improvements: string[] = [];

  if (atsScore < 50) {
    improvements.push("CRITICAL: Add a Professional Summary (3–4 sentences) at the top of your resume describing your role, skills, and goals");
    improvements.push("CRITICAL: Include your LinkedIn profile URL and GitHub profile URL in the contact section");
  }

  if (!allSkills.some(s => /cloud|aws|azure|gcp/.test(s))) {
    improvements.push("Add cloud skills (AWS Free Tier / Google Cloud Skills Boost) — 85%+ of modern job postings require cloud experience");
  }
  if (!allSkills.some(s => /docker|kubernetes|k8s/.test(s))) {
    improvements.push("Learn Docker basics — containerization is now a baseline expectation for most engineering roles");
  }
  if (!allSkills.some(s => /sql|postgres|mysql|database/.test(s))) {
    improvements.push("Add SQL/database skills — virtually every backend role requires database proficiency");
  }
  if (input.projects.length < 3) {
    improvements.push("Build 2–3 complete projects with live deployment links (Vercel/Netlify/Railway) and detailed README files");
  }
  if (!/github\.com\/[\w-]+/i.test(rawText)) {
    improvements.push("Add your GitHub profile URL — format as 'github.com/yourusername' in the contact header");
  }
  if (!/\d+%|\d+x|\d[\d,]*\s*(users?|customers?)/.test(rawText)) {
    improvements.push("Quantify every achievement — replace vague claims with specifics like 'Reduced load time by 40%' or 'API handling 10K daily requests'");
  }
  if (input.certifications.length === 0) {
    improvements.push("Earn a free certification: Google IT Support (Coursera), AWS Cloud Practitioner (free study), or Meta Front-End Developer");
  }
  if (!/agile|scrum|sprint/.test(lower)) {
    improvements.push("Mention Agile/Scrum experience — most development teams use Agile methodology and it's an ATS keyword");
  }

  improvements.push("Use exact section headers: 'Technical Skills', 'Projects', 'Work Experience', 'Education', 'Certifications' — ATS systems parse these literally");
  improvements.push("Keep resume to 1 page (for students/freshers) or 2 pages (for 3+ years experience) — ATS systems prefer concise resumes");

  return improvements.slice(0, 7);
}

// ─────────────────────────────────────────────────────────────
// HIRING PROBABILITY
// ─────────────────────────────────────────────────────────────
function getHiringProbability(score: number): ATSResult["hiringProbability"] {
  if (score >= 85) return "Very High";
  if (score >= 70) return "High";
  if (score >= 55) return "Medium";
  if (score >= 40) return "Low";
  return "Very Low";
}

function getRecruiterImpression(score: number, breakdown: ATSBreakdown): string {
  if (score >= 90) return "Outstanding resume — would immediately shortlist for senior roles at top-tier companies. The technical depth, project portfolio, and professional presentation exceed standard requirements.";
  if (score >= 80) return "Strong candidate — would shortlist for most mid-to-senior positions. The technical skills and project experience stand out, though minor improvements could push this to the elite tier.";
  if (score >= 70) return "Good candidate — would pass initial ATS screening for most roles. A few targeted improvements to quantified achievements and professional links would significantly boost shortlisting rates.";
  if (score >= 55) return "Average resume — would pass ATS at smaller companies but likely filtered by enterprise systems. Needs more concrete achievements, better contact information, and project depth.";
  if (score >= 40) return "Below average — ATS systems at most companies would filter this resume before human review. Requires significant improvements in technical breadth, projects, and professional presentation.";
  return "Needs substantial work — this resume would be filtered by most modern ATS systems. Foundational elements are missing. Focus on adding a summary, contact links, quantified achievements, and core technical skills first.";
}

// ─────────────────────────────────────────────────────────────
// READABILITY & PROFESSIONALISM SCORES
// ─────────────────────────────────────────────────────────────
function getReadabilityScore(rawText: string): number {
  const lines = rawText.split("\n").filter(l => l.trim());
  const avgLineLength = lines.reduce((sum, l) => sum + l.trim().length, 0) / Math.max(lines.length, 1);
  const hasBullets = rawText.includes("•") || /^[-*]\s/m.test(rawText);
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  let score = 60;
  if (avgLineLength < 100) score += 15;
  if (hasBullets) score += 15;
  if (wordCount >= 200 && wordCount <= 800) score += 10;

  return Math.min(Math.round(score), 100);
}

function getProfessionalismScore(rawText: string, atsScore: number): number {
  const lower = rawText.toLowerCase();
  let score = atsScore * 0.7; // base from ATS score

  if (/linkedin\.com/i.test(lower)) score += 5;
  if (/github\.com/i.test(lower)) score += 5;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(rawText)) score += 5;
  if (/summary|objective/i.test(lower)) score += 5;

  return Math.min(Math.round(score), 100);
}

function getKeywordDensity(rawText: string, input: ATSInput): number {
  const ts = input.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.databases.sql,
    ...ts.cloudPlatforms
  ];
  const words = rawText.split(/\s+/).filter(Boolean);
  const matched = allSkills.filter(s => rawText.toLowerCase().includes(s.toLowerCase())).length;
  return words.length > 0 ? Math.round((matched / Math.max(allSkills.length, 1)) * 100) : 0;
}

// ─────────────────────────────────────────────────────────────
// DOMAIN DETECTION
// ─────────────────────────────────────────────────────────────
function detectDomain(data: ATSInput): { domain: string; possibleRoles: string[] } {
  const ts = data.technicalSkills;
  const allSkills = [
    ...ts.programmingLanguages,
    ...ts.frameworks,
    ...ts.libraries,
    ...ts.databases.sql,
    ...ts.databases.nosql,
    ...ts.cloudPlatforms
  ].map(s => s.toLowerCase());
  
  const rawLower = (data.rawText || "").toLowerCase();

  const isData = allSkills.some(s => ["machine learning", "python", "pandas", "tensorflow", "pytorch", "data science"].includes(s)) || rawLower.includes("data scientist");
  const isDevOps = allSkills.some(s => ["docker", "kubernetes", "aws", "ci/cd", "terraform", "ansible"].includes(s)) || rawLower.includes("devops engineer");
  const isFrontend = allSkills.some(s => ["react", "angular", "vue", "next.js", "frontend", "html", "css"].includes(s)) || rawLower.includes("frontend developer");
  const isBackend = allSkills.some(s => ["node.js", "python", "java", "spring", "django", "backend", "express", "fastapi"].includes(s)) || rawLower.includes("backend developer");

  if (isData) return { domain: "Data Science & AI", possibleRoles: ["Data Scientist", "Machine Learning Engineer", "Data Analyst"] };
  if (isDevOps) return { domain: "Cloud & DevOps", possibleRoles: ["DevOps Engineer", "Cloud Architect", "SRE"] };
  if (isFrontend && isBackend) return { domain: "Full Stack Development", possibleRoles: ["Full Stack Developer", "Software Engineer"] };
  if (isFrontend) return { domain: "Frontend Development", possibleRoles: ["Frontend Developer", "UI/UX Developer", "Web Developer"] };
  if (isBackend) return { domain: "Backend Development", possibleRoles: ["Backend Developer", "Software Engineer", "API Developer"] };

  return { domain: "Software Engineering", possibleRoles: ["Software Engineer", "IT Analyst"] };
}

// ─────────────────────────────────────────────────────────────
// MAIN CALCULATOR
// ─────────────────────────────────────────────────────────────
export function calculateATSScore(data: ATSInput): ATSResult {
  const rawText = data.rawText || "";

  const breakdown: ATSBreakdown = {
    technicalSkills: scoreTechnicalSkills(data),
    projects: scoreProjects(data.projects, rawText),
    education: scoreEducation(data.education, rawText),
    certifications: scoreCertifications(data.certifications, rawText),
    formatting: scoreFormatting(rawText),
    contactInfo: scoreContactInfo(rawText, data),
    professionalSummary: scoreProfessionalSummary(rawText),
    actionVerbs: scoreActionVerbs(rawText),
    quantifiedAchievements: scoreQuantifiedAchievements(rawText),
    softSkills: scoreSoftSkills(data.softSkills, rawText),
  };

  const rawScore =
    breakdown.technicalSkills +
    breakdown.projects +
    breakdown.education +
    breakdown.certifications +
    breakdown.formatting +
    breakdown.contactInfo +
    breakdown.professionalSummary +
    breakdown.actionVerbs +
    breakdown.quantifiedAchievements +
    breakdown.softSkills;

  // Clamp to realistic range (20–99)
  const atsScore = Math.min(Math.max(Math.round(rawScore), 20), 99);

  const strengths = generateStrengths(data, rawText, breakdown);
  const weaknesses = generateWeaknesses(data, rawText, breakdown);
  const improvements = generateImprovements(data, rawText, atsScore);
  const { missingKeywords, missingSkills } = analyzeMissing(data, rawText);
  const { domain, possibleRoles } = detectDomain(data);

  return {
    atsScore,
    breakdown,
    strengths,
    weaknesses,
    improvements,
    missingKeywords,
    missingSkills,
    hiringProbability: getHiringProbability(atsScore),
    recruiterImpression: getRecruiterImpression(atsScore, breakdown),
    readabilityScore: getReadabilityScore(rawText),
    professionalismScore: getProfessionalismScore(rawText, atsScore),
    keywordDensity: getKeywordDensity(rawText, data),
    detectedDomain: domain,
    possibleRoles,
  };
}
