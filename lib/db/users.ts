import { getSupabase } from "@/lib/supabase";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

/** Hash a password using native Node.js scrypt */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}


export interface DbUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "student" | "admin";
  phone?: string;
  college?: string;
  degree?: string;
  department?: string;
  year?: number;
  created_at: string;
  updated_at: string;
}

export async function findUserByEmail(email: string, includePassword = false): Promise<DbUser | null> {
  const sb = getSupabase();
  const query = sb.from("users").select(includePassword ? "*" : "id,name,email,role,phone,college,degree,department,year,created_at,updated_at").eq("email", email.toLowerCase()).single();

  const { data, error } = await query;
  if (error || !data) return null;
  return data as unknown as DbUser;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .select("id,name,email,role,phone,college,degree,department,year,created_at,updated_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as unknown as DbUser;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string; // already hashed
  role?: string;
  phone?: string;
  college?: string;
  degree?: string;
  department?: string;
  year?: number;
}): Promise<DbUser> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .insert({
      name: input.name.trim(),
      email: input.email.toLowerCase().trim(),
      password: input.password,
      role: input.role || "student",
      phone: input.phone?.trim() || null,
      college: input.college?.trim() || null,
      degree: input.degree?.trim() || null,
      department: input.department?.trim() || null,
      year: input.year || null,
    })
    .select("id,name,email,role,phone,college,degree,department,year,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as unknown as DbUser;
}

export async function verifyPassword(plainText: string, stored: string): Promise<boolean> {
  try {
    // Support both legacy bcrypt hashes and new scrypt hashes
    if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
      // Legacy bcrypt hash — use dynamic import to avoid Turbopack bundling issues
      const { compare } = await import("bcryptjs");
      return compare(plainText, stored);
    }
    // New scrypt format: "salt:hash"
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derived = (await scryptAsync(plainText, salt, 64)) as Buffer;
    const storedBuffer = Buffer.from(hash, "hex");
    if (derived.length !== storedBuffer.length) return false;
    return timingSafeEqual(derived, storedBuffer);
  } catch {
    return false;
  }
}

export async function getAllStudents(opts: { search?: string; page?: number; limit?: number } = {}): Promise<{ students: DbUser[]; total: number }> {
  const sb = getSupabase();
  const page = opts.page || 1;
  const limit = opts.limit || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = sb.from("users").select("id,name,email,role,phone,college,degree,department,year,created_at,updated_at", { count: "exact" }).eq("role", "student").order("created_at", { ascending: false }).range(from, to);

  if (opts.search) {
    const s = `%${opts.search}%`;
    query = query.or(`name.ilike.${s},email.ilike.${s},college.ilike.${s}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { students: (data || []) as unknown as DbUser[], total: count || 0 };
}

export async function deleteUserById(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("users").delete().eq("id", id);
  if (error) throw error;
}

export async function updateUser(
  id: string,
  updates: {
    name?: string;
    phone?: string;
    college?: string;
    degree?: string;
    department?: string;
    year?: number;
  }
): Promise<DbUser> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("users")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,name,email,role,phone,college,degree,department,year,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as unknown as DbUser;
}

export async function countStudents(opts: { since?: Date } = {}): Promise<number> {
  const sb = getSupabase();
  let query = sb.from("users").select("id", { count: "exact", head: true }).eq("role", "student");
  if (opts.since) query = query.gte("created_at", opts.since.toISOString());
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function updateUserPassword(email: string, hashed_password: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("users")
    .update({ 
      password: hashed_password,
      updated_at: new Date().toISOString()
    })
    .eq("email", email.toLowerCase());
  
  if (error) throw error;
}
