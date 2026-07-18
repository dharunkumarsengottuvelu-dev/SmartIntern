import { getSupabase } from "@/lib/supabase";

export interface DbInternship {
  id: string;
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location: string;
  duration: string;
  stipend: string;
  apply_link: string;
  is_active: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

export async function getActiveInternships(opts: { page?: number; limit?: number } = {}): Promise<{ internships: DbInternship[]; total: number }> {
  const sb = getSupabase();
  const page = opts.page || 1;
  const limit = opts.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await sb
    .from("internships")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { internships: (data || []) as unknown as DbInternship[], total: count || 0 };
}

export async function getAllInternships(opts: { page?: number; limit?: number; search?: string } = {}): Promise<{ internships: DbInternship[]; total: number }> {
  const sb = getSupabase();
  const page = opts.page || 1;
  const limit = opts.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = sb.from("internships").select("*", { count: "exact" });
  if (opts.search) {
    query = query.or(`company.ilike.%${opts.search}%,title.ilike.%${opts.search}%`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { internships: (data || []) as DbInternship[], total: count || 0 };
}

export async function createInternship(input: {
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location: string;
  duration: string;
  stipend?: string;
  apply_link: string;
  category?: string;
}): Promise<DbInternship> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("internships")
    .insert({ ...input, is_active: true, stipend: input.stipend || "Unpaid", category: input.category || "General" })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DbInternship;
}

export async function updateInternship(id: string, updates: Partial<DbInternship>): Promise<DbInternship> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("internships")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DbInternship;
}

export async function deleteInternship(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("internships").delete().eq("id", id);
  if (error) throw error;
}
