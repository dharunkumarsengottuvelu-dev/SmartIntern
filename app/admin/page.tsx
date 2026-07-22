"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  LogOut, Menu, X, TrendingUp, Award, Star, ExternalLink, Database, Search, ChevronDown, ChevronUp
} from "lucide-react";

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub, color }: any) {
  return (
    <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500 font-semibold">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 mb-1">{value ?? "—"}</div>
      {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
    </div>
  );
}

// ─── Admin Dashboard Home ─────────────────────────────────────────────────────
function AdminHome({ stats }: { stats: any }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={stats?.totalStudents} icon={Users} sub={`+${stats?.recentStudents ?? 0} this week`} color="bg-brand-50 text-brand-700" />
        <StatCard label="Resumes Uploaded" value={stats?.totalResumes} icon={FileText} sub={`Avg ATS: ${stats?.avgATSScore ?? 0}`} color="bg-accent-50 text-accent-700" />
        <StatCard label="Assessments Done" value={stats?.totalAssessments} icon={Briefcase} sub={`Avg Score: ${stats?.avgAssessmentScore ?? 0}%`} color="bg-green-50 text-green-700" />
        <StatCard label="Recommendations" value={stats?.totalRecommendations} icon={Star} sub="Total matches generated" color="bg-yellow-50 text-yellow-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-600" /> Platform Averages
          </h3>
          <div className="space-y-4">
            {[
              { label: "Average ATS Score", value: stats?.avgATSScore ?? 0, max: 100, color: "bg-brand-600" },
              { label: "Average Assessment Score", value: stats?.avgAssessmentScore ?? 0, max: 100, color: "bg-accent-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1.5 font-medium">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-bold text-slate-900">{item.value}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color} transition-all duration-1000`}
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-600" /> Quick Stats
          </h3>
          <div className="space-y-3">
            {[
              { label: "Students this week", value: stats?.recentStudents ?? 0 },
              { label: "Resume upload rate", value: stats?.totalStudents ? `${Math.round((stats.totalResumes / stats.totalStudents) * 100)}%` : "0%" },
              { label: "Assessment completion", value: stats?.totalResumes ? `${Math.round((stats.totalAssessments / stats.totalResumes) * 100)}%` : "0%" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-sm text-slate-500 font-medium">{item.label}</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Field ─────────────────────────────────────────────────────────────
function FormField({ id, label, type = "text", value, onChange, placeholder, as: As = "input", rows }: any) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {As === "textarea" ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input-dark resize-none" rows={rows || 3} placeholder={placeholder} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="input-dark" placeholder={placeholder} required />
      )}
    </div>
  );
}

// ─── Students Manager ─────────────────────────────────────────────────────────
function StudentsManager() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", phone: "", college: "", degree: "", department: "", year: ""
  });
  const [saving, setSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", email: "", password: ""
  });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchStudents = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/students?page=${page}&limit=10&search=${search}`);
    const data = await res.json();
    setStudents(data.students || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTimeout(() => {
      fetchStudents();
    }, 0);
  }, [page, search]);

  const deleteStudent = async (id: string) => {
    if (!confirm("Delete this student and all their data?")) return;
    await fetch(`/api/admin/students?id=${id}`, { method: "DELETE" });
    fetchStudents();
  };

  const openEdit = (student: any) => {
    setEditStudent(student);
    setForm({
      name: student.name || "",
      phone: student.phone || "",
      college: student.college || "",
      degree: student.degree || "",
      department: student.department || "",
      year: student.year?.toString() || ""
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/students", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editStudent.id, ...form })
    });
    setSaving(false);
    setShowModal(false);
    fetchStudents();
  };

  const openAdd = () => {
    setAddForm({ name: "", email: "", password: "" });
    setAddError("");
    setShowAddModal(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm)
    });
    const data = await res.json();
    setAdding(false);
    if (res.ok) {
      setShowAddModal(false);
      fetchStudents();
    } else {
      setAddError(data.error || "Failed to add student");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
        <div className="flex gap-3">
          <span className="badge badge-brand flex items-center justify-center">{total} students</span>
          <button onClick={openAdd} className="btn-brand text-xs py-1.5 px-3">
            + Add Student
          </button>
        </div>
      </div>
      <div className="glass-card p-4 mb-4 bg-white border border-slate-200 shadow-sm rounded-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-dark bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          placeholder="Search by name, email, or college…"
        />
      </div>
      <div className="glass-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Student", "College", "ATS Score", "Assessment", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No students found</td></tr>
              ) : students.map((student: any) => (
                <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {student.name[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{student.college || "—"}</td>
                  <td className="px-4 py-4">
                    {student.atsScore != null ? (
                      <span className={`badge ${student.atsScore >= 75 ? "badge-success" : student.atsScore >= 50 ? "badge-warning" : "badge-error"}`}>
                        {student.atsScore}
                      </span>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-4">
                    {student.assessmentScore != null ? (
                      <span className={`badge ${student.assessmentScore >= 75 ? "badge-success" : student.assessmentScore >= 50 ? "badge-warning" : "badge-error"}`}>
                        {student.assessmentScore}%
                      </span>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      {student.hasResume && <span className="badge badge-brand text-xs">Resume</span>}
                      {student.hasAssessment && <span className="badge badge-success text-xs">Assessed</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(student)}
                        className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-xs px-3 py-1 rounded-lg border border-transparent font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStudent(student.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-3 py-1 rounded-lg border border-transparent font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 10 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Showing {students.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={students.length < 10}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && editStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Student Profile & Performance
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Edit Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField id="name" label="Full Name" value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
                  </div>
                  <div className="col-span-2">
                    <FormField id="phone" label="Phone" value={form.phone} onChange={(v: string) => setForm({...form, phone: v})} />
                  </div>
                  <div className="col-span-2">
                    <FormField id="college" label="College/University" value={form.college} onChange={(v: string) => setForm({...form, college: v})} />
                  </div>
                  <div>
                    <FormField id="degree" label="Degree" value={form.degree} onChange={(v: string) => setForm({...form, degree: v})} />
                  </div>
                  <div>
                    <FormField id="year" label="Graduation Year" type="number" value={form.year} onChange={(v: string) => setForm({...form, year: v})} />
                  </div>
                  <div className="col-span-2">
                    <FormField id="department" label="Department" value={form.department} onChange={(v: string) => setForm({...form, department: v})} />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>

              {/* Right Column: Performance */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Performance Metrics</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="glass-card p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className={`text-3xl font-black mb-1 ${editStudent.atsScore >= 75 ? "text-green-500" : editStudent.atsScore >= 50 ? "text-amber-500" : editStudent.atsScore ? "text-red-500" : "text-slate-300"}`}>
                      {editStudent.atsScore ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">ATS Score</div>
                  </div>
                  
                  <div className="glass-card p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className={`text-3xl font-black mb-1 ${editStudent.assessmentScore >= 75 ? "text-green-500" : editStudent.assessmentScore >= 50 ? "text-amber-500" : editStudent.assessmentScore ? "text-red-500" : "text-slate-300"}`}>
                      {editStudent.assessmentScore ? `${editStudent.assessmentScore}%` : "—"}
                    </div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Assessment</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <span className="text-sm text-slate-600 font-medium">Joined Date</span>
                    <span className="text-sm text-slate-900 font-semibold">
                      {new Date(editStudent.created_at).toLocaleDateString("en-IN")}
                    </span>
                  </div>

                  {editStudent.hasResume && editStudent.resume && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-800 mb-2">Resume Details</h4>
                      <div className="flex gap-2">
                        <a href={editStudent.resume.file_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:text-brand-700 text-sm font-medium flex items-center gap-1">
                          View Uploaded Resume <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">
                        <strong className="text-slate-700">Top Skills:</strong> {
                          [...(editStudent.resume.extracted_skills?.technical || []), ...(editStudent.resume.extracted_skills?.programming || [])].slice(0, 10).join(", ") || "None"
                        }
                      </div>
                    </div>
                  )}

                  {editStudent.hasAssessment && editStudent.assessment && (
                    <div className="p-4 bg-white border border-slate-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-slate-800 mb-3">Assessment Responses</h4>
                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {editStudent.assessment.questions.map((q: any, i: number) => {
                          const ansObj = editStudent.assessment.user_answers?.find((a: any) => a.questionIndex === i) || editStudent.assessment.user_answers?.[i];
                          const ans = ansObj?.selectedOption || (typeof ansObj === 'string' ? ansObj : null);
                          const correctAns = q.answer || q.correctAnswer;
                          const isCorrect = ans === correctAns;
                          
                          return (
                            <div key={i} className="text-sm pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                              <p className="font-medium text-slate-700 mb-1.5">Q{i + 1}: {q.question}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${isCorrect ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                  {ans ? `Ans: ${ans}` : "No Answer"}
                                </span>
                                {!isCorrect && (
                                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                    Correct: {correctAns || "Unknown"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add New Student</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              {addError && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">{addError}</div>}
              <FormField id="add-name" label="Full Name" value={addForm.name} onChange={(v: string) => setAddForm({...addForm, name: v})} />
              <FormField id="add-email" type="email" label="Email Address" value={addForm.email} onChange={(v: string) => setAddForm({...addForm, email: v})} />
              <FormField id="add-password" type="password" label="Temporary Password" value={addForm.password} onChange={(v: string) => setAddForm({...addForm, password: v})} />
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={adding} className="flex-1 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
                  {adding ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Internships Manager ──────────────────────────────────────────────────────
function InternshipsManager() {
  const [internships, setInternships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", company: "", description: "", requiredSkills: "",
    location: "", duration: "3 months", stipend: "₹10,000/month",
    applyLink: "", category: "General",
  });

  const fetchInternships = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/internships?page=${page}&limit=10&search=${search}`);
    const data = await res.json();
    setInternships(data.internships || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    setTimeout(() => {
      fetchInternships();
    }, 0);
  }, [page, search]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: "", company: "", description: "", requiredSkills: "", location: "", duration: "3 months", stipend: "₹10,000/month", applyLink: "", category: "General" });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      title: item.title, company: item.company, description: item.description,
      requiredSkills: (item.required_skills || []).join(", "),
      location: item.location, duration: item.duration, stipend: item.stipend,
      applyLink: item.apply_link, category: item.category || "General",
    });
    setShowModal(true);
  };

  const saveInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = "/api/admin/internships";
    const method = editItem ? "PUT" : "POST";
    const body = editItem ? { id: editItem.id, ...form } : form;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setShowModal(false);
    fetchInternships();
  };

  const deleteInternship = async (id: string) => {
    if (!confirm("Delete this internship?")) return;
    await fetch(`/api/admin/internships?id=${id}`, { method: "DELETE" });
    fetchInternships();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Internship Management</h1>
        <div className="flex gap-3">
          <span className="badge badge-brand flex items-center justify-center">{total} internships</span>
          <button onClick={openCreate} className="btn-brand text-sm px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">+ Add Internship</button>
        </div>
      </div>

      <div className="glass-card p-4 mb-4 bg-white border border-slate-200 shadow-sm rounded-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-dark bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          placeholder="Search by company or job title…"
        />
      </div>

      <div className="space-y-3 mb-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400 font-medium">Loading…</div>
        ) : internships.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">No internships found</div>
        ) : internships.map((item: any) => (
          <div key={item.id} className="glass-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-white border border-slate-200 shadow-sm rounded-xl">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
                <span className={`badge ${item.is_active ? "badge-success" : "badge-error"} text-xs`}>
                  {item.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">{item.company} · {item.location} · {item.duration} · {item.stipend}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {(item.required_skills || []).slice(0, 5).map((s: string) => (
                  <span key={s} className="badge badge-brand text-xs">{s}</span>
                ))}
                {(item.required_skills || []).length > 5 && (
                  <span 
                    className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded cursor-help font-medium"
                    title={(item.required_skills || []).slice(5).join(', ')}
                  >
                    +{(item.required_skills || []).length - 5}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => openEdit(item)} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-medium">Edit</button>
              <button onClick={() => deleteInternship(item.id)} className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {total > 10 && (
        <div className="glass-card p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Showing {Math.min((page - 1) * 10 + 1, total)}-{Math.min(page * 10, total)} of {total} internships
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 10 >= total}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">{editItem ? "Edit Internship" : "Add Internship"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveInternship} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField id="title" label="Job Title *" value={form.title} onChange={(v: string) => setForm({ ...form, title: v })} placeholder="Frontend Developer Intern" />
                <FormField id="company" label="Company *" value={form.company} onChange={(v: string) => setForm({ ...form, company: v })} placeholder="Google" />
              </div>
              <FormField id="description" label="Description *" as="textarea" rows={3} value={form.description} onChange={(v: string) => setForm({ ...form, description: v })} placeholder="Role description…" />
              <FormField id="requiredSkills" label="Required Skills (comma-separated) *" value={form.requiredSkills} onChange={(v: string) => setForm({ ...form, requiredSkills: v })} placeholder="React, Node.js, MongoDB" />
              <div className="grid grid-cols-2 gap-4">
                <FormField id="location" label="Location *" value={form.location} onChange={(v: string) => setForm({ ...form, location: v })} placeholder="Remote / Bangalore" />
                <FormField id="duration" label="Duration" value={form.duration} onChange={(v: string) => setForm({ ...form, duration: v })} placeholder="3 months" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField id="stipend" label="Stipend" value={form.stipend} onChange={(v: string) => setForm({ ...form, stipend: v })} placeholder="₹10,000/month" />
                <FormField id="category" label="Category" value={form.category} onChange={(v: string) => setForm({ ...form, category: v })} placeholder="Frontend / Backend" />
              </div>
              <FormField id="applyLink" label="Apply Link *" type="url" value={form.applyLink} onChange={(v: string) => setForm({ ...form, applyLink: v })} placeholder="https://careers.company.com/..." />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="flex-1 btn-brand text-sm py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">{editItem ? "Save Changes" : "Create Internship"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assessments Manager ────────────────────────────────────────────────────────
function AssessmentsManager() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [viewAssessment, setViewAssessment] = useState<any>(null);

  const fetchAssessments = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/assessments?page=${page}&limit=10&search=${search}`);
    const data = await res.json();
    setAssessments(data.assessments || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssessments();
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  const openView = (assessment: any) => {
    setViewAssessment(assessment);
    setShowModal(true);
  };

  const deleteAssessment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    await fetch(`/api/admin/assessments?id=${id}`, { method: "DELETE" });
    fetchAssessments();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Assignment Control</h1>
        <div className="flex gap-3">
          <span className="badge badge-brand flex items-center justify-center">{total} assessments</span>
        </div>
      </div>

      <div className="glass-card p-4 mb-4 bg-white border border-slate-200 shadow-sm rounded-xl">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-dark bg-white border border-slate-200 text-slate-900 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
          placeholder="Search by student name or email…"
        />
      </div>

      <div className="glass-card overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Student", "Status", "Score", "Completion Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-500 font-bold uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">Loading…</td></tr>
              ) : assessments.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No assessments found</td></tr>
              ) : assessments.map((assessment: any) => (
                <tr key={assessment.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {assessment.users?.name?.[0] || "?"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{assessment.users?.name || "Unknown"}</div>
                        <div className="text-xs text-slate-500">{assessment.users?.email || "No email"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${assessment.status === 'completed' ? "badge-success" : "badge-warning"}`}>
                      {assessment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {assessment.status === 'completed' ? (
                      <div className="flex flex-col">
                        <span className={`font-bold ${assessment.percentage >= 75 ? 'text-green-600' : assessment.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                          {assessment.percentage}%
                        </span>
                        <span className="text-xs text-slate-500">{assessment.correct_answers} / {assessment.total_questions}</span>
                      </div>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {assessment.completed_at ? new Date(assessment.completed_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openView(assessment)}
                        className="text-brand-600 hover:text-brand-700 hover:bg-brand-50 text-xs px-3 py-1 rounded-lg border border-transparent font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => deleteAssessment(assessment.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-3 py-1 rounded-lg border border-transparent font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 10 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Showing {assessments.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium">Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={assessments.length < 10}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors font-medium">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && viewAssessment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10 shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Assessment Details - {viewAssessment.users?.name}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-3 gap-4 mb-6">
                 <div className="glass-card p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className="text-2xl font-black mb-1 text-slate-700">{viewAssessment.total_questions}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Questions</div>
                  </div>
                  <div className="glass-card p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className="text-2xl font-black mb-1 text-brand-600">{viewAssessment.correct_answers || 0}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Correct</div>
                  </div>
                  <div className="glass-card p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                    <div className={`text-2xl font-black mb-1 ${viewAssessment.percentage >= 75 ? "text-green-500" : viewAssessment.percentage >= 50 ? "text-amber-500" : "text-red-500"}`}>
                      {viewAssessment.percentage || 0}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Score</div>
                  </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Questions & Answers</h3>
              <div className="space-y-5">
                {viewAssessment.questions?.map((q: any, i: number) => {
                  const ansObj = viewAssessment.user_answers?.find((a: any) => a.questionIndex === i) || viewAssessment.user_answers?.[i];
                  const ans = ansObj?.selectedOption || (typeof ansObj === 'string' ? ansObj : null);
                  const correctAns = q.answer || q.correctAnswer;
                  const isCorrect = ans === correctAns;
                  
                  return (
                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="font-semibold text-slate-800 text-sm">
                          <span className="text-brand-600 mr-2">Q{i + 1}.</span> 
                          {q.question}
                        </p>
                        <span className={`shrink-0 badge ${q.difficulty === 'hard' ? 'badge-error' : q.difficulty === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                          {q.difficulty}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {q.options?.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className={`px-3 py-2 text-xs rounded-lg border ${
                            opt === ans && isCorrect ? "bg-green-50 border-green-200 text-green-700 font-medium" :
                            opt === ans && !isCorrect ? "bg-red-50 border-red-200 text-red-700 font-medium" :
                            opt === correctAns ? "bg-green-50 border-green-200 text-green-700 font-medium" :
                            "bg-slate-50 border-slate-100 text-slate-600"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}. {opt}
                            {opt === ans && <span className="ml-1 font-bold">(User Answer)</span>}
                            {opt === correctAns && opt !== ans && <span className="ml-1 font-bold">(Correct)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Question Bank Manager ──────────────────────────────────────────────────
function QuestionBankManager() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [search]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/questions?search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">Manage assessment skills and questions</p>
        </div>
        <div className="flex gap-3">
          <span className="badge badge-brand flex items-center justify-center">
            {skills.reduce((acc, s) => acc + s.count, 0)} Questions
          </span>
          <span className="badge badge-accent flex items-center justify-center">
            {skills.length} Skills
          </span>
        </div>
      </div>

      <div className="glass-card p-4 mb-4 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center gap-2">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
          placeholder="Search skills (e.g. React, Python)..."
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400 font-medium glass-card rounded-xl">Loading...</div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium glass-card rounded-xl">No skills found</div>
        ) : (
          skills.map((skill) => (
            <div key={skill.id} className="glass-card bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                    {skill.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{skill.name}</h3>
                    <p className="text-xs text-slate-500">{skill.count} available questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-slate-400 hidden sm:inline-block">System Default</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    {expandedSkill === skill.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {expandedSkill === skill.id && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {skill.questions.map((q: any, i: number) => (
                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <p className="font-medium text-slate-800 text-sm">
                          <span className="text-brand-600 font-bold mr-2">Q{i + 1}.</span> 
                          {q.question}
                        </p>
                        <span className={`shrink-0 badge ${q.difficulty === 'hard' ? 'badge-error' : q.difficulty === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                          {q.difficulty || 'medium'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options?.map((opt: string, optIdx: number) => (
                          <div key={optIdx} className={`px-3 py-2 text-xs rounded-lg border ${
                            opt === q.answer ? "bg-green-50 border-green-200 text-green-700 font-medium" : "bg-slate-50 border-slate-100 text-slate-600"
                          }`}>
                            {String.fromCharCode(65 + optIdx)}. {opt}
                            {opt === q.answer && <span className="ml-1 font-bold">(Correct)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Layout ────────────────────────────────────────────────────────
export default function AdminPage() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "internships", label: "Internships", icon: Briefcase },
    { id: "assessments", label: "Assessments", icon: FileText },
    { id: "question-bank", label: "Question Bank", icon: Database },
  ];

  const user = session?.user as any;

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen transition-all duration-300 shrink-0`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm text-brand-600">Admin Panel</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-slate-600 transition-colors ml-auto">
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {sidebarOpen && user && (
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Administrator</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeSection === item.id
                  ? "bg-brand-50 text-brand-700 border border-brand-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="max-w-6xl mx-auto page-enter">
          {activeSection === "dashboard" && <AdminHome stats={stats} />}
          {activeSection === "students" && <StudentsManager />}
          {activeSection === "internships" && <InternshipsManager />}
          {activeSection === "assessments" && <AssessmentsManager />}
          {activeSection === "question-bank" && <QuestionBankManager />}
        </div>
      </main>
    </div>
  );
}

