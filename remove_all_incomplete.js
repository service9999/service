import fs from 'fs';

let content = fs.readFileSync('index.js', 'utf8');
let lines = content.split('\n');
let newLines = [];
let inFunction = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Track function context
  if (line.startsWith('function ') || line.includes('=> {') || 
      /^(app|io)\..*\(.*\{/.test(line) || line.startsWith('class ')) {
    inFunction = true;
  }
  
  // Skip try blocks that are NOT in functions
  if (line === 'try {' && !inFunction) {
    console.log('Removing incomplete try at line', i+1);
    // Skip until we find a complete structure
    let skip = true;
    let braces = 1;
    i++;
    while (skip && i < lines.length) {
      if (lines[i].includes('{')) braces++;
      if (lines[i].includes('}')) braces--;
      if (lines[i].includes('catch') || lines[i].includes('finally') || braces === 0) {
        skip = false;
      }
      i++;
    }
    i--;
    continue;
  }
  
  // Track function end
  if (line === '}' && inFunction) {
    inFunction = false;
  }
  
  newLines.push(lines[i]);
}

fs.writeFileSync('index.js', newLines.join('\n'));
console.log('✅ Removed all incomplete try blocks');
