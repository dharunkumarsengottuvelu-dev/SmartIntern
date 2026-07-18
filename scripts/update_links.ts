import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing Supabase URL or Key in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateLinks() {
  console.log("Updating apply links in Supabase...");
  
  // Get all internships
  const { data: internships, error: fetchError } = await supabase.from("internships").select("id, apply_link");
  
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  let updated = 0;
  for (const internship of internships) {
    // Replace the apply_link with a google search for that specific link (so it doesn't 404)
    // Or just a placeholder URL. Let's use a google search for internships to make it functional.
    const newLink = `https://www.google.com/search?q=${encodeURIComponent(internship.apply_link + " internship apply")}`;
    
    const { error: updateError } = await supabase
      .from("internships")
      .update({ apply_link: newLink })
      .eq("id", internship.id);
      
    if (updateError) {
      console.error("Update error for ID " + internship.id + ":", updateError);
    } else {
      updated++;
    }
  }
  
  console.log(`✅ Successfully updated ${updated} internship URLs to prevent 404 errors.`);
}

updateLinks();
