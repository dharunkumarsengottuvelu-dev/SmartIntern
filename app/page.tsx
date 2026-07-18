import Link from "next/link";
import Image from "next/image";
import { BookOpen, Briefcase, Star, Zap, ArrowRight, CheckCircle, Menu } from "lucide-react";

export default function HomePage() {
  const features = [
    { icon: BookOpen, title: "AI Resume Analysis", desc: "Upload your resume and get instant ATS scoring with detailed improvement suggestions." },
    { icon: Zap, title: "Skill-Based MCQ Assessment", desc: "Dynamically generated questions based on YOUR skills extracted from your resume." },
    { icon: Briefcase, title: "Smart Recommendations", desc: "Get top internship matches using 60% skill matching + 40% assessment performance." },
  ];

  const steps = [
    { step: "01", title: "Register & Upload Resume", desc: "Create an account and upload your PDF/DOCX resume." },
    { step: "02", title: "Get ATS Analysis", desc: "AI extracts your skills and generates an ATS score with feedback." },
    { step: "03", title: "Take Assessment", desc: "Answer 20 dynamic MCQs generated from your resume skills." },
    { step: "04", title: "Receive Recommendations", desc: "Get personalized internship matches ranked by compatibility." },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-[1920px] mx-auto border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1.5">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1E40AF" />
                  <stop offset="1" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <g stroke="url(#logoGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 6 10 L 16 20 L 6 30" />
                <path d="M 10 6 L 20 16 L 30 6" />
                <path d="M 34 10 L 24 20 L 34 30" />
                <path d="M 10 34 L 20 24 L 30 34" />
              </g>
            </svg>
          </div>
          <span className="text-xl sm:text-2xl font-black text-brand-600 tracking-tight">InternX</span>
        </Link>
        
        {/* Mobile Menu Button - Visual Only */}
        <div className="md:hidden flex items-center gap-2">
           <Link href="/login" className="text-sm text-slate-600 font-medium px-3 py-2">
             Sign In
           </Link>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link href="/login" className="text-sm lg:text-base text-slate-600 hover:text-slate-900 font-medium transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/register" className="btn-brand text-sm lg:text-base px-6 py-2.5 shadow-brand">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center pt-12 sm:pt-20 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-3 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm text-brand-700 font-medium mb-6 sm:mb-8 shadow-sm">
          <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-brand-600" />
          AI-Powered Internship Matching
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight sm:leading-tight text-slate-900 px-2">
          Find Your Perfect
          <span className="text-brand-600 block mt-1 sm:mt-2">Internship</span>
          with AI
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4 sm:px-0">
          Upload your resume, take an adaptive skill assessment, and receive personalized internship recommendations — all powered by cutting-edge AI technology.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md sm:max-w-none mx-auto px-4 sm:px-0">
          <Link href="/register" className="btn-brand w-full sm:w-auto flex items-center justify-center gap-2 text-base sm:text-lg px-8 py-3.5 sm:py-4 shadow-brand-lg">
            Start for Free <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="glass-card w-full sm:w-auto flex items-center justify-center gap-2 text-base sm:text-lg px-8 py-3.5 sm:py-4 text-slate-700 hover:bg-slate-50 transition-colors border border-slate-200 shadow-sm">
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mt-16 sm:mt-24 px-4">
          {[["AI-Powered", "Resume Analysis"], ["Dynamic", "MCQ Assessment"], ["Smart", "Matching Algorithm"], ["Real-time", "Recommendations"]].map(([label, sub]) => (
            <div key={label} className="text-center p-4 rounded-2xl bg-white/50 border border-slate-100 shadow-sm">
              <div className="text-xl sm:text-2xl lg:text-3xl font-black text-brand-600 mb-1">{label}</div>
              <div className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto bg-white/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center mb-4 sm:mb-6 text-slate-900 tracking-tight">Everything You Need</h2>
          <p className="text-base sm:text-lg text-slate-600 text-center mb-12 sm:mb-16 max-w-2xl mx-auto px-4">A complete platform built specifically for college students to land their dream internship efficiently.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((f) => (
              <div key={f.title} className="glass-card p-6 sm:p-8 hover:-translate-y-1 transition-transform duration-300 bg-white border border-slate-200 shadow-brand rounded-2xl group flex flex-col h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed flex-grow">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-center mb-4 sm:mb-6 text-slate-900 tracking-tight">How It Works</h2>
        <p className="text-base sm:text-lg text-slate-600 text-center mb-12 sm:mb-16">Four simple steps to your perfect internship match.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {steps.map((s) => (
            <div key={s.step} className="glass-card p-6 sm:p-8 flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white border border-slate-200 shadow-sm rounded-2xl items-start">
              <div className="text-4xl sm:text-5xl font-black text-brand-600/20 shrink-0">{s.step}</div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="glass-card p-8 sm:p-12 lg:p-16 bg-white border border-brand-100 shadow-brand-lg rounded-3xl text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 sm:mb-6 text-slate-900 tracking-tight">Ready to Find Your Internship?</h2>
          <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 max-w-2xl mx-auto">Join thousands of students already using InternX to launch their careers without the manual hassle.</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 justify-center mb-10 sm:mb-12">
            {["Free to use", "AI-powered analysis", "Instant results", "No manual browsing"].map((item) => (
              <div key={item} className="flex items-center justify-center gap-2 text-sm sm:text-base text-slate-700 font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <CheckCircle className="w-4 h-4 text-brand-600 shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/register" className="btn-brand w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base sm:text-lg px-8 py-4 shadow-brand-lg rounded-xl">
            Get Started For Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white pt-16 pb-8 px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white overflow-hidden flex items-center justify-center border border-slate-100 shadow-sm">
                  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full p-1">
                    <defs>
                      <linearGradient id="logoGrad2" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1E40AF" />
                        <stop offset="1" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                    <g stroke="url(#logoGrad2)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M 6 10 L 16 20 L 6 30" />
                      <path d="M 10 6 L 20 16 L 30 6" />
                      <path d="M 34 10 L 24 20 L 34 30" />
                      <path d="M 10 34 L 20 24 L 30 34" />
                    </g>
                  </svg>
                </div>
                <span className="font-black text-xl text-slate-900 tracking-tight">InternX</span>
              </Link>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                Empowering college students to land their dream internships through AI-driven resume analysis and skill-based matching.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="/register" className="hover:text-brand-600 transition-colors">Students</Link></li>
                <li><Link href="/login" className="hover:text-brand-600 transition-colors">Employers</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">ATS Scoring</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Skill Assessments</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Resume Templates</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Interview Prep</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Career Blog</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Help Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-brand-600 transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} InternX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
