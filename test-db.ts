import { config } from "dotenv";
config({ path: ".env.local" });

import { getSupabase } from "./lib/supabase";

async function test() {
  const sb = getSupabase();
  console.log("Fetching all users...");
  const { data, error } = await sb.from("users").select("email, role");
  console.log("Users:", data);
  console.log("Error:", error);
}

test();
