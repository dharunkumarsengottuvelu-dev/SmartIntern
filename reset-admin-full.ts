import { config } from "dotenv";
config({ path: ".env.local" });

import { getSupabase } from "./lib/supabase";
import bcrypt from "bcryptjs";

async function resetAdminFull() {
  const sb = getSupabase();
  const EMAIL = "admin@internx.com";
  const PASSWORD = "admin123";

  console.log("=== Full Admin Reset ===");
  
  // Step 1: Delete ALL admin accounts
  console.log("\n1. Deleting all admin accounts...");
  const { error: deleteErr } = await sb.from("users").delete().ilike("email", "%admin%");
  if (deleteErr) console.error("Delete error:", deleteErr);
  else console.log("   ✅ Deleted all admin accounts");

  // Step 2: Create fresh admin with known password
  console.log("\n2. Creating fresh admin...");
  const hash = await bcrypt.hash(PASSWORD, 12);
  const { data: newUser, error: insertErr } = await sb
    .from("users")
    .insert({
      name: "Admin User",
      email: EMAIL,
      password: hash,
      role: "admin",
    })
    .select("id, email, role, password")
    .single();

  if (insertErr) {
    console.error("   ❌ Insert error:", insertErr);
    return;
  }
  console.log("   ✅ Admin created:", newUser?.id);

  // Step 3: Verify the password immediately
  console.log("\n3. Verifying password immediately after insert...");
  const { data: verifyUser } = await sb
    .from("users")
    .select("email, role, password")
    .eq("email", EMAIL)
    .single();

  if (!verifyUser?.password) {
    console.error("   ❌ No password found in DB after insert!");
    return;
  }
  console.log("   Hash stored:", verifyUser.password.substring(0, 20) + "...");

  const ok = await bcrypt.compare(PASSWORD, verifyUser.password);
  console.log(`   ✅ Password "${PASSWORD}" verified:`, ok);

  // Step 4: Show all users
  console.log("\n4. All users in DB:");
  const { data: allUsers } = await sb.from("users").select("email, role");
  allUsers?.forEach(u => console.log("   -", u.email, "(", u.role, ")"));

  console.log("\n=== Done ===");
  console.log(`\nLogin credentials ready:`);
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`\nMake sure your dev server runs from:`);
  console.log(`  d:\\My self\\Project 1\\smart-internship-system`);
  console.log(`  Command: npm run dev`);
}

resetAdminFull();
