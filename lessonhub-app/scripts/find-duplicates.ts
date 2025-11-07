import fs from 'fs';
import path from 'path';

const searchPaths = ['src'];
const patterns = ['guideCardImage', 'guideIsVisible', 'guideIsFreeForAll'];

const results: Record<string, string[]> = {};
patterns.forEach((pattern) => {
  results[pattern] = [];
});

function scanDir(dir: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      patterns.forEach((pattern) => {
        if (content.includes(pattern)) {
          results[pattern].push(fullPath);
        }
      });
    }
  }
}

searchPaths.forEach(scanDir);
console.log(JSON.stringify(results, null, 2));
