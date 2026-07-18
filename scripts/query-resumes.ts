import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("resumes").select("*");
  if (error) {
    console.error("Error fetching resumes:", error);
  } else {
    console.log("Resumes in database:");
    data.forEach((r, idx) => {
      console.log(`[${idx}] User: ${r.user_id}`);
      console.log(`    File: ${r.file_name}`);
      console.log(`    ATS Score: ${r.ats_score}`);
      console.log(`    Extracted Skills:`, r.extracted_skills);
      console.log(`    Raw Text Length: ${r.raw_text?.length}`);
      console.log(`    Raw Text Sample: ${r.raw_text?.substring(0, 300)}`);
    });
  }
}
run();
