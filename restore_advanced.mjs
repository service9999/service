import fs from 'fs';

const content = fs.readFileSync('index.js.disaster', 'utf8');
const lines = content.split('\n');

// Find where the duplication starts by looking for repeated early sections
let duplicateStart = -1;
const seenSections = new Set();

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('====================') && lines[i].includes('SAAS CLIENT MANAGEMENT')) {
    if (seenSections.has('SAAS CLIENT MANAGEMENT')) {
      duplicateStart = i;
      break;
    }
    seenSections.add('SAAS CLIENT MANAGEMENT');
  }
}

if (duplicateStart > 0) {
  console.log(`Keeping first ${duplicateStart} lines (removing duplicates after)`);
  const cleanContent = lines.slice(0, duplicateStart).join('\n');
  fs.writeFileSync('index.js', cleanContent);
  console.log(`✅ Restored ${duplicateStart} lines with all advanced features`);
} else {
  console.log('No duplication found - using original');
  fs.copyFileSync('index.js.disaster', 'index.js');
}
