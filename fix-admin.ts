import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
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

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  return timingSafeEqual(derived, storedBuf);
}

async function main() {
  console.log("=== Admin Password Fix (scrypt) ===");
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

  // Show current state
  const { data: current } = await sb.from("users").select("id, email, role, password").ilike("email", "%admin%");
  console.log("Current admin records:", current?.map(u => ({ id: u.id, email: u.email, role: u.role, passwordLen: u.password?.length })));

  // Generate scrypt hash
  const hash = await hashPassword(PASSWORD);
  console.log("✓ New scrypt hash:", hash.substring(0, 30) + "...");

  if (current && current.length > 0) {
    // UPDATE existing record
    const { error } = await sb
      .from("users")
      .update({ password: hash, role: "admin", updated_at: new Date().toISOString() })
      .eq("email", EMAIL);
    if (error) {
      console.error("UPDATE failed:", error);
      // Try upsert
      const { error: uErr } = await sb.from("users").upsert({
        email: EMAIL, name: "Admin User", password: hash, role: "admin"
      }, { onConflict: "email" });
      if (uErr) { console.error("UPSERT also failed:", uErr); return; }
      console.log("✓ Upserted via upsert");
    } else {
      console.log("✓ Password updated via UPDATE");
    }
  } else {
    // INSERT fresh
    const { error } = await sb.from("users").insert({ name: "Admin User", email: EMAIL, password: hash, role: "admin" });
    if (error) { console.error("INSERT failed:", error); return; }
    console.log("✓ Admin inserted fresh");
  }

  // Verify
  const { data: check } = await sb.from("users").select("password").eq("email", EMAIL).single();
  if (!check?.password) { console.error("❌ Cannot read back password"); return; }
  const ok = await verifyPassword(PASSWORD, check.password);
  console.log("✓ Immediate verify:", ok);

  if (ok) {
    console.log("\n🎉 SUCCESS! Admin login is ready:");
    console.log("   Email:    " + EMAIL);
    console.log("   Password: " + PASSWORD);
    console.log("\n   Restart npm run dev and try again.");
  } else {
    console.error("\n❌ Verification still failed. Stored hash:", check.password?.substring(0, 40));
  }
}

main();
