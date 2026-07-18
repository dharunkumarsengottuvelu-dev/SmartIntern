import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabase } from "./lib/supabase";

async function run() {
  const sb = getSupabase();
  const { data, error } = await sb.from("internships").select("*");
  console.log(error ? error : JSON.stringify(data, null, 2));
}
run();
