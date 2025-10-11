import fs from 'fs';

console.log('🔧 FINAL COMPREHENSIVE REPAIR...\n');

let content = fs.readFileSync('index.js', 'utf8');
let lines = content.split('\n');
let newLines = [];
let inFunction = false;
let inClass = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let trimmed = line.trim();
  
  // Skip ALL orphan code (not in functions/classes)
  if ((trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) && 
      !inFunction && !inClass && braceCount === 0) {
    console.log(`Removing orphan declaration at line ${i+1}: ${trimmed.substring(0, 60)}`);
    continue;
  }
  
  // Skip orphan try blocks
  if (trimmed === 'try {' && !inFunction && !inClass) {
    console.log(`Removing orphan try at line ${i+1}`);
    let skip = true;
    i++;
    while (skip && i < lines.length) {
      if (lines[i].includes('{')) braceCount++;
      if (lines[i].includes('}')) braceCount--;
      if (lines[i].includes('catch') || lines[i].includes('finally') || braceCount === 0) {
        skip = false;
      }
      i++;
    }
    i--;
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
console.log('✅ Final repair complete');
