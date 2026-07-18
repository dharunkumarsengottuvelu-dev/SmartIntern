import fs from 'fs';
import path from 'path';

// Path to the transcript
const logPath = 'C:\\Users\\KaaviyaDharun\\.gemini\\antigravity-ide\\brain\\d3aeb47a-ad11-4d45-83f6-e9da2076dffe\\.system_generated\\logs\\transcript.jsonl';
const outPath = 'd:\\My self\\Project 1\\smart-internship-system\\fixed_internships.sql';

console.log('Reading transcript...');
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

let massiveQuery = '';

// Reverse loop to find the most recent user message containing the INSERT statement
for (let i = lines.length - 1; i >= 0; i--) {
  if (!lines[i]) continue;
  try {
    const step = JSON.parse(lines[i]);
    if (step.type === 'USER_INPUT' && step.content && step.content.includes('INSERT INTO "internships"')) {
      // Extract the query from the content
      // The content format is <USER_REQUEST>\n ... \n</USER_REQUEST>...
      const match = step.content.match(/INSERT INTO "internships"[\s\S]*?(?=<\/USER_REQUEST>)/);
      if (match) {
        massiveQuery = match[0];
        break;
      }
    }
  } catch (err) {
    // ignore parse errors
  }
}

if (!massiveQuery) {
  console.log('Failed to find the massive SQL query in the transcript.');
  process.exit(1);
}

// Perform the replacement
console.log('Found query. Length:', massiveQuery.length);
const fixedQuery = massiveQuery.replace(/'[a-f0-9]{24}'/g, 'gen_random_uuid()');

fs.writeFileSync(outPath, fixedQuery);
console.log('✅ Fixed SQL saved to', outPath);
