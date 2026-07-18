import { getSupabase } from "@/lib/supabase";

export interface DbAssessment {
  id: string;
  user_id: string;
  resume_id: string;
  questions: any[];
  user_answers: any[];
  score: number;
  total_questions: number;
  correct_answers: number;
  percentage: number;
  time_taken?: number;
  status: "pending" | "in-progress" | "completed";
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export async function createAssessment(input: {
  user_id: string;
  resume_id: string;
  questions: any[];
  total_questions: number;
}): Promise<DbAssessment> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("assessments")
    .insert({
      user_id: input.user_id,
      resume_id: input.resume_id,
      questions: input.questions,
      user_answers: [],
      score: 0,
      total_questions: input.total_questions,
      correct_answers: 0,
      percentage: 0,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DbAssessment;
}

export async function getAssessmentById(id: string, userId: string): Promise<DbAssessment | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as unknown as DbAssessment;
}

export async function getLatestAssessmentByUser(userId: string): Promise<DbAssessment | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("assessments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as unknown as DbAssessment;
}

export async function updateAssessment(
  id: string,
  updates: Partial<{
    user_answers: any[];
    score: number;
    correct_answers: number;
    percentage: number;
    status: string;
    completed_at: string;
    time_taken: number;
  }>
): Promise<DbAssessment> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("assessments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DbAssessment;
}

export async function countCompletedAssessments(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from("assessments")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");
  if (error) throw error;
  return count || 0;
}

export async function getAvgAssessmentScore(): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb.from("assessments").select("percentage").eq("status", "completed");
  if (error || !data || data.length === 0) return 0;
  const avg = data.reduce((sum: number, a: any) => sum + (a.percentage || 0), 0) / data.length;
  return Math.round(avg);
}
