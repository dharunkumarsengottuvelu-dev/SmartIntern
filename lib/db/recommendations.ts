import { getSupabase } from "@/lib/supabase";

export interface DbRecommendation {
  id: string;
  user_id: string;
  internship_id: string;
  match_percentage: number;
  skill_score: number;
  assessment_score: number;
  matched_skills: string[];
  created_at: string;
  updated_at: string;
}

export async function getRecommendationsByUser(userId: string): Promise<(DbRecommendation & { internship: any })[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("recommendations")
    .select("*, internship:internships(*)")
    .eq("user_id", userId)
    .order("match_percentage", { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data || []) as any[];
}

export async function upsertRecommendation(input: {
  user_id: string;
  internship_id: string;
  match_percentage: number;
  skill_score: number;
  assessment_score: number;
  matched_skills: string[];
}): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("recommendations").upsert({
    ...input,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,internship_id'
  });
  
  if (error) throw error;
}

export async function countRecommendations(): Promise<number> {
  const sb = getSupabase();
  const { count, error } = await sb
    .from("recommendations")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}
