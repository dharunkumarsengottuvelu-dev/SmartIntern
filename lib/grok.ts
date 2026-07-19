/**
 * LEGACY CLOUD LLM — DISABLED
 *
 * This file previously contained xAI/Grok API client code.
 * All cloud LLM calls have been replaced with local Ollama (gemma4:e4b)
 * calls via the ai-service microservice.
 *
 * This file is kept as dead-code reference ONLY. All exports return
 * no-ops / empty results unless LEGACY_CLOUD_LLM=true is explicitly set.
 * That flag defaults to false and should never be enabled on an offline box.
 *
 * To permanently remove this file:
 *   git rm lib/grok.ts
 *
 * See: app/api/chat/route.ts, app/api/mcq/generate/route.ts for the
 * replacement implementations.
 */

const LEGACY_ENABLED = process.env.LEGACY_CLOUD_LLM === "true";

if (LEGACY_ENABLED) {
  console.warn(
    "[grok.ts] LEGACY_CLOUD_LLM=true — this enables external xAI API calls " +
    "and BREAKS the offline requirement. Only set this if you explicitly want cloud LLM access."
  );
}

export interface GrokMCQQuestion {
  question: string;
  options: string[];
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

export async function generateMCQsWithGrok(skills: string[]): Promise<GrokMCQQuestion[]> {
  if (!LEGACY_ENABLED) {
    console.warn("[grok.ts] generateMCQsWithGrok called but LEGACY_CLOUD_LLM is not set. Returning []. Use ai-service instead.");
    return [];
  }
  // Legacy implementation removed — use ai-service/services/mcq_generator.py instead
  return [];
}

export async function extractSkillsWithGrok(text: string): Promise<Record<string, string[]>> {
  if (!LEGACY_ENABLED) {
    console.warn("[grok.ts] extractSkillsWithGrok called but LEGACY_CLOUD_LLM is not set. Returning {}. Use ai-service instead.");
    return {};
  }
  // Legacy implementation removed — use ai-service/services/resume_parser.py instead
  return {};
}

export default function getGrok() {
  if (!LEGACY_ENABLED) {
    throw new Error(
      "getGrok() called but LEGACY_CLOUD_LLM is not enabled. " +
      "All LLM calls should go through AI_SERVICE_URL instead."
    );
  }
  throw new Error("Legacy Grok client code has been removed. Use ai-service instead.");
}
