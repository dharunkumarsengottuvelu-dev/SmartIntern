import { config } from "dotenv";
config({ path: ".env.local" });

async function run() {
  console.log("Checking all potential LLM env keys:");
  const keys = [
    "OPENAI_API_KEY",
    "XAI_API_KEY",
    "GROK_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "ANTHROPIC_API_KEY",
    "COHERE_API_KEY",
  ];
  keys.forEach(k => {
    console.log(`- ${k}: ${process.env[k] ? "Exists (length: " + process.env[k]?.length + ")" : "Missing"}`);
  });
}
run();
