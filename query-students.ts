import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("users").select("*");
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Users in database:");
    data.forEach((u) => {
      console.log(`- ${u.name} (${u.email}) [id: ${u.id}, role: ${u.role}]`);
    });
  }
}
run();
