"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle,
  AlertTriangle, Loader2, Zap, BookOpen, XCircle,
  RotateCcw, ArrowRight, Eye,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";


interface Question {
  index: number;
  question: string;
  options: string[];
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

interface Answer {
  questionIndex: number;
  selectedOption: string;
}

const difficultyColors = {
  easy: "badge-success",
  medium: "badge-warning",
  hard: "badge-error",
};

const difficultyBg = {
  easy: "bg-emerald-50 border-emerald-200 text-emerald-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  hard: "bg-red-50 border-red-200 text-red-700",
};

function AssessmentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [phase, setPhase] = useState<"setup" | "loading" | "exam" | "submitting" | "done" | "review">("setup");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
  const [possibleRoles, setPossibleRoles] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<10 | 15 | 20>(15);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [result, setResult] = useState<any>(null);
  const [correctAnswerMap, setCorrectAnswerMap] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [reviewQ, setReviewQ] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // If navigated with ?mode=review, restore data from localStorage
  useEffect(() => {
    if (searchParams?.get("mode") === "review") {
      try {
        const stored = localStorage.getItem("mcq_review_data");
        if (stored) {
          const data = JSON.parse(stored);
          setQuestions(data.questions || []);
          setAnswers(data.answers || []);
          setCorrectAnswerMap(data.correctAnswerMap || {});
          setResult(data.result || null);
          setReviewQ(0);
          setPhase("review");
        }
      } catch {}
    }
  }, [searchParams]);


  // Load resume ID and extracted skills
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`${API_BASE}/resume/upload`).then((r) => r.json()).then((d) => {
      if (d.resume?.id || d.resume?._id) {
        setResumeId(d.resume.id || d.resume._id);
        if (d.resume.detectedDomain) setDetectedDomain(d.resume.detectedDomain);
        if (d.resume.possibleRoles) setPossibleRoles(d.resume.possibleRoles);
        if (d.resume.extractedSkills) {
          const skillsObj = d.resume.extractedSkills;
          const allSkills = [
            ...(skillsObj.programming || []),
            ...(skillsObj.technical || []),
            ...(skillsObj.tools || [])
          ].filter(Boolean);
          const uniqueSkills = Array.from(new Set<string>(allSkills));
          if (uniqueSkills.length > 0) {
            setAvailableSkills(uniqueSkills);
            setSelectedSkills(uniqueSkills.slice(0, 10)); // Select top 10 by default
          } else {
            const defaultSkills = ["General Aptitude", "Problem Solving", "Logical Reasoning", "Communication", "Computer Science Basics"];
            setAvailableSkills(defaultSkills);
            setSelectedSkills(defaultSkills);
          }
        } else {
          const defaultSkills = ["General Aptitude", "Problem Solving", "Logical Reasoning", "Communication", "Computer Science Basics"];
          setAvailableSkills(defaultSkills);
          setSelectedSkills(defaultSkills);
        }
      }
    });
  }, [status]);

  // Restore active exam on mount
  useEffect(() => {
    if (phase === "setup" && searchParams?.get("mode") !== "review") {
      try {
        const stored = localStorage.getItem("active_assessment");
        if (stored) {
          const data = JSON.parse(stored);
          // If the exam is older than 2 hours, discard it
          if (Date.now() - data.timestamp < 2 * 60 * 60 * 1000) {
            setAssessmentId(data.assessmentId);
            setQuestions(data.questions);
            setAnswers(data.answers || []);
            setTimeLeft(data.timeLeft > 0 ? data.timeLeft : 0);
            setPhase("exam");
          } else {
            localStorage.removeItem("active_assessment");
          }
        }
      } catch (err) {}
    }
  }, [phase, searchParams]);

  // Auto-save active exam to localStorage
  useEffect(() => {
    if (phase === "exam" && assessmentId && questions.length > 0) {
      const state = {
        assessmentId,
        questions,
        answers,
        timeLeft,
        timestamp: Date.now()
      };
      localStorage.setItem("active_assessment", JSON.stringify(state));
    }
  }, [answers, assessmentId, questions, timeLeft, phase]);

  const handleSubmit = useCallback(async () => {
    if (phase === "submitting" || phase === "done") return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setShowConfirm(false);
    setPhase("submitting");
    try {
      const res = await fetch(`${API_BASE}/mcq/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId, answers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Submission failed"); setPhase("exam"); return; }
      setResult(data.result);
      setCorrectAnswerMap(data.correctAnswerMap || {});
      localStorage.removeItem("active_assessment");

      // Trigger recommendation generation in background (non-blocking)
      fetch(`${API_BASE}/recommendation`, { method: "POST" }).catch(() => {});

      setPhase("done");
    } catch {
      setError("Submission failed. Please try again.");
      setPhase("exam");
    }
  }, [assessmentId, answers, phase]);

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const startAssessment = async () => {
    if (!resumeId) { setError("No resume found. Please upload your resume first."); return; }
    if (selectedSkills.length === 0 && availableSkills.length > 0) {
      setError("Please select at least one skill to be tested on.");
      return;
    }
    setPhase("loading");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/mcq/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, selectedSkills, questionCount }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to generate questions"); setPhase("setup"); return; }
      setAssessmentId(data.assessmentId);
      setQuestions(data.questions);
      setTimeLeft(data.timeLimit || questionCount * 90);
      setPhase("exam");
    } catch {
      setError("Failed to start assessment. Please try again.");
      setPhase("setup");
    }
  };

  const selectAnswer = (option: string) => {
    setAnswers((prev) => {
      const existing = prev.findIndex((a) => a.questionIndex === currentQ);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { questionIndex: currentQ, selectedOption: option };
        return updated;
      }
      return [...prev, { questionIndex: currentQ, selectedOption: option }];
    });
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill) 
        : [...prev, skill].slice(0, 15) // Max 15 skills
    );
  };

  const currentAnswer = answers.find((a) => a.questionIndex === currentQ)?.selectedOption;
  const answeredCount = answers.length;
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const currentQuestion = questions[currentQ];

  if (phase === "setup") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 py-12">
        <div className="glass-card p-8 max-w-2xl w-full page-enter bg-white border border-slate-200 shadow-md rounded-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">AI Skill Assessment</h1>
            <p className="text-slate-500 text-sm leading-relaxed">Customized based on your resume. Select the skills you want to be tested on.</p>
          </div>

          {/* Domain Badge */}
          {detectedDomain && (
            <div className="mb-5 p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Detected Domain:</span>
              <span className="text-sm font-black text-indigo-900">{detectedDomain}</span>
              {possibleRoles.slice(0, 3).map(r => (
                <span key={r} className="text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 font-medium">{r}</span>
              ))}
            </div>
          )}

          {/* Config row */}
          <div className="grid grid-cols-2 gap-3 mb-5">

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Number of Questions</label>
              <div className="flex gap-2">
                {([10, 15, 20] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      questionCount === n
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-brand-400"
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Time info */}
          <div className="flex gap-3 mb-5 text-xs">
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <Clock className="w-4 h-4 text-brand-600 mx-auto mb-1" />
              <div className="font-bold text-slate-800">{Math.round(questionCount * 1.5)} min</div>
              <div className="text-slate-500">Time limit</div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <BookOpen className="w-4 h-4 text-brand-600 mx-auto mb-1" />
              <div className="font-bold text-slate-800">{questionCount} Qs</div>
              <div className="text-slate-500">MCQ format</div>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
              <CheckCircle className="w-4 h-4 text-brand-600 mx-auto mb-1" />
              <div className="font-bold text-slate-800">1 mark</div>
              <div className="text-slate-500">No negatives</div>
            </div>
          </div>

          {availableSkills.length > 0 ? (
            <div className="mb-5 text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800 text-sm">Skills Extracted from Resume</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-bold bg-white px-2 py-1 border border-slate-200 rounded-md">
                    Selected Skills ({selectedSkills.length})
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedSkills(availableSkills)} className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-1 rounded-md font-medium transition-colors">Select All</button>
                    <button onClick={() => setSelectedSkills([])} className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 px-2 py-1 rounded-md font-medium transition-colors">Clear Selection</button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all transform hover:scale-105 active:scale-95 ${
                        isSelected
                          ? "bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/20"
                          : "bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:bg-brand-50"
                      }`}
                    >
                      {isSelected && <span className="mr-1 opacity-80">✓</span>}{skill}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            resumeId && (
              <div className="mb-5 text-left bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800 text-sm mb-1">No skills were detected from your resume.</h3>
                <p className="text-xs text-slate-500 mb-4">We could not extract any technical skills to generate an assessment.</p>
                <button onClick={() => router.push("/student/dashboard")} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors">
                  Re-analyze Resume
                </button>
              </div>
            )
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          {!resumeId && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-4 py-3 mb-4 text-yellow-700 text-sm">
              Please upload your resume first before taking the assessment.
            </div>
          )}
          <button
            id="start-assessment"
            onClick={startAssessment}
            disabled={!resumeId || selectedSkills.length === 0}
            className="btn-brand w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {resumeId ? `Generate ${questionCount} Questions & Start →` : "Upload Resume First"}
          </button>
          <button onClick={() => router.push("/student/dashboard")} className="text-sm text-slate-500 hover:text-slate-700 mt-3 block w-full font-medium transition-colors text-center">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── LOADING PHASE ────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-slate-700 font-medium">Generating personalized questions from your resume…</p>
        <p className="text-xs text-slate-400">This may take 15–30 seconds</p>
      </div>
    );
  }

  // ── DONE PHASE ───────────────────────────────────────────────────────────
  if (phase === "done" && result) {
    const pct = result.percentage;
    const color = pct >= 75 ? "#15803d" : pct >= 50 ? "#b45309" : "#b91c1c";
    const bgColor = pct >= 75 ? "bg-green-50 border-green-200" : pct >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
    const label = pct >= 75 ? "Excellent performance!" : pct >= 50 ? "Good effort — keep practising" : "Review topics and retake to improve";
    const radius = 54;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (pct / 100) * circ;

    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
        <div className="glass-card p-8 sm:p-10 max-w-md w-full text-center page-enter bg-white border border-slate-200 shadow-md rounded-2xl">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Assessment Complete!</h1>
          <p className="text-slate-500 mb-6 text-sm">Your personalized internship recommendations are now ready.</p>

          {/* Score ring */}
          <div className="relative w-40 h-40 mx-auto mb-4">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="score-ring" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black" style={{ color }}>{pct}%</span>
              <span className="text-xs text-slate-500 font-medium">Score</span>
            </div>
          </div>

          {/* Result label */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold mb-6 ${bgColor}`} style={{ color }}>
            {label}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Correct", value: result.correctAnswers, color: "text-green-700" },
              { label: "Wrong", value: result.totalQuestions - result.correctAnswers, color: "text-red-500" },
              { label: "Total", value: result.totalQuestions, color: "text-brand-600" },
            ].map((s) => (
              <div key={s.label} className="glass-card p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-none">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Score contribution info */}
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-brand-800 mb-2">How your score affects recommendations:</p>
            <div className="space-y-1.5 text-xs text-brand-700">
              <div className="flex items-center justify-between">
                <span>Skill match (from resume)</span>
                <span className="font-bold">40%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>ATS resume score</span>
                <span className="font-bold">30%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Assessment score ({pct}%)</span>
                <span className="font-bold">30%</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => { setReviewQ(0); setPhase("review"); }}
            className="w-full py-3 mb-3 rounded-lg font-medium flex items-center justify-center gap-2 border-2 border-brand-600 text-brand-700 hover:bg-brand-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Review My Answers
          </button>
          <button
            onClick={() => router.push("/student/dashboard?tab=recommendations")}
            className="btn-brand w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            View My Recommendations
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push("/student/dashboard")}
            className="text-sm text-slate-500 hover:text-slate-700 mt-3 block w-full font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── REVIEW PHASE ─────────────────────────────────────────────────────────
  if (phase === "review" && result) {
    const pct = result.percentage;
    const reviewQuestion = questions[reviewQ];
    const userAnswer = answers.find((a) => a.questionIndex === reviewQ)?.selectedOption ?? null;
    const correctAnswer = correctAnswerMap[reviewQ];
    const isCorrect = typeof userAnswer === "string" && typeof correctAnswer === "string" 
                      ? userAnswer.trim() === correctAnswer.trim() 
                      : userAnswer === correctAnswer;

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (searchParams?.get("mode") === "review") {
                  router.push("/student/dashboard?tab=assessment");
                } else {
                  setPhase("done");
                }
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {searchParams?.get("mode") === "review" ? "Dashboard" : "Results"}
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-brand-600" /> Answer Review
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              Score: <span className="font-bold text-brand-700">{pct}%</span>
            </span>
            <span className="text-xs text-slate-400">
              {result.correctAnswers}/{result.totalQuestions} correct
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 gap-0">
          {/* Question navigator sidebar */}
          <div className="w-full md:w-56 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 overflow-x-auto md:overflow-y-auto">
            <p className="text-xs text-slate-500 font-semibold mb-3">All Questions</p>
            <div className="flex md:grid md:grid-cols-5 gap-1.5 min-w-max md:min-w-0 pb-2 md:pb-0">
              {questions.map((_, i) => {
                const ua = answers.find((a) => a.questionIndex === i)?.selectedOption;
                const ca = correctAnswerMap[i];
                const correct = ua === ca;
                const isCurrent = i === reviewQ;
                return (
                  <button
                    key={i}
                    onClick={() => setReviewQ(i)}
                    title={correct ? "Correct" : ua ? "Wrong" : "Skipped"}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                      isCurrent
                        ? "bg-brand-600 text-white border-brand-600 shadow"
                        : correct
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : ua
                        ? "bg-red-50 text-red-600 border-red-300"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-1.5 text-xs hidden md:block">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 inline-block" /> Correct</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" /> Wrong</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" /> Skipped</div>
            </div>
          </div>

          {/* Review question area */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-3xl mx-auto w-full">
            {reviewQuestion && (
              <div className="page-enter">
                {/* Question header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500 font-medium">Question {reviewQ + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${difficultyColors[reviewQuestion.difficulty]}`}>{reviewQuestion.difficulty}</span>
                    {reviewQuestion.topic && <span className="badge badge-brand">{reviewQuestion.topic}</span>}
                    {/* Correct/Wrong indicator */}
                    {userAnswer ? (
                      isCorrect ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Wrong
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        Skipped
                      </span>
                    )}
                  </div>
                </div>

                {/* Question text */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 sm:p-6 mb-5">
                  <p className="text-slate-900 font-semibold text-base sm:text-lg leading-relaxed">{reviewQuestion.question}</p>
                </div>

                {/* Options with colour-coded review */}
                <div className="space-y-3 mb-6">
                  {reviewQuestion.options.map((option, idx) => {
                    const isUserPick = option === userAnswer;
                    const isRight = option === correctAnswer;

                    let cls = "bg-white border-slate-200 text-slate-700";
                    let icon = null;

                    if (isRight) {
                      cls = "bg-emerald-50 border-emerald-400 text-emerald-900";
                      icon = <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />;
                    } else if (isUserPick && !isRight) {
                      cls = "bg-red-50 border-red-400 text-red-800";
                      icon = <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
                    }

                    return (
                      <div
                        key={idx}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${cls}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 ${
                            isRight
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : isUserPick
                              ? "border-red-400 bg-red-400 text-white"
                              : "border-slate-300 text-slate-500"
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-sm flex-1 leading-relaxed">{option}</span>
                          {icon}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Answer summary box */}
                {!isCorrect && userAnswer && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-xs font-bold text-amber-800 mb-1">Explanation</p>
                    <p className="text-sm text-amber-700">
                      <span className="font-semibold">Your answer:</span> {userAnswer}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      <span className="font-semibold">Correct answer:</span>{" "}
                      <span className="text-emerald-800 font-semibold">{correctAnswer}</span>
                    </p>
                  </div>
                )}
                {!userAnswer && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                    <p className="text-xs font-bold text-slate-600 mb-1">You skipped this question</p>
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold">Correct answer:</span>{" "}
                      <span className="text-emerald-800 font-semibold">{correctAnswer}</span>
                    </p>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => setReviewQ((q) => Math.max(0, q - 1))}
                    disabled={reviewQ === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>

                  {reviewQ === questions.length - 1 ? (
                    <button
                      onClick={() => router.push("/student/dashboard?tab=recommendations")}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
                    >
                      View Recommendations <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setReviewQ((q) => Math.min(questions.length - 1, q + 1))}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── EXAM PHASE ───────────────────────────────────────────────────────────
  if (phase === "exam" || phase === "submitting") {
    const progress = ((currentQ + 1) / questions.length) * 100;
    const isLowTime = timeLeft < 300;

    return (
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Top bar */}
        <div className="glass-card rounded-none border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-10 bg-white">
          <div className="flex items-center gap-2 sm:gap-3">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600 shrink-0" />
            <span className="font-bold text-sm sm:text-base text-slate-900 truncate max-w-[120px] sm:max-w-none">Skill Assessment</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 font-medium">{answeredCount}/{questions.length} answered</span>
            <div className={`flex items-center gap-2 font-mono font-bold text-lg ${isLowTime ? "text-red-600 animate-pulse" : "text-brand-600"}`}>
              <Clock className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={phase === "submitting"}
              className="btn-brand text-sm px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg"
            >
              {phase === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 h-1">
          <div
            className="h-1 bg-brand-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Main area */}
        <div className="flex flex-col md:flex-row flex-1 gap-0 relative">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-medium">{error}</span>
              </div>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Question navigator */}
          <div className="w-full md:w-56 glass-card rounded-none border-b md:border-b-0 md:border-r border-slate-200 p-4 bg-white overflow-x-auto md:overflow-y-auto">
            <p className="text-xs text-slate-500 font-semibold mb-2 md:mb-3">Questions</p>
            <div className="flex md:grid md:grid-cols-5 gap-1.5 min-w-max md:min-w-0 pb-2 md:pb-0">
              {questions.map((_, i) => {
                const isAnswered = answers.some((a) => a.questionIndex === i);
                const isCurrent = i === currentQ;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentQ(i)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-brand-600 text-white"
                        : isAnswered
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question area */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-3xl mx-auto min-w-0">
            {currentQuestion && (
              <div className="page-enter">
                {/* Question header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500 font-medium">Question {currentQ + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${difficultyColors[currentQuestion.difficulty]}`}>{currentQuestion.difficulty}</span>
                    {currentQuestion.topic && <span className="badge badge-brand">{currentQuestion.topic}</span>}
                  </div>
                </div>

                {/* Question */}
                <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                  <p className="text-slate-900 font-semibold text-base sm:text-lg leading-relaxed">{currentQuestion.question}</p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = currentAnswer === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => selectAnswer(option)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                          isSelected
                            ? "bg-brand-50 border-brand-600 text-brand-900 font-medium shadow-sm"
                            : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? "border-brand-600 bg-brand-600" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <span className="text-sm">{String.fromCharCode(65 + idx)}. {option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                    disabled={currentQ === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors text-sm font-medium"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <button
                    onClick={() => setCurrentQ((q) => Math.min(questions.length - 1, q + 1))}
                    disabled={currentQ === questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors text-sm font-medium"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm submit modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-card p-8 max-w-sm w-full mx-4 text-center bg-white border border-slate-200 shadow-xl rounded-2xl">
              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Assessment?</h3>
              <p className="text-slate-600 text-sm mb-6">
                You&apos;ve answered {answeredCount} of {questions.length} questions. Are you sure?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} disabled={phase === "submitting"} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50">
                  Continue
                </button>
                <button onClick={handleSubmit} disabled={phase === "submitting"} className="flex-1 btn-brand py-2.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center">
                  {phase === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Now"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    }>
      <AssessmentPageInner />
    </Suspense>
  );
}
