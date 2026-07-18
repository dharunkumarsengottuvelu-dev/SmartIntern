import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY!);

async function checkSchema() {
  const tables = ["users", "resumes", "assessments", "recommendations", "internships"];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Table "${table}" error:`, error.message || error);
    } else if (data && data.length > 0) {
      console.log(`Table "${table}" columns:`, Object.keys(data[0]));
    } else {
      console.log(`Table "${table}" query succeeded, but table is empty.`);
    }
  }
}

checkSchema().then(() => {
  console.log("Schema check completed successfully.");
  process.exit(0);
}).catch((err) => {
  console.error("Schema check failed:", err);
  process.exit(1);
});
