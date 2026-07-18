import OpenAI from "openai";
import { generateMCQs, resolveAPIKey } from "./openai"; // re-export for convenience — Grok now uses shared fallback

// Lazy getter — only instantiated at request time, not at build time.
function getGrok(): OpenAI {
  return new OpenAI({
    apiKey: resolveAPIKey(),
    baseURL: "https://api.x.ai/v1",
  });
}

export interface GrokMCQQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export async function generateMCQsWithGrok(skills: string[]): Promise<GrokMCQQuestion[]> {
  const skillsList = skills.slice(0, 10).join(", ");

  const prompt = `Generate exactly 20 multiple choice questions to assess a candidate's knowledge of: ${skillsList}

Rules:
- 7 easy, 8 medium, 5 hard questions
- Exactly 4 options per question
- Return ONLY valid JSON

JSON structure:
{
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "difficulty": "easy",
      "topic": "skill name"
    }
  ]
}`;

  try {
    const response = await getGrok().chat.completions.create({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content || '{"questions":[]}';
    // Strip any markdown code fences if present
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return (parsed.questions || []) as GrokMCQQuestion[];
  } catch (error) {
    console.error("Grok API error:", error);
    return [];
  }
}

export async function extractSkillsWithGrok(text: string): Promise<Record<string, string[]>> {
  try {
    const response = await getGrok().chat.completions.create({
      model: "grok-3-mini",
      messages: [
        {
          role: "user",
          content: `Extract skills from this resume. Return JSON only:\n${text.substring(0, 3000)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

export default getGrok;
