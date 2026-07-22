/**
 * Script: seed-admin.js
 * Creates/updates the admin user in Supabase with:
 *   Email:    admin@internx.com
 *   Password: admin123
 *   Role:     admin
 *
 * Run with: node scripts/seed-admin.js
 */

const { createClient } = require("@supabase/supabase-js");
const { scrypt, randomBytes, timingSafeEqual } = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(scrypt);

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "your_service_role_key_here";


const ADMIN_EMAIL = "admin@internx.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("🔐 Hashing password...");
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  console.log("🔍 Checking if admin user already exists...");
  const { data: existing, error: fetchErr } = await sb
    .from("users")
    .select("id, email, role")
    .eq("email", ADMIN_EMAIL.toLowerCase())
    .maybeSingle();

  if (fetchErr) {
    console.error("❌ Error querying database:", fetchErr.message);
    process.exit(1);
  }

  if (existing) {
    console.log(`✏️  Admin user already exists (id: ${existing.id}). Updating password and role...`);
    const { error: updateErr } = await sb
      .from("users")
      .update({
        password_hash: passwordHash,
        role: "admin",
        name: ADMIN_NAME,
        updated_at: new Date().toISOString(),
      })
      .eq("email", ADMIN_EMAIL.toLowerCase());

    if (updateErr) {
      console.error("❌ Error updating admin user:", updateErr.message);
      process.exit(1);
    }
    console.log("✅ Admin user updated successfully!");
  } else {
    console.log("➕ Creating new admin user...");
    const { data: newUser, error: insertErr } = await sb
      .from("users")
      .insert({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL.toLowerCase(),
        password_hash: passwordHash,
        role: "admin",
      })
      .select("id, email, role")
      .single();

    if (insertErr) {
      console.error("❌ Error creating admin user:", insertErr.message);
      process.exit(1);
    }
    console.log("✅ Admin user created successfully!", newUser);
  }

  console.log("\n🎉 Done! Admin credentials are set:");
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     admin`);
}

main().catch((err) => {
  console.error("💥 Unexpected error:", err);
  process.exit(1);
});
