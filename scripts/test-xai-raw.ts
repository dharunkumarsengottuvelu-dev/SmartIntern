import { config } from "dotenv";
config({ path: ".env.local" });

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODELS = ["grok-3-mini", "grok-3", "grok-2-1212", "grok-2", "grok-beta"];

async function test() {
  console.log("Key exists:", !!XAI_API_KEY);
  if (!XAI_API_KEY) return;
  
  for (const model of XAI_MODELS) {
    try {
      console.log(`Testing model: ${model}...`);
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello! Say hi." }
          ]
        })
      });
      
      console.log(`Model: ${model} | Status: ${res.status}`);
      const data = await res.json();
      console.log(`Response for ${model}:`, JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error(`Fetch failed for ${model}:`, err.message);
    }
  }
}

test();
