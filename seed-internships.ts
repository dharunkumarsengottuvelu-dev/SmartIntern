import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TITLES_AND_SKILLS = [
  {
    title: "Software Engineering Intern",
    category: "Tech",
    skills: ["JavaScript", "React", "Node.js", "TypeScript", "Python", "SQL", "Git"],
    description: "Work on developing, testing, and maintaining full-stack web applications and services."
  },
  {
    title: "Frontend Developer Intern",
    category: "Tech",
    skills: ["JavaScript", "React", "TypeScript", "HTML", "CSS", "Tailwind", "Git"],
    description: "Focus on building responsive, interactive, and beautiful user interfaces."
  },
  {
    title: "Backend Engineer Intern",
    category: "Tech",
    skills: ["Node.js", "Express", "PostgreSQL", "MongoDB", "Python", "Docker", "REST APIs", "Git"],
    description: "Design and implement scalable backend APIs, database schemas, and microservices."
  },
  {
    title: "Data Analyst Intern",
    category: "Data",
    skills: ["Python", "SQL", "Excel", "Data Analysis", "Tableau", "Power BI"],
    description: "Analyze complex datasets to generate actionable insights and reports for business stakeholders."
  },
  {
    title: "Machine Learning Intern",
    category: "Tech",
    skills: ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Machine Learning", "Data Analysis"],
    description: "Build, train, and evaluate machine learning models for predictive analytics."
  },
  {
    title: "Business Analyst Intern",
    category: "Business",
    skills: ["Problem Solving", "Communication", "Collaboration", "Agile", "Excel", "Data Analysis"],
    description: "Gather and document business requirements, analyzing processes to optimize efficiency."
  },
  {
    title: "Cybersecurity Analyst Intern",
    category: "Security",
    skills: ["Networking", "Cybersecurity", "Linux", "Python", "Docker", "Cryptography"],
    description: "Assist in monitoring, detecting, and responding to security incidents and vulnerabilities."
  },
  {
    title: "Product Management Intern",
    category: "Business",
    skills: ["Problem Solving", "Communication", "Collaboration", "Agile", "Product Strategy"],
    description: "Collaborate with engineering, design, and marketing to define product roadmaps and features."
  }
];

function getCategoryFromCompany(name: str): number {
  const lower = name.toLowerCase();
  
  // Mappings to direct index or match
  if (lower.match(/(bank|sachs|citi|chase|stanley|barclays|visa|mastercard|fidelity|capital one|schwab|vanguard|wealth|finance|sofi|stripe|paypal|adyen|affirm)/)) {
    return 5; // Business Analyst / Finance
  }
  if (lower.match(/(mckinsey|bcg|bain|deloitte|pwc|ey|kpmg|accenture|oliver wyman|mercer|kearney|gartner)/)) {
    return 5; // Business Analyst
  }
  if (lower.match(/(pfizer|novartis|roche|merck|gsk|astrazeneca|sanofi|unitedhealth|medtronic|abbott|stryker|gilead|bms|lilly|amgen|abbvie)/)) {
    return 3; // Data Analyst
  }
  if (lower.match(/(tesla|ford|gm|toyota|bmw|mercedes|volkswagen|honda|hyundai|kia|nissan|boeing|airbus|spacex|blue origin)/)) {
    return 0; // Software Engineering
  }
  
  // Otherwise distribute randomly
  return Math.floor(Math.random() * TITLES_AND_SKILLS.length);
}

async function main() {
  console.log("=== Seeding Internships from File ===");
  
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  
  const filePath = path.join(process.cwd(), "internships_urls.txt");
  if (!fs.existsSync(filePath)) {
    console.error("❌ internships_urls.txt not found!");
    return;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(l => l.trim());
  
  console.log(`Parsed ${lines.length} lines from file.`);
  
  const internships = [];
  
  for (const line of lines) {
    const parts = line.split(":", 1);
    if (parts.length < 1) continue;
    const company = parts[0].trim();
    const apply_link = line.substring(company.length + 1).trim();
    
    const roleIndex = getCategoryFromCompany(company);
    const template = TITLES_AND_SKILLS[roleIndex];
    
    internships.push({
      title: template.title,
      company: company,
      description: `${template.description} This internship program is hosted by ${company} via their career portal.`,
      required_skills: template.skills,
      location: ["Remote", "Hybrid", "On-site"][Math.floor(Math.random() * 3)],
      duration: ["3 months", "6 months"][Math.floor(Math.random() * 2)],
      stipend: "Paid",
      apply_link: apply_link,
      is_active: true,
      category: template.category
    });
  }
  
  console.log(`Prepared ${internships.length} internship records for insertion.`);
  
  // Clear existing internships to make it clean
  console.log("Clearing old internships...");
  await sb.from("recommendations").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Clear recommendation dependencies
  await sb.from("internships").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  console.log("✓ Existing internships and recommendations cleared.");
  
  // Insert in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < internships.length; i += BATCH_SIZE) {
    const batch = internships.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from("internships").insert(batch);
    if (error) {
      console.error(`❌ Error inserting batch starting at index ${i}:`, error);
    } else {
      console.log(`✓ Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
    }
  }
  
  console.log("\n🎉 Seeding finished successfully!");
}

main();
type str = string;
