import { generateMCQs } from "../lib/openai";

async function runTest() {
  const testSkills = ["React", "Python", "Kubernetes", "Figma"];
  console.log("Generating MCQs for skills:", testSkills);

  try {
    const questions = await generateMCQs(testSkills, 70);
    console.log(`Generated ${questions.length} questions successfully!\n`);

    questions.forEach((q, index) => {
      console.log(`Q${index + 1}: [Topic: ${q.topic}] [Difficulty: ${q.difficulty}]`);
      console.log(`Question: ${q.question}`);
      console.log("Options:");
      q.options.forEach((opt, oIdx) => {
        const marker = opt === q.answer ? " [*]" : "";
        console.log(`  ${oIdx + 1}. ${opt}${marker}`);
      });
      console.log("");
    });
  } catch (error) {
    console.error("MCQ Generation test failed:", error);
  }
}

runTest();
