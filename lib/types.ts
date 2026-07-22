export interface PersonalInfo {
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  professionalTitle?: string;
  currentDesignation?: string;
  profileHeadline?: string;
  careerObjective?: string;
  professionalSummary?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  linkedin?: string;
  github?: string;
  gitlab?: string;
  bitbucket?: string;
  portfolio?: string;
  personalWebsite?: string;
  kaggle?: string;
  leetcode?: string;
  hackerrank?: string;
  codechef?: string;
  codeforces?: string;
  stackoverflow?: string;
  medium?: string;
  devTo?: string;
  behance?: string;
  dribbble?: string;
  researchgate?: string;
  googleScholar?: string;
  orcid?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Education {
  school: string;
  degreeType: "Diploma" | "Bachelor" | "Master" | "Doctorate" | "Other";
  degreeName: string;
  institution: string;
  university?: string;
  board?: string;
  branch?: string;
  department?: string;
  major?: string;
  minor?: string;
  specialization?: string;
  startDate?: string;
  endDate?: string;
  graduationYear?: number;
  currentSemester?: number;
  cgpa?: number;
  gpa?: number;
  percentage?: number;
  academicRank?: string;
  honors?: string[];
  relevantCoursework?: string[];
  academicAchievements?: string[];
}

export interface WorkExperience {
  companyName: string;
  isCurrentCompany: boolean;
  jobTitle: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Freelance" | "Internship" | "Volunteer" | "Other";
  location?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  totalExperienceMonths?: number;
  relevantExperienceMonths?: number;
  industry?: string;
  domain?: string;
  responsibilities: string[];
  achievements: string[];
  businessImpact?: string;
  kpis?: string[];
  metrics?: string[];
  leadership?: boolean;
  promotionHistory?: string[];
  teamSize?: number;
  technologiesUsed: string[];
}

export interface Project {
  projectName: string;
  projectType: "Academic" | "Industry" | "Personal" | "Freelance" | "Open Source" | "Client" | "Other";
  description: string;
  problemStatement?: string;
  solution?: string;
  programmingLanguages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  apis: string[];
  cloudServices: string[];
  devops: string[];
  architecture?: string;
  designPatterns?: string[];
  modules?: string[];
  features?: string[];
  responsibilities: string[];
  role?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  duration?: string;
  outcome?: string;
  metrics?: string[];
  awards?: string[];
}

export interface TechnicalSkills {
  programmingLanguages: string[];
  frameworks: string[];
  libraries: string[];
  sdks: string[];
  databases: {
    sql: string[];
    nosql: string[];
    orm: string[];
  };
  backend: string[];
  frontend: string[];
  mobileDevelopment: string[];
  desktopDevelopment: string[];
  gameDevelopment: string[];
  operatingSystems: string[];
  cloudPlatforms: string[];
  devops: {
    containers: string[];
    iac: string[];
    ciCd: string[];
    versionControl: string[];
    monitoring: string[];
  };
  apisAndMicroservices: string[];
  bigDataAndDataWarehousing: string[];
  machineLearningAndAI: string[];
  cyberSecurity: string[];
  networking: string[];
  other: string[];
}

export interface Certification {
  certificationName: string;
  provider: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  verificationUrl?: string;
  skillsCovered: string[];
}

export interface Achievement {
  title: string;
  type: "Award" | "Scholarship" | "Hackathon" | "Competition" | "Research Paper" | "Patent" | "Publication" | "Book" | "Conference Talk" | "Seminar" | "Workshop" | "Honor" | "Ranking" | "Other";
  description?: string;
  date?: string;
  url?: string;
}

export interface Language {
  language: string;
  proficiencyLevel: "Beginner" | "Intermediate" | "Advanced" | "Native" | "Fluent";
}

export interface EnterpriseResumeData {
  personalInfo: PersonalInfo;
  education: Education[];
  workExperience: WorkExperience[];
  projects: Project[];
  technicalSkills: TechnicalSkills;
  softSkills: string[];
  certifications: Certification[];
  achievements: Achievement[];
  languages: Language[];
}
