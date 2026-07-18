import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://oqotfihemtqoavxzzics.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DHARUN_USER_ID = "9615eec0-8ebd-4caa-b8fa-c155c8f10d20";

async function run() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.from("resumes").select("*").eq("user_id", DHARUN_USER_ID).single();
  if (error) {
    console.error("Error fetching resume:", error);
  } else {
    console.log("Dharunkumar S Resume details:");
    console.log("File Name:", data.file_name);
    console.log("ATS Score:", data.ats_score);
    console.log("Extracted Skills:", data.extracted_skills);
    console.log("Strengths:", data.strengths);
    console.log("Weaknesses:", data.weaknesses);
    console.log("Breakdown:", data.breakdown);
    console.log("Raw Text:");
    console.log("-----------------------------------------");
    console.log(data.raw_text);
    console.log("-----------------------------------------");
  }
}
run();
