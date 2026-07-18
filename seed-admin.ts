import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMAIL = "admin@internx.com";
const PASSWORD = "admin123";

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function main() {
  console.log("=== Admin Reset (scrypt) ===");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Delete all admin accounts
  await sb.from("users").delete().ilike("email", "%admin%");
  console.log("✓ Old admin accounts deleted");

  // Hash with native scrypt
  const hash = await hashPassword(PASSWORD);
  console.log("✓ Hash generated (scrypt):", hash.substring(0, 20) + "...");

  // Insert
  const { data, error } = await sb
    .from("users")
    .insert({ name: "Admin User", email: EMAIL, password: hash, role: "admin" })
    .select("id, email, role")
    .single();

  if (error) { console.error("❌ Insert error:", error); return; }
  console.log("✓ Admin created:", data?.id);
  console.log("\n✅ Done! Login with:");
  console.log("   Email:    " + EMAIL);
  console.log("   Password: " + PASSWORD);
}

main();
