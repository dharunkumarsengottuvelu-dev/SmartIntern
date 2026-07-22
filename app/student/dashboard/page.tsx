"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText, Zap, Briefcase, LogOut, Upload, Star,
  TrendingUp, Award, ChevronRight, RefreshCw, ExternalLink,
  BookOpen, CheckCircle, XCircle, Clock, Target, Code2,
  Wrench, GraduationCap, Lightbulb, BarChart3, ArrowRight,
  Shield, Globe, Server, User, Edit3,
  X, Save, Phone, Building2, Calendar, AlertCircle,
  Trophy, ThumbsUp, BookMarked, DollarSign, Bell, CheckCheck, Trash2, Eye, UploadCloud, Edit2, Play,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import ChatWidget from "@/components/ChatWidget";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

const COLLEGES = [
  "Presidency College",
  "Queen Mary's College",
  "Bharathi Women's College",
  "Government Arts College, Nandanam",
  "Loyola College",
  "Madras Christian College (MCC)",
  "Stella Maris College",
  "Women's Christian College (WCC)",
  "Guru Nanak College",
  "Ethiraj College for Women",
  "Pachaiyappa's College",
  "Rajeswari Vedachalam Government Arts College",
  "Government Arts College, Coimbatore",
  "PSG College of Arts and Science",
  "Dr. N.G.P. Arts and Science College",
  "Sri Krishna Arts and Science College",
  "Kongunadu Arts and Science College",
  "PSGR Krishnammal College for Women",
  "Government Arts and Science College, Mettupalayam",
  "Government Arts and Science College, Pollachi",
  "Periyar Arts College",
  "Government Arts College, Chidambaram",
  "Government Arts College, Dharmapuri",
  "Government Arts and Science College, Harur",
  "M.V. Muthiah Government Arts College for Women",
  "Chikkaiah Government Arts and Science College",
  "Gobi Arts and Science College",
  "Kongu Arts and Science College",
  "Erode Arts and Science College",
  "Government Arts and Science College, Sathyamangalam",
  "Government Arts College, Karur",
  "Government Arts College For Men, Krishnagiri",
  "Government Arts College For Women, Krishnagiri",
  "Sri Meenakshi Government Arts College For Women",
  "Government Arts College, Melur",
  "Fatima College",
  "Lady Doak College",
  "The American College",
  "Madura College",
  "Arignar Anna Government Arts College, Namakkal",
  "Selvam Arts and Science College",
  "Government Arts College, Salem",
  "Government Arts College for Women, Salem",
  "Arignar Anna Government Arts College, Attur",
  "A.V.S. College of Arts and Science",
  "Bharathiyar Arts and Science College for Women",
  "Alagappa Government Arts College",
  "Government Arts College, Kumbakonam",
  "Government Arts College for Women, Kumbakonam",
  "Bishop Heber College",
  "National College",
  "St. Joseph's College",
  "Holy Cross College",
  "Jamal Mohamed College",
  "Government Arts College, Trichy",
  "V.O. Chidambaram College",
  "Govindammal Adithanar Women's College",
  "Government Arts College, Tiruvannamalai",
  "Government Arts College, Udhagamandalam",
  "Government Arts College, Ariyalur",
  "CEG Campus, Anna University",
  "ACT Campus, Anna University",
  "MIT Campus, Anna University",
  "PSG College of Technology",
  "Coimbatore Institute of Technology (CIT)",
  "Government College of Technology (GCT), Coimbatore",
  "Government College of Engineering, Salem",
  "Government College of Engineering, Bargur",
  "Government College of Engineering, Tirunelveli",
  "Government College of Engineering, Srirangam",
  "Government College of Engineering, Bodinayakkanur",
  "Alagappa Chettiar Government College of Engineering and Technology",
  "Thanthai Periyar Government Institute of Technology",
  "University College of Engineering, Kancheepuram",
  "University College of Engineering, Tindivanam",
  "University College of Engineering, Arni",
  "University College of Engineering, Villupuram",
  "University College of Engineering, Ariyalur",
  "University College of Engineering, Thirukkuvalai",
  "University College of Engineering, Pattukkottai",
  "University College of Engineering, Bit Campus, Trichy",
  "University College of Engineering, Dindigul",
  "University College of Engineering, Ramanathapuram",
  "University College of Engineering, Nagercoil",
  "Thiagarajar College of Engineering",
  "Kongu Engineering College",
  "Bannari Amman Institute of Technology",
  "Sona College of Technology",
  "Knowledge Institute of Technology",
  "Muthayammal Engineering College",
  "K.S. Rangasamy College of Technology",
  "Excel Engineering College",
  "Mahendra Engineering College",
  "Velalar College of Engineering and Technology",
  "Erode Sengunthar Engineering College",
  "Nandha Engineering College",
  "Sri Krishna College of Engineering and Technology",
  "Sri Ramakrishna Engineering College",
  "Kumaraguru College of Technology (KCT)",
  "VLB Janakiammal College of Engineering and Technology",
  "Karpagam College of Engineering",
  "Hindusthan College of Engineering and Technology",
  "SNS College of Technology",
  "Eshwar College of Engineering",
  "Sri Venkateswara College of Engineering (SVCE)",
  "SSN College of Engineering",
  "St. Joseph's College of Engineering",
  "Panimalar Engineering College",
  "Sathyabama Institute of Science and Technology",
  "Vel Tech Rangarajan Dr. Sagunthala R&D Institute",
  "RMK Engineering College",
  "RMD Engineering College",
  "Sri Sairam Engineering College",
  "Easwari Engineering College",
  "Meenakshi Sundararajan Engineering College",
  "Rajalakshmi Engineering College",
  "Saveetha Engineering College",
  "Jeppiaar Engineering College",
  "Kilaakarai Mohamed Sathak Engineering College",
  "PSN College of Engineering and Technology",
  "National Engineering College",
  "Mepco Schlenk Engineering College",
  "Kamaraj College of Engineering and Technology",
  "Sethu Institute of Technology",
  "Saranathan College of Engineering",
  "M.A.M. College of Engineering",
  "K.Ramakrishnan College of Technology",
  "Mookambigai College of Engineering",
  "Chettinad College of Engineering and Technology",
  "V.S.B. Engineering College",
  "Sengunthar Engineering College",
  "Paavai Engineering College",
  "Gnanamani College of Technology",
  "Vivekanandha College of Engineering for Women",
  "Narasu's Sarathy Institute of Technology",
  "The Kavery Engineering College",
  "Tagore Engineering College",
  "B.S. Abdur Rahman Crescent Institute of Science and Technology",
  "VIT University, Vellore",
  "SRM Institute of Science and Technology",
  "SASTRA Deemed University",
  "Amrita Vishwa Vidyapeetham",
  "Kalasalingam Academy of Research and Education",
  "Karunya Institute of Technology and Sciences",
  "Periyar Maniammai Institute of Science and Technology",
  "Adhiyamaan College of Engineering",
  "Er. Perumal Manimekalai College of Engineering",
  "A.V.C. College of Engineering",
  "Anjalai Ammal Mahalingam Engineering College"
];

interface Resume {
  id: string;
  fileName: string;
  fileUrl: string;
  atsScore: number;
  extractedSkills: {
    technical: string[];
    programming: string[];
    tools: string[];
    certifications: string[];
    soft?: string[];
    education?: string[];
    projects?: string[];
  };
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

interface Assessment {
  id?: string;
  percentage: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
  questions?: Array<{
    index: number;
    question: string;
    options: string[];
    difficulty: "easy" | "medium" | "hard";
    topic: string;
  }>;
  userAnswers?: Array<{ questionIndex: number; selectedOption: string }>;
  correctAnswerMap?: Record<number, string>;
}


interface Recommendation {
  matchPercentage: number;
  skillScore: number;
  assessmentScore: number;
  matchedSkills: string[];
  internship: {
    _id: string;
    title: string;
    company: string;
    location: string;
    duration: string;
    stipend: string;
    description: string;
    category: string;
    applyLink: string;
    requiredSkills: string[];
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  degree?: string;
  department?: string;
  year?: number;
}

// ─── ATS Score Ring ───────────────────────────────────────────────────────────
function ATSScoreRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Needs Work";
  const badgeCls = score >= 75 ? "badge-success" : score >= 60 ? "badge-warning" : "badge-error";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" className="score-ring transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-900" style={{ color }}>{score}</span>
          <span className="text-xs text-slate-500 font-semibold">/ 100</span>
        </div>
      </div>
      <span className={`badge mt-2 ${badgeCls}`}>{label}</span>
    </div>
  );
}

// ─── Skill Chip ───────────────────────────────────────────────────────────────
function SkillChip({ skill, variant = "brand" }: { skill: string; variant?: string }) {
  const variants: Record<string, string> = {
    brand: "bg-brand-50 border-brand-200 text-brand-700",
    green: "bg-green-50 border-green-200 text-green-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    slate: "bg-slate-100 border-slate-200 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${variants[variant] || variants.brand}`}>
      {skill}
    </span>
  );
}

// ─── MNC Readiness Card ────────────────────────────────────────────────────────
function MNCReadinessCard({ resume, assessment }: { resume: Resume | null; assessment: Assessment | null }) {
  const atsScore = resume?.atsScore ?? 0;
  const assessScore = assessment?.percentage ?? 0;
  const skillCount = resume
    ? (resume.extractedSkills.technical?.length ?? 0) +
      (resume.extractedSkills.programming?.length ?? 0) +
      (resume.extractedSkills.tools?.length ?? 0)
    : 0;

  const overall = Math.round(atsScore * 0.5 + assessScore * 0.3 + Math.min(skillCount * 2, 20));
  const isReady = overall >= 65;

  return (
    <div className={`glass-card p-5 rounded-xl border shadow-sm ${isReady ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-3 mb-3">
        <Shield className={`w-5 h-5 ${isReady ? "text-green-600" : "text-amber-600"}`} />
        <span className={`font-bold text-sm ${isReady ? "text-green-700" : "text-amber-700"}`}>
          MNC Readiness Score: {overall}%
        </span>
      </div>
      <div className="w-full bg-white rounded-full h-3 mb-2">
        <div
          className={`h-3 rounded-full transition-all duration-1000 ${isReady ? "bg-green-500" : "bg-amber-500"}`}
          style={{ width: `${overall}%` }}
        />
      </div>
      <p className={`text-xs font-medium ${isReady ? "text-green-600" : "text-amber-600"}`}>
        {isReady
          ? "✅ You are competitive for MNC internship applications!"
          : "⚠️ Complete assessment & add more skills to become MNC-ready"}
      </p>
    </div>
  );
}

// ─── Profile Edit Modal ───────────────────────────────────────────────────────
function ProfileEditModal({
  profile,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
}) {
  const isInitialCustomCollege = profile.college ? !COLLEGES.includes(profile.college) : false;
  const [isCustomCollege, setIsCustomCollege] = useState(isInitialCustomCollege);
  const [form, setForm] = useState({
    name: profile.name || "",
    phone: profile.phone || "",
    college: profile.college || "",
    degree: profile.degree || "",
    department: profile.department || "",
    year: profile.year?.toString() || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/student/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save changes.");
        return;
      }
      onSave(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in scale-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center border border-brand-100/50 shrink-0">
              <Edit3 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Edit Profile</h2>
              <p className="text-[11px] text-slate-400 font-semibold">Update your academic & contact information</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Section: Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  placeholder="Dharunkumar S"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  placeholder="+91 9876543210"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section: Academic Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Academic details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">College</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <select
                    value={isCustomCollege ? "Other" : (form.college || "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Other") {
                        setIsCustomCollege(true);
                        update("college", "");
                      } else {
                        setIsCustomCollege(false);
                        update("college", val);
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select College/University</option>
                    {COLLEGES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                </div>
                {isCustomCollege && (
                  <div className="mt-3 relative animate-in fade-in slide-in-from-top-2 duration-300">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.college}
                      onChange={(e) => update("college", e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                      placeholder="Type your college name"
                      required={isCustomCollege}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Current Year</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <select
                    value={form.year}
                    onChange={(e) => update("year", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white appearance-none cursor-pointer"
                  >
                    <option value="">Select year</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Degree</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <select
                    value={form.degree}
                    onChange={(e) => update("degree", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Degree</option>
                    <option value="B.Tech">B.Tech</option>
                    <option value="B.E.">B.E.</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="BCA">BCA</option>
                    <option value="M.Tech">M.Tech</option>
                    <option value="M.Sc">M.Sc</option>
                    <option value="MCA">MCA</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                  <select
                    value={form.department}
                    onChange={(e) => update("department", e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all bg-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Department</option>
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Data Science & AI">Data Science & AI</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-brand-500/10 hover:shadow-lg disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab redirect helper (needs Suspense boundary for useSearchParams) ──────────
function TabFromUrl({ onTab }: { onTab: (tab: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab) onTab(tab);
  }, [searchParams, onTab]);
  return null;
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [clearedNotifications, setClearedNotifications] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("read_notifications");
      const storedCleared = localStorage.getItem("cleared_notifications");
      setTimeout(() => {
        if (stored) setReadNotifications(JSON.parse(stored));
        if (storedCleared) setClearedNotifications(JSON.parse(storedCleared));
      }, 0);
    } catch {}
  }, []);

  const markAsRead = (id: string) => {
    setReadNotifications((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem("read_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    setReadNotifications((prev) => {
      const updated = [...new Set([...prev, ...allIds])];
      try {
        localStorage.setItem("read_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearNotification = (id: string) => {
    setClearedNotifications((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem("cleared_notifications", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map((n) => n.id);
    setClearedNotifications(allIds);
    try {
      localStorage.setItem("cleared_notifications", JSON.stringify(allIds));
    } catch {}
  };

  const [resume, setResume] = useState<Resume | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [expandedRecs, setExpandedRecs] = useState<Record<number, boolean>>({});
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState("");
  
  // JD Matching State
  const [jdText, setJdText] = useState("");
  const [matchingJd, setMatchingJd] = useState(false);
  const [jdMatchResult, setJdMatchResult] = useState<any>(null);
  const [jdMatchError, setJdMatchError] = useState("");

  const fetchData = useCallback(async () => {
    if (status !== "authenticated") return;
    
    setLoading(true);
    try {
      const [resumeRes, assessRes, profileRes] = await Promise.all([
        fetch(`${API_BASE}/resume/upload`),
        fetch(`${API_BASE}/student/assessment`),
        fetch(`${API_BASE}/student/profile`),
      ]);
      const [resumeData, assessData, profileData] = await Promise.all([
        resumeRes.json(),
        assessRes.json(),
        profileRes.json(),
      ]);
      if (resumeData.resume) setResume(resumeData.resume);
      if (assessData.assessment) setAssessment(assessData.assessment);
      if (profileData.user) setProfile(profileData.user);
      else if (profileData.id) setProfile(profileData); // support the new flat profile format

      // Only fetch recommendations if we have a resume!
      if (resumeData.resume) {
        const recRes = await fetch(`${API_BASE}/recommendation`);
        const recData = await recRes.json();
        
        const currentRecs = recData.recommendations || [];
        if (currentRecs.length === 0) {
          try {
            const genRes = await fetch(`${API_BASE}/recommendation`, { method: "POST" });
            const genData = await genRes.json();
            if (genData.recommendations) setRecommendations(genData.recommendations);
          } catch (genErr) {
            console.warn("Auto recommendation generation failed:", genErr);
            setRecommendations(currentRecs);
          }
        } else {
          setRecommendations(currentRecs);
        }
      } else {
        setRecommendations([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setTimeout(() => {
      fetchData();
    }, 0);
  }, [fetchData]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch(`${API_BASE}/resume/upload`, { 
        method: "POST", 
        body: formData,
        signal: AbortSignal.timeout(300000) // 5 minutes
      });
      const data = await res.json();
      if (!res.ok) { 
        setUploadError(data.message ? `${data.error}: ${data.message}` : data.error || "Upload failed"); 
        return; 
      }
      if (data.aiAnalysisFailed || data.resume.atsScore === 0) {
        setUploadError(data.message || "Resume uploaded securely, but the AI analysis is currently unavailable. Please try again later.");
      } else {
        setUploadSuccess(`Resume analyzed! ATS Score: ${data.resume.atsScore}/100. Redirecting to Assessment...`);
        // Refresh recommendations (generated server-side after upload)
        const recRes = await fetch(`${API_BASE}/recommendation`);
        const recData = await recRes.json();
        if (recData.recommendations) setRecommendations(recData.recommendations);
  
        // Auto redirect to assessment
        setTimeout(() => {
          router.push("/assessment");
        }, 2000);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleJDMatch = async () => {
    if (!jdText.trim()) {
      setJdMatchError("Please enter a job description.");
      return;
    }
    setMatchingJd(true);
    setJdMatchError("");
    setJdMatchResult(null);

    try {
      const res = await fetch(`${API_BASE}/ats/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jdText })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setJdMatchError(data.error || "Failed to analyze match.");
        return;
      }
      setJdMatchResult(data.data);
    } catch (err) {
      setJdMatchError("Network error. Please try again.");
    } finally {
      setMatchingJd(false);
    }
  };

  const handleProfileSave = async (updated: UserProfile) => {
    setProfile(updated);
    setShowProfileEdit(false);
    setProfileSaveSuccess("Profile updated successfully!");
    // Update session to reflect name change
    await updateSession({ name: updated.name });
    setTimeout(() => setProfileSaveSuccess(""), 3000);
  };

  const user = session?.user as any;
  const displayProfile = profile || user;
  const totalSkills = resume
    ? (resume.extractedSkills.technical?.length ?? 0) +
      (resume.extractedSkills.programming?.length ?? 0) +
      (resume.extractedSkills.tools?.length ?? 0)
    : 0;

  const tabs = [
    { id: "overview", label: "Overview", mobileLabel: "Overview", icon: TrendingUp },
    { id: "resume", label: "Resume & ATS", mobileLabel: "Resume", icon: FileText },
    { id: "assessment", label: "Assessment", mobileLabel: "Tests", icon: Zap },
    { id: "recommendations", label: "Jobs", mobileLabel: "Jobs", icon: Briefcase },
    { id: "profile", label: "Profile", mobileLabel: "Profile", icon: User },
  ];

  // Dynamic notification list based on state
  interface DashboardNotification {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    iconColor: string;
    actionLabel?: string;
    actionTab?: string;
    actionUrl?: string;
    isUnread: boolean;
  }
  const notifications: DashboardNotification[] = [];
  
  if (resume) {
    notifications.push({
      id: "resume-success",
      title: "Resume Analyzed Successfully",
      description: `Your ATS score is ${resume.atsScore}/100. ${resume.atsScore >= 70 ? "Excellent profile!" : "See tips below to improve."}`,
      icon: FileText,
      iconColor: "text-blue-600 bg-blue-50 border-blue-100",
      actionLabel: "View Resume Analysis",
      actionTab: "resume",
      isUnread: !readNotifications.includes("resume-success"),
    });
  } else {
    notifications.push({
      id: "resume-pending",
      title: "Resume Upload Pending",
      description: "Upload your resume in PDF/DOCX format to get your ATS score and matching jobs.",
      icon: Upload,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      actionLabel: "Upload Resume",
      actionTab: "resume",
      isUnread: !readNotifications.includes("resume-pending"),
    });
  }

  if (assessment) {
    notifications.push({
      id: "assessment-done",
      title: "Assessment Completed",
      description: `You scored ${assessment.percentage}% (${assessment.correctAnswers}/${assessment.totalQuestions} correct) on the skill test.`,
      icon: Award,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      actionLabel: "View Assessment Results",
      actionTab: "assessment",
      isUnread: !readNotifications.includes("assessment-done"),
    });
  } else if (resume) {
    notifications.push({
      id: "assessment-pending",
      title: "Take Skill Assessment",
      description: "Complete your 30-minute AI skill assessment to boost recommendation match accuracy.",
      icon: Zap,
      iconColor: "text-purple-600 bg-purple-50 border-purple-100",
      actionLabel: "Start Assessment",
      actionUrl: "/assessment",
      isUnread: !readNotifications.includes("assessment-pending"),
    });
  }

  if (recommendations.length > 0) {
    notifications.push({
      id: "recs-ready",
      title: "Matched Internships Ready",
      description: `Found ${recommendations.length} personalized job matches based on your skills.`,
      icon: Briefcase,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
      actionLabel: "Browse Jobs",
      actionTab: "recommendations",
      isUnread: !readNotifications.includes("recs-ready"),
    });
  }

  const visibleNotifications = notifications.filter((n) => !clearedNotifications.includes(n.id));
  const unreadCount = visibleNotifications.filter((n) => n.isUnread).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative pb-16 md:pb-0">
      <Suspense fallback={null}>
        <TabFromUrl onTab={setActiveTab} />
      </Suspense>
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-white overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
                <defs>
                  <linearGradient id="logoGrad3" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1E40AF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <g stroke="url(#logoGrad3)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 6 10 L 16 20 L 6 30" />
                  <path d="M 10 6 L 20 16 L 30 6" />
                  <path d="M 34 10 L 24 20 L 34 30" />
                  <path d="M 10 34 L 20 24 L 30 34" />
                </g>
              </svg>
            </div>
            <span className="font-black text-brand-600 tracking-tight hidden sm:block text-lg">InternX</span>
          </Link>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "recommendations" && recommendations.length > 0 && (
                <span className="ml-1.5 bg-brand-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {recommendations.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Profile & Actions */}
        <div className="flex items-center gap-3 relative">
          {/* Dynamic Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications & Status"
              className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all relative ${
                showNotifications 
                  ? "bg-slate-100 border-slate-300 text-slate-900" 
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-[-48px] sm:right-0 mt-2 w-[280px] sm:w-[340px] bg-white border border-slate-200 shadow-2xl rounded-2xl z-50 py-3 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Notifications</span>
                    <div className="flex items-center gap-2.5">
                      {visibleNotifications.length > 0 ? (
                        <>
                          <button 
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                            className={`text-[10px] font-bold transition-colors flex items-center gap-0.5 ${
                              unreadCount > 0 
                                ? "text-brand-600 hover:text-brand-700 cursor-pointer" 
                                : "text-slate-400 cursor-not-allowed opacity-50"
                            }`}
                          >
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                          </button>
                          <button 
                            onClick={clearAllNotifications}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Clear all
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">All caught up!</span>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {visibleNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-400 text-sm">
                        No notifications
                      </div>
                    ) : (
                      visibleNotifications.map((n) => {
                        const Icon = n.icon;
                        return (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              if (n.isUnread) markAsRead(n.id);
                            }}
                            className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors flex gap-3 items-start cursor-pointer ${
                              n.isUnread ? "bg-slate-50/80 font-medium" : ""
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${n.iconColor}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {n.isUnread && <span className="w-1.5 h-1.5 bg-brand-600 rounded-full shrink-0 animate-pulse" />}
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearNotification(n.id);
                                  }}
                                  title="Clear notification"
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-normal mb-1.5">{n.description}</p>
                              {n.actionTab && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                    if (n.actionTab) setActiveTab(n.actionTab);
                                    setShowNotifications(false);
                                  }}
                                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 transition-colors"
                                >
                                  {n.actionLabel} <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                              {n.actionUrl && (
                                <Link
                                  href={n.actionUrl}
                                  onClick={() => {
                                    markAsRead(n.id);
                                    setShowNotifications(false);
                                  }}
                                  className="text-[10px] font-bold text-brand-600 hover:text-brand-700 flex items-center gap-0.5 transition-colors"
                                >
                                  {n.actionLabel} <ChevronRight className="w-3 h-3" />
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign Out"
            className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors border border-red-100 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden pb-24 md:pb-8 w-full max-w-7xl mx-auto">
        {profileSaveSuccess && (
          <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2.5 rounded-lg text-sm font-medium border border-green-100 shadow-sm">
            <CheckCircle className="w-4 h-4" />
            {profileSaveSuccess}
          </div>
        )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-10 h-10 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Loading your profile...</p>
              </div>
            </div>
          ) : (
            <div className="page-enter max-w-5xl mx-auto">

              {/* ── OVERVIEW TAB ── */}
              {activeTab === "overview" && (
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    Welcome back, {(displayProfile?.name || user?.name)?.split(" ")[0]}! 👋
                  </h1>
                  <p className="text-slate-500 font-medium mb-6">Here&apos;s your internship readiness overview.</p>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="glass-card p-4 sm:p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">ATS Score</span>
                        <FileText className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="text-3xl font-black text-slate-900">{resume?.atsScore ?? "—"}</div>
                      <p className="text-xs text-slate-400 mt-1">{resume ? "out of 100" : "Upload resume"}</p>
                    </div>
                    <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Skills</span>
                        <Code2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="text-3xl font-black text-slate-900">{totalSkills || "—"}</div>
                      <p className="text-xs text-slate-400 mt-1">{totalSkills > 0 ? "skills detected" : "Upload resume"}</p>
                    </div>
                    <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Assessment</span>
                        <Zap className="w-4 h-4 text-accent-600" />
                      </div>
                      <div className="text-3xl font-black text-slate-900">{assessment ? `${assessment.percentage}%` : "—"}</div>
                      <p className="text-xs text-slate-400 mt-1">{assessment ? `${assessment.correctAnswers}/${assessment.totalQuestions}` : "Take assessment"}</p>
                    </div>
                    <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Job Matches</span>
                        <Briefcase className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-3xl font-black text-slate-900">{recommendations.length}</div>
                      <p className="text-xs text-slate-400 mt-1">internships matched</p>
                    </div>
                  </div>

                  {/* MNC Readiness */}
                  <div className="mb-6">
                    <MNCReadinessCard resume={resume} assessment={assessment} />
                  </div>

                  {/* Profile completion card */}
                  {profile && !profile.college && (
                    <div className="mb-4 glass-card p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-800">Complete your profile</p>
                        <p className="text-xs text-blue-600">Add your college and department to improve job matches.</p>
                      </div>
                      <button
                        onClick={() => setShowProfileEdit(true)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shrink-0"
                      >
                        Edit Profile
                      </button>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!resume && (
                      <div className="glass-card p-6 bg-white border border-brand-100 shadow-sm rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                            <Upload className="w-5 h-5 text-brand-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Upload Your Resume</h3>
                            <p className="text-xs text-slate-500">Get AI-powered ATS score instantly</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab("resume")} className="btn-brand w-full text-sm py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
                          Upload Now →
                        </button>
                      </div>
                    )}
                    {resume && !assessment && (
                      <div className="glass-card p-6 bg-white border border-accent-100 shadow-sm rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-accent-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Take Skill Assessment</h3>
                            <p className="text-xs text-slate-500">20 questions based on your resume skills</p>
                          </div>
                        </div>
                        <a href="/assessment" className="btn-brand w-full text-sm py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                          Start Now <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    )}
                    {resume && (
                      <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <Target className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Your Top Skills</h3>
                            <p className="text-xs text-slate-500">{totalSkills} skills extracted from resume</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            ...(resume.extractedSkills.programming || []),
                            ...(resume.extractedSkills.technical || []),
                          ].slice(0, 6).map(s => <SkillChip key={s} skill={s} variant="brand" />)}
                          {totalSkills > 6 && <span className="text-xs text-slate-400 font-medium self-center">+{totalSkills - 6} more</span>}
                        </div>
                      </div>
                    )}
                    {recommendations.length > 0 && (
                      <div className="glass-card p-6 bg-white border border-green-100 shadow-sm rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <Award className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Top Match</h3>
                            <p className="text-xs text-slate-500">{recommendations[0]?.internship?.company} · {recommendations[0]?.matchPercentage}% match</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab("recommendations")} className="btn-brand w-full text-sm py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
                          View All Matches →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── RESUME TAB ── */}
              {activeTab === "resume" && (
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-6">Resume & ATS Analysis</h1>

                  {/* Upload section */}
                  <div className="glass-card p-6 mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                    <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-brand-600" />
                      {resume ? "Update Resume" : "Upload Resume"}
                    </h2>

                    {uploadError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-600 text-sm">
                        <XCircle className="w-4 h-4 shrink-0" /> {uploadError}
                      </div>
                    )}
                    {uploadSuccess && (
                      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-green-700 text-sm font-medium">
                        <CheckCircle className="w-4 h-4 shrink-0" /> {uploadSuccess}
                      </div>
                    )}

                    <label
                      htmlFor="resume-upload"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 ${
                        uploading ? "border-brand-300 bg-brand-50" : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
                      }`}
                    >
                      {uploading ? (
                        <>
                          <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin mb-3" />
                          <p className="text-sm text-brand-700 font-semibold">Analyzing your resume with AI…</p>
                          <p className="text-xs text-slate-500 mt-1">This may take 15–30 seconds</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-400 mb-3" />
                          <p className="text-sm font-semibold text-slate-700">Drop your resume here or click to browse</p>
                          <p className="text-xs text-slate-500 font-medium mt-1">PDF or DOCX · Max 10MB</p>
                        </>
                      )}
                      <input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.docx,.doc"
                        className="hidden"
                        onChange={handleResumeUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* ATS Results */}
                  {resume && (
                    <>
                      {resume.atsScore === 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-amber-700 text-sm font-medium">
                          <AlertCircle className="w-5 h-5 shrink-0" /> 
                          AI Analysis is incomplete. Your resume is securely saved, but AI features (score, skills, assessment) will be unavailable until analysis succeeds.
                        </div>
                      )}
                      {/* Score + Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="glass-card p-6 flex flex-col items-center bg-white border border-slate-200 shadow-sm rounded-xl">
                          <ATSScoreRing score={resume.atsScore} />
                          <p className="text-xs text-slate-500 mt-3 text-center">
                            <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-medium hover:underline flex items-center gap-1 justify-center">
                              <ExternalLink className="w-3 h-3" /> View Resume
                            </a>
                          </p>
                          <p className="text-xs text-slate-400 mt-1 text-center">{resume.fileName}</p>
                        </div>

                        <div className="md:col-span-2 space-y-3">
                          <div className="glass-card p-5 bg-white border border-green-100 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-green-700 flex items-center gap-2 mb-3">
                              <CheckCircle className="w-4 h-4" /> Strengths ({resume.strengths?.length ?? 0})
                            </h3>
                            <ul className="space-y-1.5">
                              {(resume.strengths?.length > 0) ? resume.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-green-500 font-bold mt-0.5 shrink-0">✓</span> {s}
                                </li>
                              )) : (
                                <li className="text-sm text-slate-400">Upload a more detailed resume to see strengths.</li>
                              )}
                            </ul>
                          </div>
                          <div className="glass-card p-5 bg-white border border-red-100 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 mb-3">
                              <XCircle className="w-4 h-4" /> Areas to Improve ({resume.weaknesses?.length ?? 0})
                            </h3>
                            <ul className="space-y-1.5">
                              {(resume.weaknesses?.length > 0) ? resume.weaknesses.map((w, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <span className="text-red-500 font-bold mt-0.5 shrink-0">✗</span> {w}
                                </li>
                              )) : (
                                <li className="text-sm font-medium">
                                  {resume.atsScore === 0 
                                    ? <span className="text-slate-400">Analysis pending to identify areas for improvement.</span>
                                    : <span className="text-green-600">Great job! No major weaknesses found.</span>
                                  }
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Improvement Suggestions */}
                      {(resume.improvements?.length ?? 0) > 0 && (
                        <div className="glass-card p-5 mb-6 bg-amber-50 border border-amber-200 shadow-sm rounded-xl">
                          <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2 mb-4">
                            <Lightbulb className="w-4 h-4" /> AI-Powered Suggestions to Boost Your ATS Score
                          </h3>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {resume.improvements.map((imp, i) => (
                              <li key={i} className="flex items-start gap-2 bg-white border border-amber-100 rounded-lg px-3 py-2">
                                <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-700">{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* ── ATS Score Breakdown (10 Dimensions) ── */}
                      {(resume as any).breakdown && (
                        <div className="glass-card p-5 mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <BarChart3 className="w-4 h-4 text-brand-600" /> Detailed ATS Score Breakdown
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            {[
                              { label: "Technical Skills", key: "technicalSkills", max: 25, color: "bg-brand-500" },
                              { label: "Projects & Experience", key: "projects", max: 20, color: "bg-purple-500" },
                              { label: "Education", key: "education", max: 10, color: "bg-blue-500" },
                              { label: "Certifications", key: "certifications", max: 8, color: "bg-green-500" },
                              { label: "Formatting & Structure", key: "formatting", max: 7, color: "bg-yellow-500" },
                              { label: "Contact Information", key: "contactInfo", max: 7, color: "bg-cyan-500" },
                              { label: "Professional Summary", key: "professionalSummary", max: 6, color: "bg-indigo-500" },
                              { label: "Action Verbs", key: "actionVerbs", max: 7, color: "bg-orange-500" },
                              { label: "Quantified Achievements", key: "quantifiedAchievements", max: 5, color: "bg-rose-500" },
                              { label: "Soft Skills", key: "softSkills", max: 5, color: "bg-teal-500" },
                            ].map(({ label, key, max, color }) => {
                              const val = ((resume as any).breakdown as any)?.[key] ?? 0;
                              const pct = Math.round((val / max) * 100);
                              return (
                                <div key={key}>
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-600 font-medium">{label}</span>
                                    <span className="font-bold text-slate-800">{val}/{max}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── Domain + Hiring Probability ── */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {(resume as any).detectedDomain && (
                          <div className="glass-card p-5 bg-indigo-50 border border-indigo-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 mb-3">
                              <Globe className="w-4 h-4" /> Detected Domain
                            </h3>
                            <p className="text-lg font-black text-indigo-900 mb-2">{(resume as any).detectedDomain}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {((resume as any).possibleRoles || []).slice(0, 4).map((role: string) => (
                                <span key={role} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium">{role}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(resume as any).hiringProbability && (
                          <div className={`glass-card p-5 shadow-sm rounded-xl border ${
                            (resume as any).hiringProbability === "Very High" ? "bg-green-50 border-green-200" :
                            (resume as any).hiringProbability === "High" ? "bg-emerald-50 border-emerald-200" :
                            (resume as any).hiringProbability === "Medium" ? "bg-amber-50 border-amber-200" :
                            "bg-red-50 border-red-200"
                          }`}>
                            <h3 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
                              ["Very High","High"].includes((resume as any).hiringProbability) ? "text-green-700" :
                              (resume as any).hiringProbability === "Medium" ? "text-amber-700" : "text-red-700"
                            }`}>
                              <TrendingUp className="w-4 h-4" /> Hiring Probability
                            </h3>
                            <p className={`text-2xl font-black mb-1 ${
                              ["Very High","High"].includes((resume as any).hiringProbability) ? "text-green-800" :
                              (resume as any).hiringProbability === "Medium" ? "text-amber-800" : "text-red-800"
                            }`}>{(resume as any).hiringProbability}</p>
                            <div className="flex gap-4 mt-2 text-xs font-semibold flex-wrap">
                              {(resume as any).readabilityScore && <span className="text-slate-500">Readability: <span className="text-slate-800">{(resume as any).readabilityScore}/100</span></span>}
                              {(resume as any).professionalismScore && <span className="text-slate-500">Professionalism: <span className="text-slate-800">{(resume as any).professionalismScore}/100</span></span>}
                              {(resume as any).keywordDensity != null && <span className="text-slate-500">Keyword Density: <span className="text-slate-800">{(resume as any).keywordDensity}%</span></span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Recruiter Impression ── */}
                      {(resume as any).recruiterImpression && (
                        <div className="glass-card p-5 mb-6 bg-slate-50 border border-slate-200 shadow-sm rounded-xl">
                          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-slate-500" /> Recruiter Impression
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed italic">"{(resume as any).recruiterImpression}"</p>
                        </div>
                      )}

                      {/* ── Missing Skills Alert ── */}
                      {(resume as any).missingSkills?.length > 0 && (
                        <div className="glass-card p-5 mb-6 bg-rose-50 border border-rose-200 shadow-sm rounded-xl">
                          <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2 mb-3">
                            <AlertCircle className="w-4 h-4" /> Missing Essential Skills (Add to Resume)
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {(resume as any).missingSkills.map((skill: string) => (
                              <span key={skill} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 font-medium">+ {skill}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extracted Skills — detailed breakdown */}
                      <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-5">
                          <BookOpen className="w-4 h-4 text-brand-600" /> Extracted Skills from Your Resume
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            {
                              label: "Programming Languages",
                              icon: Code2,
                              skills: resume.extractedSkills.programming || [],
                              variant: "brand" as const,
                              color: "bg-brand-500",
                            },
                            {
                              label: "Technical Skills & Frameworks",
                              icon: Server,
                              skills: resume.extractedSkills.technical || [],
                              variant: "purple" as const,
                              color: "bg-purple-500",
                            },
                            {
                              label: "Tools & Platforms",
                              icon: Wrench,
                              skills: resume.extractedSkills.tools || [],
                              variant: "orange" as const,
                              color: "bg-orange-500",
                            },
                            {
                              label: "Certifications",
                              icon: Award,
                              skills: (resume.extractedSkills.certifications || []).map((c: any) => typeof c === 'string' ? c : c.certificationName).filter(Boolean),
                              variant: "green" as const,
                              color: "bg-green-500",
                            },
                          ].map(({ label, icon: Icon, skills, variant, color }) => (
                            <div key={label}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-5 h-5 rounded flex items-center justify-center ${color}`}>
                                  <Icon className="w-3 h-3 text-white" />
                                </div>
                                <p className="text-xs text-slate-600 font-semibold">{label}</p>
                                <span className="text-xs text-slate-400 ml-auto">{skills.length} found</span>
                              </div>
                              {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {skills.map((skill) => <SkillChip key={skill} skill={skill} variant={variant} />)}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">None detected — consider adding to your resume</p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Soft Skills */}
                        {(resume.extractedSkills.soft?.length ?? 0) > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-600 font-semibold mb-2 flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" /> Soft Skills
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(resume.extractedSkills.soft || []).map(s => <SkillChip key={s} skill={s} variant="slate" />)}
                            </div>
                          </div>
                        )}

                        {/* Education */}
                        {(resume.extractedSkills.education?.length ?? 0) > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-600 font-semibold mb-2 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3 text-blue-500" /> Education
                            </p>
                            <ul className="space-y-1">
                              {(resume.extractedSkills.education || []).map((e: any, i) => (
                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                  <GraduationCap className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" /> 
                                  {typeof e === 'string' ? e : [e.degreeName || e.degreeType, e.school].filter(Boolean).join(" at ") || "Education Details"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {/* ── Job Description Matching ── */}
                      <div className="glass-card p-6 mt-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                          <Briefcase className="w-5 h-5 text-brand-600" /> Job Description Matcher
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Paste a job description below to see how well your resume matches it.</p>
                        
                        <div className="mb-4">
                          <textarea
                            className="w-full h-32 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none transition-all"
                            placeholder="Paste job description here..."
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                          />
                        </div>
                        
                        {jdMatchError && (
                          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center gap-2">
                            <XCircle className="w-4 h-4 shrink-0" /> {jdMatchError}
                          </div>
                        )}

                        <button
                          onClick={handleJDMatch}
                          disabled={matchingJd}
                          className="btn-brand w-full md:w-auto px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {matchingJd ? (
                            <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Analyzing Match...</>
                          ) : (
                            <><Target className="w-4 h-4" /> Analyze Match</>
                          )}
                        </button>

                        {jdMatchResult && (
                          <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-md font-bold text-slate-800">Match Results</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-500">Overall Match</span>
                                <span className={`text-xl font-black ${
                                  jdMatchResult.matchScore >= 80 ? "text-green-600" :
                                  jdMatchResult.matchScore >= 60 ? "text-amber-600" : "text-red-600"
                                }`}>{jdMatchResult.matchScore}%</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
                                <h5 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Matched Skills</h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {jdMatchResult.matchedSkills.length > 0 ? (
                                    jdMatchResult.matchedSkills.map((s: string) => <SkillChip key={s} skill={s} variant="green" />)
                                  ) : (
                                    <span className="text-xs text-green-600/70 italic">None found</span>
                                  )}
                                </div>
                              </div>
                              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl">
                                <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-3 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Missing Skills</h5>
                                <div className="flex flex-wrap gap-1.5">
                                  {jdMatchResult.missingSkills.length > 0 ? (
                                    jdMatchResult.missingSkills.map((s: string) => <SkillChip key={s} skill={s} variant="red" />)
                                  ) : (
                                    <span className="text-xs text-rose-600/70 italic">None! Perfect match.</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Experience Alignment</h5>
                                <p className="text-sm text-slate-600">{jdMatchResult.experienceMatch}</p>
                              </div>
                              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Education Alignment</h5>
                                <p className="text-sm text-slate-600">{jdMatchResult.educationMatch}</p>
                              </div>
                              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Culture & Soft Skills</h5>
                                <p className="text-sm text-slate-600">{jdMatchResult.cultureFit}</p>
                              </div>
                              {jdMatchResult.recommendations?.length > 0 && (
                                <div className="bg-brand-50 border border-brand-100 p-4 rounded-xl">
                                  <h5 className="text-xs font-bold text-brand-800 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Actionable Recommendations</h5>
                                  <ul className="list-disc list-inside space-y-1">
                                    {jdMatchResult.recommendations.map((r: string, i: number) => (
                                      <li key={i} className="text-sm text-brand-700">{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                    </>
                  )}

                  {/* No resume uploaded yet */}
                  {!resume && !uploading && (
                    <div className="glass-card p-8 text-center bg-white border border-slate-200 shadow-sm rounded-xl">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold mb-1">No resume uploaded yet</p>
                      <p className="text-slate-400 text-sm">Upload your PDF or DOCX resume above to get your ATS score and AI-powered feedback.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ASSESSMENT TAB ── */}
              {activeTab === "assessment" && (
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-6">Skill Assessment</h1>

                  {!resume ? (
                    <div className="glass-card p-8 text-center bg-white border border-slate-200 shadow-sm rounded-xl">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold mb-1">No resume uploaded yet</p>
                      <p className="text-slate-400 text-sm mb-4">Upload your resume first — questions are generated based on your specific skills.</p>
                      <button onClick={() => setActiveTab("resume")} className="btn-brand text-sm px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
                        Upload Resume
                      </button>
                    </div>
                  ) : assessment ? (
                    <div className="space-y-6">
                      <div className="glass-card p-8 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <div className="text-center mb-8">
                          <div className="text-6xl font-black mb-2" style={{
                            color: assessment.percentage >= 75 ? "#10b981" : assessment.percentage >= 50 ? "#f59e0b" : "#ef4444"
                          }}>
                            {assessment.percentage}%
                          </div>
                          <p className="text-slate-500 font-medium">Assessment Score</p>
                          <div className="flex items-center justify-center gap-1.5 mt-2">
                            {assessment.percentage >= 75
                              ? <><Trophy className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600 font-medium">Excellent! You are ready for MNC interviews</span></>
                              : assessment.percentage >= 50
                              ? <><ThumbsUp className="w-4 h-4 text-amber-500" /><span className="text-sm text-amber-600 font-medium">Good effort — keep practising</span></>
                              : <><BookMarked className="w-4 h-4 text-red-400" /><span className="text-sm text-red-500 font-medium">Review the topics and retake to improve</span></>}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          {[
                            { label: "Correct", value: assessment.correctAnswers, color: "text-green-600" },
                            { label: "Wrong", value: assessment.totalQuestions - assessment.correctAnswers, color: "text-red-500" },
                            { label: "Total", value: assessment.totalQuestions, color: "text-brand-600" },
                          ].map((stat) => (
                            <div key={stat.label} className="text-center glass-card p-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl">
                              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                              <div className="text-xs text-slate-500 font-medium mt-1">{stat.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                          <div
                            className="h-3 rounded-full bg-brand-600 transition-all duration-1000"
                            style={{ width: `${assessment.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 text-center">
                          Completed on {new Date(assessment.completedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                          {/* Review Answers button */}
                          {assessment.questions && assessment.questions.length > 0 && (
                            <button
                              onClick={() => {
                                // Store review data in localStorage so the assessment page can read it
                                localStorage.setItem("mcq_review_data", JSON.stringify({
                                  questions: assessment.questions,
                                  answers: assessment.userAnswers || [],
                                  correctAnswerMap: assessment.correctAnswerMap || {},
                                  result: {
                                    percentage: assessment.percentage,
                                    correctAnswers: assessment.correctAnswers,
                                    totalQuestions: assessment.totalQuestions,
                                  },
                                }));
                                router.push("/assessment?mode=review");
                              }}
                              className="inline-flex items-center gap-2 text-sm px-6 py-2.5 rounded-lg font-medium border-2 border-brand-600 text-brand-700 hover:bg-brand-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" /> Review Answers
                            </button>
                          )}
                          <a href="/assessment" className="btn-brand inline-flex items-center gap-2 text-sm px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
                            <RefreshCw className="w-4 h-4" /> Retake Assessment
                          </a>
                        </div>

                      </div>

                      {/* Skill-based study recommendations */}
                      {resume && (
                        <div className="glass-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
                          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-brand-600" /> Study Recommendations Based on Your Skills
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              ...(resume.extractedSkills.programming || []),
                              ...(resume.extractedSkills.technical || []),
                            ].slice(0, 6).map((skill) => (
                              <div key={skill} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
                                <Code2 className="w-4 h-4 text-brand-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800">{skill}</p>
                                  <p className="text-xs text-slate-400">Study advanced topics to ace interviews</p>
                                </div>
                                <a
                                  href={`https://www.google.com/search?q=${encodeURIComponent(skill + " interview questions")}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-brand-600 hover:text-brand-700"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-card p-8 text-center bg-white border border-slate-200 shadow-sm rounded-xl">
                      <Zap className="w-12 h-12 text-brand-600 mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Ready for Your Skill Assessment?</h2>
                      <p className="text-slate-500 font-medium mb-2">
                        20 AI-generated questions based on your resume skills: <span className="text-brand-600 font-bold">
                          {[...(resume.extractedSkills.programming || []), ...(resume.extractedSkills.technical || [])].slice(0, 3).join(", ")}
                          {totalSkills > 3 ? " & more" : ""}
                        </span>
                      </p>
                      <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400 font-semibold mb-6">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 30 minutes</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> 20 questions</span>
                        <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> 3 difficulty levels</span>
                      </div>

                      {/* Skills that will be tested */}
                      <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                        {[
                          ...(resume.extractedSkills.programming || []),
                          ...(resume.extractedSkills.technical || []),
                        ].slice(0, 8).map(s => <SkillChip key={s} skill={s} variant="brand" />)}
                      </div>

                      <a href="/assessment" className="btn-brand inline-flex items-center gap-2 text-sm px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold">
                        Start Assessment <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── RECOMMENDATIONS TAB ── */}
              {activeTab === "recommendations" && (
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Internship Recommendations</h1>
                  <p className="text-slate-500 mb-6 text-sm">Ranked by skill match and assessment score</p>

                  {recommendations.length === 0 ? (
                    <div className="glass-card p-8 text-center bg-white border border-slate-200 shadow-sm rounded-xl">
                      <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold mb-1">No recommendations yet</p>
                      <p className="text-sm text-slate-400 mb-6">Complete your resume upload and skill assessment to get personalized job matches.</p>
                      <button onClick={() => setActiveTab(resume ? "assessment" : "resume")} className="btn-brand text-sm px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">
                        {resume ? "Take Assessment" : "Upload Resume"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="glass-card p-4 sm:p-6 bg-white border border-slate-200 hover:border-brand-300 shadow-sm rounded-xl transition-all duration-200 hover:shadow-md">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-2 mb-1">
                                {i === 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold border border-green-200">
                                    <Trophy className="w-3 h-3" /> Best Match
                                  </span>
                                )}
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{rec.internship?.title}</h3>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-500 font-medium flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5 shrink-0" />{rec.internship?.company}</span>
                                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 shrink-0" />{rec.internship?.location}</span>
                              </p>
                            </div>
                            <div className="text-left sm:text-right shrink-0 mt-1 sm:mt-0 bg-brand-50 sm:bg-transparent px-3 py-2 sm:p-0 rounded-lg sm:rounded-none w-full sm:w-auto flex sm:block items-center justify-between">
                              <div className="text-xs text-brand-700 sm:text-slate-400 font-bold sm:font-semibold uppercase tracking-wider sm:tracking-normal">Overall Match</div>
                              <div className="text-lg sm:text-2xl font-black text-brand-600">{rec.matchPercentage || 0}%</div>
                            </div>
                          </div>

                          {/* Match bar */}
                          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                            <div className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600" style={{ width: `${rec.matchPercentage}%` }} />
                          </div>

                          {/* Score breakdown */}
                          <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 sm:p-3">
                              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                                <Code2 className="w-3 h-3 shrink-0" /> Skill Match
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                                  <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${rec.skillScore || 0}%` }} />
                                </div>
                                <span className="text-xs font-bold text-purple-600">{rec.skillScore || 0}%</span>
                              </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 sm:p-3">
                              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                                <Zap className="w-3 h-3 shrink-0" /> Assessment
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5 hidden sm:block">
                                  <div className="h-1.5 rounded-full bg-accent-500" style={{ width: `${rec.assessmentScore || 0}%` }} />
                                </div>
                                <span className="text-xs font-bold text-accent-600">{rec.assessmentScore || 0}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 bg-slate-100 rounded-md px-2 py-1"><Clock className="w-3 h-3" /> {rec.internship?.duration}</span>
                            <span className="flex items-center gap-1 bg-green-50 text-green-700 rounded-md px-2 py-1"><DollarSign className="w-3 h-3" /> {rec.internship?.stipend}</span>
                          </div>

                          {/* Matched skills */}
                          {rec.matchedSkills?.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs text-slate-500 font-semibold mb-1.5">Your matching skills:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {rec.matchedSkills.slice(0, 8).map((skill) => (
                                  <span key={skill} className="badge badge-success text-xs">{skill}</span>
                                ))}
                                {rec.matchedSkills.length > 8 && (
                                  <span 
                                    className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded cursor-help"
                                    title={rec.matchedSkills.slice(8).join(', ')}
                                  >
                                    +{rec.matchedSkills.length - 8} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Expanded Job Description Section */}
                          {expandedRecs[i] && (
                            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-lg p-4 mb-4">
                              <h4 className="text-sm font-bold text-slate-800 mb-2">About the Role</h4>
                              <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap leading-relaxed">
                                {rec.internship?.description || "No description available."}
                              </p>
                              
                              <h4 className="text-sm font-bold text-slate-800 mb-2">Required Skills</h4>
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {rec.internship?.requiredSkills?.map((skill, idx) => (
                                  <span key={idx} className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-1 rounded shadow-sm">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              
                              {rec.internship?.category && (
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 mb-2">Category</h4>
                                  <p className="text-sm text-slate-600">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                                      {rec.internship.category}
                                    </span>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
                            <button
                              onClick={() => setExpandedRecs(prev => ({ ...prev, [i]: !prev[i] }))}
                              className="text-sm text-brand-600 font-semibold hover:text-brand-700 transition-colors flex items-center gap-1 w-full sm:w-auto justify-center"
                            >
                              {expandedRecs[i] ? "Hide Details" : "View Full Job Description"}
                            </button>
                            <button
                            onClick={(e) => {
                              e.preventDefault();
                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              btn.innerHTML = `<span class="flex items-center gap-2"><svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Applying...</span>`;
                              setTimeout(() => {
                                btn.innerHTML = `<span class="flex items-center gap-2 text-green-100"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg> Application Sent!</span>`;
                                btn.classList.remove('bg-brand-600', 'hover:bg-brand-700');
                                btn.classList.add('bg-green-600', 'hover:bg-green-700');
                                
                                // Redirect after showing success state
                                setTimeout(() => {
                                  if (rec.internship?.applyLink) {
                                    window.open(rec.internship.applyLink, '_blank');
                                  }
                                  
                                  // Optionally reset button state after a bit
                                  setTimeout(() => {
                                    btn.innerHTML = originalText;
                                    btn.classList.add('bg-brand-600', 'hover:bg-brand-700');
                                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                                  }, 1000);
                                }, 800);
                              }, 1000);
                            }}
                            className="btn-brand w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-all"
                          >
                            Apply Now <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}


                </div>
              )}

              {/* ── PROFILE TAB ── */}
              {activeTab === "profile" && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
                      <p className="text-slate-500 text-sm">Manage your academic and contact details for internship matchmaking.</p>
                    </div>
                    <button
                      onClick={() => setShowProfileEdit(true)}
                      className="btn-brand self-start sm:self-center inline-flex items-center gap-2 text-sm px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-brand-500/10"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Profile Details
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Left side card - Summary */}
                    <div className="glass-card bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center h-fit lg:self-start">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-brand-500/20 mb-4 ring-4 ring-brand-50">
                        {(displayProfile?.name || user?.name)?.[0]?.toUpperCase() || "S"}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">{displayProfile?.name || "Student"}</h2>
                      <p className="text-sm font-semibold text-brand-600 mb-3">{displayProfile?.degree || "BE"} · {displayProfile?.department || "Computer Science"}</p>
                      
                      {/* ATS Score Ring Animation */}
                      <div className="w-full py-3 border-t border-slate-100 flex flex-col items-center">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">ATS Score</p>
                        {resume ? (
                          <ATSScoreRing score={resume.atsScore} />
                        ) : (
                          <div className="flex flex-col items-center text-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl w-full">
                            <FileText className="w-5 h-5 text-slate-300 mb-1" />
                            <p className="text-xs font-semibold text-slate-500">No Resume Uploaded</p>
                            <button 
                              onClick={() => setActiveTab("resume")}
                              className="text-[10px] text-brand-600 font-bold hover:underline mt-0.5"
                            >
                              Upload Resume
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Profile Strength */}
                      <div className="w-full pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                          <span>Profile Completeness</span>
                          <span className="text-brand-600">
                            {(() => {
                              let points = 0;
                              if (displayProfile?.name) points += 20;
                              if (displayProfile?.phone) points += 20;
                              if (displayProfile?.college) points += 20;
                              if (displayProfile?.degree && displayProfile?.department) points += 20;
                              if (displayProfile?.year) points += 20;
                              return `${points}%`;
                            })()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-brand-50 to-brand-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: (() => {
                                let points = 0;
                                if (displayProfile?.name) points += 20;
                                if (displayProfile?.phone) points += 20;
                                if (displayProfile?.college) points += 20;
                                if (displayProfile?.degree && displayProfile?.department) points += 20;
                                if (displayProfile?.year) points += 20;
                                return `${points}%`;
                              })()
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2">Complete your profile details to unlock better job recommendations.</p>
                      </div>
                    </div>

                    {/* Right side cards - Information Details */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Academic Profile */}
                      <div className="glass-card bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <GraduationCap className="w-5 h-5 text-brand-600" /> Academic Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">College</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              {displayProfile?.college || <span className="text-xs text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Academic Year</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {displayProfile?.year ? `${displayProfile.year}${displayProfile.year === 1 ? "st" : displayProfile.year === 2 ? "nd" : displayProfile.year === 3 ? "rd" : "th"} Year` : <span className="text-xs text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Degree</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <GraduationCap className="w-4 h-4 text-slate-400" />
                              {displayProfile?.degree || <span className="text-xs text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Department</span>
                            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-slate-400" />
                              {displayProfile?.department || <span className="text-xs text-slate-400 italic font-medium">Not provided</span>}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resume & ATS Status */}
                      <div className="glass-card bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <FileText className="w-5 h-5 text-brand-600" /> Resume & ATS Status
                        </h3>
                        {resume ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                                <FileText className="w-5.5 h-5.5 text-brand-600" />
                              </div>
                              <div className="min-w-0">
                                <span className="block text-xs font-bold text-slate-600 truncate">{resume.fileName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-semibold text-slate-400">ATS Score:</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    resume.atsScore >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                    resume.atsScore >= 50 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                    "bg-red-50 text-red-700 border border-red-200"
                                  }`}>
                                    {resume.atsScore}/100
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a 
                                href={resume.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> View Resume
                              </a>
                              <button 
                                onClick={() => setActiveTab("resume")}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 border border-brand-200 px-3.5 py-2 rounded-lg hover:bg-brand-100/50 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Update
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">
                            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-600">No resume uploaded yet</p>
                            <p className="text-xs text-slate-400 mb-4">Upload your resume to calculate your ATS score.</p>
                            <button 
                              onClick={() => setActiveTab("resume")}
                              className="text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                            >
                              Upload Resume
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Contact Details */}
                      <div className="glass-card bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <User className="w-5 h-5 text-brand-600" /> Contact & Account
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-3 min-w-0">
                              <Globe className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="block text-[10px] font-semibold text-slate-400 uppercase">Email Address</span>
                                <span className="text-sm font-bold text-slate-800 block break-all">{displayProfile?.email}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">Verified</span>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                            <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="block text-[10px] font-semibold text-slate-400 uppercase">Phone Number</span>
                              <span className="text-sm font-bold text-slate-800 block truncate">{displayProfile?.phone || <span className="text-xs text-slate-400 italic font-medium">Not provided</span>}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

      {/* Profile Edit Modal */}
      {showProfileEdit && profile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setShowProfileEdit(false)}
          onSave={handleProfileSave}
        />
      )}

      {/* Grok Assistant Floating Chatbot */}
      <ChatWidget />

      {/* Mobile Bottom Navigation — z-40 so ChatWidget (z-[60]) floats above */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around z-40 pb-safe">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full py-3 ${
              activeTab === tab.id ? "text-brand-600 bg-brand-50/50" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? "text-brand-600" : ""}`} />
            <span className="text-[10px] font-medium">{tab.mobileLabel || tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
