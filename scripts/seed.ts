import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing Supabase URL or Key in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sampleInternships = [
  {
    title: "Frontend Developer Intern",
    company: "TechCorp India",
    description: "Work on React.js-based web applications, collaborate with designers, and implement responsive UIs.",
    required_skills: ["React", "JavaScript", "HTML", "CSS", "Tailwind CSS", "Git"],
    location: "Bangalore (Remote)",
    duration: "3 months",
    stipend: "₹15,000/month",
    apply_link: "https://techcorp.in/careers",
    category: "Frontend",
    is_active: true
  },
  {
    title: "MERN Stack Developer Intern",
    company: "StartupHub",
    description: "Build full-stack applications using MongoDB, Express.js, React, and Node.js.",
    required_skills: ["MongoDB", "Express.js", "React", "Node.js", "JavaScript", "REST API"],
    location: "Hyderabad",
    duration: "6 months",
    stipend: "₹20,000/month",
    apply_link: "https://startuphub.io/jobs",
    category: "Full Stack",
    is_active: true
  },
  {
    title: "React Developer Intern",
    company: "DesignFirst",
    description: "Develop modern React applications with state management (Redux/Context API).",
    required_skills: ["React.js", "Redux", "JavaScript", "TypeScript", "CSS", "REST API"],
    location: "Chennai (Remote)",
    duration: "4 months",
    stipend: "₹12,000/month",
    apply_link: "https://designfirst.co/intern",
    category: "Frontend",
    is_active: true
  },
  {
    title: "Backend Developer Intern",
    company: "CloudBase",
    description: "Design and implement RESTful APIs using Node.js and Python with MongoDB and PostgreSQL.",
    required_skills: ["Node.js", "Python", "MongoDB", "PostgreSQL", "REST API", "Docker"],
    location: "Pune",
    duration: "3 months",
    stipend: "₹18,000/month",
    apply_link: "https://cloudbase.dev/careers",
    category: "Backend",
    is_active: true
  },
  {
    title: "Data Science Intern",
    company: "DataMinds",
    description: "Analyze datasets, build ML models, and create visualizations using Python.",
    required_skills: ["Python", "Pandas", "NumPy", "Scikit-learn", "Matplotlib", "SQL"],
    location: "Bangalore",
    duration: "6 months",
    stipend: "₹25,000/month",
    apply_link: "https://dataminds.ai/internship",
    category: "Data Science",
    is_active: true
  },
  {
    title: "Machine Learning Intern",
    company: "AIForge",
    description: "Develop and train ML models for NLP and computer vision tasks.",
    required_skills: ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "Git"],
    location: "Remote",
    duration: "4 months",
    stipend: "₹30,000/month",
    apply_link: "https://aiforge.tech/ml-intern",
    category: "Machine Learning",
    is_active: true
  },
  {
    title: "DevOps Engineer Intern",
    company: "InfraScale",
    description: "Set up CI/CD pipelines, containerize applications with Docker, and manage AWS infrastructure.",
    required_skills: ["Docker", "AWS", "Linux", "Git", "CI/CD", "Kubernetes"],
    location: "Remote",
    duration: "3 months",
    stipend: "₹22,000/month",
    apply_link: "https://infrascale.io/jobs",
    category: "DevOps",
    is_active: true
  },
  {
    title: "Mobile App Developer Intern",
    company: "AppStudio",
    description: "Build cross-platform mobile applications using Flutter/Dart.",
    required_skills: ["Flutter", "Dart", "Firebase", "REST API", "Git", "Android"],
    location: "Delhi",
    duration: "4 months",
    stipend: "₹15,000/month",
    apply_link: "https://appstudio.in/careers",
    category: "Mobile",
    is_active: true
  },
  {
    title: "Full Stack Intern",
    company: "WebWave",
    description: "Work on both frontend (Next.js) and backend (Node.js/MongoDB) features.",
    required_skills: ["Next.js", "Node.js", "MongoDB", "React", "TypeScript", "Tailwind CSS"],
    location: "Mumbai (Hybrid)",
    duration: "6 months",
    stipend: "₹20,000/month",
    apply_link: "https://webwave.dev/intern",
    category: "Full Stack",
    is_active: true
  },
  {
    title: "Python Developer Intern",
    company: "AutomateIt",
    description: "Build automation scripts, REST APIs using FastAPI/Django, and data pipelines.",
    required_skills: ["Python", "FastAPI", "Django", "PostgreSQL", "Docker", "Git"],
    location: "Hyderabad (Remote)",
    duration: "3 months",
    stipend: "₹16,000/month",
    apply_link: "https://automateit.com/careers",
    category: "Backend",
    is_active: true
  },
  {
    title: "UI/UX + Frontend Intern",
    company: "PixelPerfect",
    description: "Design and implement beautiful, user-friendly interfaces using React and Figma.",
    required_skills: ["React", "CSS", "Figma", "JavaScript", "HTML", "Tailwind CSS"],
    location: "Bangalore",
    duration: "3 months",
    stipend: "₹12,000/month",
    apply_link: "https://pixelperfect.design/intern",
    category: "Frontend",
    is_active: true
  },
  {
    title: "Blockchain Developer Intern",
    company: "ChainTech",
    description: "Develop smart contracts and decentralized applications using Solidity and Web3.js.",
    required_skills: ["Solidity", "Web3.js", "JavaScript", "Ethereum", "Node.js"],
    location: "Remote",
    duration: "4 months",
    stipend: "₹25,000/month",
    apply_link: "https://chaintech.io/jobs",
    category: "Blockchain",
    is_active: true
  },
  {
    title: "Cloud Computing Intern",
    company: "NimbusTech",
    description: "Work with AWS/GCP services, design cloud architectures, and optimize costs.",
    required_skills: ["AWS", "Google Cloud", "Python", "Docker", "Kubernetes", "Terraform"],
    location: "Bangalore",
    duration: "6 months",
    stipend: "₹28,000/month",
    apply_link: "https://nimbustech.cloud/intern",
    category: "Cloud",
    is_active: true
  },
  {
    title: "Android Developer Intern",
    company: "MobileFirst",
    description: "Build native Android applications using Kotlin and Jetpack Compose.",
    required_skills: ["Kotlin", "Android", "Java", "Jetpack Compose", "Firebase", "REST API"],
    location: "Chennai",
    duration: "4 months",
    stipend: "₹14,000/month",
    apply_link: "https://mobilefirst.in/android-intern",
    category: "Mobile",
    is_active: true
  },
  {
    title: "Cybersecurity Intern",
    company: "SecureNet",
    description: "Learn and apply penetration testing, vulnerability assessment, and network security.",
    required_skills: ["Python", "Linux", "Networking", "Cybersecurity", "Kali Linux", "Git"],
    location: "Delhi (Hybrid)",
    duration: "3 months",
    stipend: "₹18,000/month",
    apply_link: "https://securenet.in/careers",
    category: "Security",
    is_active: true
  }
];

async function seed() {
  try {
    console.log("Connecting to Supabase...");
    let seeded = 0;

    for (const job of sampleInternships) {
      // Check if it already exists
      const { data: existing } = await supabase
        .from("internships")
        .select("id")
        .eq("title", job.title)
        .eq("company", job.company)
        .single();

      if (!existing) {
        const { error } = await supabase.from("internships").insert(job);
        if (error) {
          console.error(`Failed to insert ${job.title}:`, error.message);
        } else {
          seeded++;
        }
      }
    }
    
    console.log(`✅ Seeded ${seeded} internships into Supabase (${sampleInternships.length - seeded} already existed)`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
