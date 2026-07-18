"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, User, Mail, Lock, Phone, GraduationCap,
  BookOpen, Building2, Calendar, Eye, EyeOff, AlertCircle,
  CheckCircle, Loader2, ArrowLeft, ArrowRight,
} from "lucide-react";

type Step = 1 | 2 | 3;

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

const Field = ({
  id, label, type = "text", value, onChange, placeholder, icon: Icon, required = true,
}: { id: string, label: string, type?: string, value: string, onChange: (v: string) => void, placeholder?: string, icon?: any, required?: boolean }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input-dark bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 ${Icon ? "!pl-10" : ""}`}
        placeholder={placeholder}
        required={required}
      />
    </div>
  </div>
);

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomCollege, setIsCustomCollege] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    college: "", degree: "", department: "", year: "",
    password: "", confirmPassword: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep = (): boolean => {
    setError("");
    if (step === 1) {
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
        setError("Please fill in all personal information fields.");
        return false;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.email)) {
        setError("Please enter a valid email address.");
        return false;
      }
    }
    if (step === 2) {
      if (!form.college.trim() || !form.degree.trim() || !form.department.trim() || !form.year) {
        setError("Please fill in all academic information fields.");
        return false;
      }
    }
    if (step === 3) {
      if (!form.password || form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return false;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          college: form.college,
          degree: form.degree,
          department: form.department,
          year: form.year,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ["Personal Info", "Academic Info", "Set Password"];
  const stepDescs = ["Tell us about yourself", "Your educational background", "Secure your account"];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden bg-slate-50">
      <div className="w-full max-w-md relative z-10 page-enter">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
                <defs>
                  <linearGradient id="logoGradReg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1E40AF" />
                    <stop offset="1" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <g stroke="url(#logoGradReg)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 6 10 L 16 20 L 6 30" />
                  <path d="M 10 6 L 20 16 L 30 6" />
                  <path d="M 34 10 L 24 20 L 34 30" />
                  <path d="M 10 34 L 20 24 L 30 34" />
                </g>
              </svg>
            </div>
            <span className="text-2xl font-black text-brand-600 tracking-tight">InternX</span>
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s < step
                    ? "bg-brand-600 text-white"
                    : s === step
                    ? "bg-brand-50 border-2 border-brand-600 text-brand-700 font-bold"
                    : "bg-white border border-slate-200 text-slate-400"
                }`}
              >
                {s < step ? <CheckCircle className="w-4 h-4 text-white" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                    s < step ? "bg-brand-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 bg-white border border-slate-200 shadow-brand-lg rounded-2xl">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{stepTitles[step - 1]}</h1>
          <p className="text-sm text-slate-500 mb-6">{stepDescs[step - 1]}</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-5 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }} className="space-y-4">
            {step === 1 && (
              <>
                <Field id="name" label="Full Name" value={form.name} onChange={(v: string) => update("name", v)} placeholder="John Doe" icon={User} />
                <Field id="email" label="Email Address" type="email" value={form.email} onChange={(v: string) => update("email", v)} placeholder="you@example.com" icon={Mail} />
                <Field id="phone" label="Phone Number" type="tel" value={form.phone} onChange={(v: string) => update("phone", v)} placeholder="+91 9876543210" icon={Phone} />
              </>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="college-select" className="block text-sm font-medium text-slate-700 mb-1.5">
                    College/University Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      id="college-select"
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
                      className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 appearance-none w-full"
                      required={!isCustomCollege}
                    >
                      <option value="" disabled>Select College/University</option>
                      {COLLEGES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>

                {isCustomCollege && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Field 
                      id="custom-college" 
                      label="Enter your College/University Name" 
                      value={form.college} 
                      onChange={(v: string) => update("college", v)} 
                      placeholder="Type your college name" 
                      icon={Building2} 
                      required={isCustomCollege} 
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="degree" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Degree <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="degree"
                        value={form.degree}
                        onChange={(e) => update("degree", e.target.value)}
                        className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 appearance-none w-full"
                        required
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
                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Current Year <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <select
                        id="year"
                        value={form.year}
                        onChange={(e) => update("year", e.target.value)}
                        className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 appearance-none w-full"
                        required
                      >
                        <option value="" disabled>Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                        <option value="Graduated">Graduated</option>
                      </select>
                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Department / Specialization <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      id="department"
                      value={form.department}
                      onChange={(e) => update("department", e.target.value)}
                      className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600 appearance-none w-full"
                      required
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
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="input-dark !pl-10 pr-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                      placeholder="Min. 6 characters"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      className="input-dark !pl-10 bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                      placeholder="Repeat password"
                      required
                    />
                  </div>
                </div>
                {form.password && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { check: form.password.length >= 6, label: "6+ chars" },
                      { check: /[A-Z]/.test(form.password), label: "Uppercase" },
                      { check: /[0-9]/.test(form.password), label: "Number" },
                    ].map((item) => (
                      <span key={item.label} className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${item.check ? "badge-success" : "badge-error"}`}>
                        {item.check ? "✓" : "✗"} {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              <button
                id={step === 3 ? "register-submit" : "register-next"}
                type="submit"
                disabled={loading}
                className="btn-brand flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</>
                ) : step === 3 ? (
                  <><CheckCircle className="w-4 h-4" /> Create Account</>
                ) : (
                  <>Next <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
