import { getSupabase } from "@/lib/supabase";

export interface DbResume {
  id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  raw_text?: string;
  extracted_skills: {
    technical: string[];
    programming: string[];
    tools: string[];
    certifications: string[];
    projects: string[];
    education: string[];
    soft: string[];
  };
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  embedding?: number[];  // pgvector embedding (768-dim nomic-embed-text)
  created_at: string;
  updated_at: string;
}

export async function getResumeByUser(userId: string): Promise<DbResume | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as unknown as DbResume;
}

export async function getResumeById(id: string, userId: string): Promise<DbResume | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("resumes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data as unknown as DbResume;
}

export async function createResume(input: {
  user_id: string;
  file_url: string;
  file_name: string;
  raw_text?: string;
  extracted_skills: object;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  breakdown?: object;
}): Promise<DbResume> {
  const sb = getSupabase();

  // Check if resume already exists for user — upsert to avoid RLS insert violations
  const { data: existing } = await sb
    .from("resumes")
    .select("id")
    .eq("user_id", input.user_id)
    .limit(1)
    .single();

  if (existing?.id) {
    // Update existing resume
    const { data, error } = await sb
      .from("resumes")
      .update({
        file_url: input.file_url,
        file_name: input.file_name,
        raw_text: input.raw_text,
        extracted_skills: input.extracted_skills,
        ats_score: input.ats_score,
        strengths: input.strengths,
        weaknesses: input.weaknesses,
        improvements: input.improvements,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as DbResume;
  }
  // Remove breakdown from insert payload to prevent schema cache errors
  const { breakdown, ...insertPayload } = input;

  // Insert new resume
  const { data, error } = await sb.from("resumes").insert(insertPayload).select("*").single();
  if (error) throw error;
  return data as unknown as DbResume;
}

export async function countResumes(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb.from("resumes").select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

export async function getAvgATSScore(): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb.from("resumes").select("ats_score");
  if (error || !data || data.length === 0) return 0;
  const avg = data.reduce((sum: number, r: any) => sum + (r.ats_score || 0), 0) / data.length;
  return Math.round(avg);
}
