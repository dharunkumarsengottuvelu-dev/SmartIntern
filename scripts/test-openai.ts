import { config } from "dotenv";
config({ path: ".env.local" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function test() {
  console.log("OpenAI Key exists:", !!OPENAI_API_KEY);
  if (!OPENAI_API_KEY) return;
  
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello! Say hi." }
        ]
      })
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
