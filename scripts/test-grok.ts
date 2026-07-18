import { config } from "dotenv";
config({ path: ".env.local" });
import { reviewResumeWithGrok } from "../lib/openai";

async function test() {
  console.log("XAI_API_KEY from env:", process.env.XAI_API_KEY ? "Found" : "Missing");
  console.log("OPENAI_API_KEY from env:", process.env.OPENAI_API_KEY ? "Found" : "Missing");
  
  const sampleResume = `
    Dharunkumar S
    Email: dharun@example.com
    Degree: BE in Computer Science and Engineering
    Skills: React, Node.js, Python, TypeScript, MongoDB, Git.
    Projects: Built a smart internship matchmaking system.
  `;
  
  try {
    const result = await reviewResumeWithGrok(sampleResume);
    console.log("Grok Review Result:");
    console.log("ATS Score:", result.atsScore);
    console.log("Strengths:", result.strengths);
    console.log("Weaknesses:", result.weaknesses);
    console.log("Improvements:", result.improvements);
    console.log("Extracted Skills:", result.extractedSkills);
  } catch (err: any) {
    console.error("Test failed with error:", err);
  }
}

test();
