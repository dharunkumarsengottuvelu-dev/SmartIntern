// Skill aliases for fuzzy matching
const SKILL_ALIASES: Record<string, string[]> = {
  react: ["react.js", "reactjs", "react js"],
  nodejs: ["node.js", "node js", "nodejs"],
  nextjs: ["next.js", "next js"],
  javascript: ["js", "javascript"],
  typescript: ["ts", "typescript"],
  python: ["python3", "python 3"],
  mongodb: ["mongo", "mongodb"],
  postgresql: ["postgres", "postgresql", "psql"],
  mysql: ["mysql", "my sql"],
  css: ["css3", "css"],
  html: ["html5", "html"],
  tailwind: ["tailwindcss", "tailwind css"],
  docker: ["docker", "dockerfile"],
  git: ["github", "git"],
  aws: ["amazon web services", "aws"],
  graphql: ["graphql", "graph ql"],
  express: ["express.js", "expressjs"],
  vuejs: ["vue.js", "vue js", "vuejs"],
  angular: ["angularjs", "angular.js"],
  flutter: ["flutter", "dart/flutter"],
  kotlin: ["kotlin", "android/kotlin"],
  swift: ["swift", "ios/swift"],
};

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(lower) || lower === canonical) return canonical;
  }
  return lower;
}

export function matchSkills(
  studentSkills: string[],
  requiredSkills: string[]
): { score: number; matched: string[] } {
  if (!requiredSkills.length) return { score: 0, matched: [] };

  const normalizedStudent = studentSkills.map(normalizeSkill);
  const matched: string[] = [];

  for (const req of requiredSkills) {
    const normalReq = normalizeSkill(req);
    if (
      normalizedStudent.some(
        (s) => s === normalReq || s.includes(normalReq) || normalReq.includes(s)
      )
    ) {
      matched.push(req);
    }
  }

  const score = Math.round((matched.length / requiredSkills.length) * 100);
  return { score, matched };
}

export function calculateRecommendationScore(
  skillScore: number,
  atsScore: number,
  assessmentPercentage: number
): number {
  // Recommendation weight: 40% skills match, 30% ATS score, 30% Assessment score
  return Math.round(skillScore * 0.4 + atsScore * 0.3 + assessmentPercentage * 0.3);
}

export interface RecommendationResult {
  internshipId: string;
  matchPercentage: number;
  skillScore: number;
  assessmentScore: number;
  matchedSkills: string[];
}

export function rankInternships(
  internships: Array<{ _id: string; requiredSkills: string[] }>,
  studentSkills: string[],
  atsScore: number,
  assessmentPercentage: number
): RecommendationResult[] {
  if (!internships.length) return [];

  const results: RecommendationResult[] = internships.map((internship) => {
    const { score: skillScore, matched } = matchSkills(
      studentSkills,
      internship.requiredSkills
    );
    const matchPercentage = calculateRecommendationScore(
      skillScore,
      atsScore,
      assessmentPercentage
    );
    return {
      internshipId: internship._id.toString(),
      matchPercentage,
      skillScore,
      assessmentScore: assessmentPercentage,
      matchedSkills: matched,
    };
  });

  // Sort by combined match score (highest first)
  const sorted = results.sort((a, b) => b.matchPercentage - a.matchPercentage);

  // Primary: internships with at least some score
  const withScore = sorted.filter((r) => r.matchPercentage > 0);

  // Fallback: if no scores at all (e.g. student hasn't taken assessment yet),
  // return top internships sorted by skill match only so the tab is never empty
  const ranked = withScore.length > 0 ? withScore : sorted;

  return ranked;
}
