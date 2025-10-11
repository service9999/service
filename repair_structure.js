import fs from 'fs';

console.log('🔧 REPAIRING ENTIRE FILE STRUCTURE...\n');

let content = fs.readFileSync('index.js', 'utf8');
let lines = content.split('\n');
let newLines = [];
let inFunction = false;
let inClass = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let trimmed = line.trim();
  
  // Skip lines that are clearly broken
  if (trimmed.startsWith('const ') && !inFunction && !inClass && braceCount === 0) {
    console.log(`Skipping orphan const at line ${i+1}: ${trimmed.substring(0, 50)}`);
    continue;
  }
  
  if (trimmed.startsWith('let ') && !inFunction && !inClass && braceCount === 0) {
    console.log(`Skipping orphan let at line ${i+1}: ${trimmed.substring(0, 50)}`);
    continue;
  }
  
  // Track structure
  if (trimmed.startsWith('function ') || trimmed.includes('=> {') || 
      /^(app|io)\..*\(.*\{/.test(trimmed)) {
    inFunction = true;
  }
  
  if (trimmed.startsWith('class ')) {
    inClass = true;
  }
  
  // Track braces
  braceCount += (line.match(/{/g) || []).length;
  braceCount -= (line.match(/}/g) || []).length;
  
  // Track end of structures
  if (trimmed === '}' && braceCount === 0) {
    inFunction = false;
    inClass = false;
  }
  
  newLines.push(line);
}

fs.writeFileSync('index.js', newLines.join('\n'));
console.log('✅ File structure repaired');
