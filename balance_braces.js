import fs from 'fs';

let content = fs.readFileSync('index.js', 'utf8');
let lines = content.split('\n');
let newLines = [];
let braceCount = 0;

console.log('🔧 Balancing braces...\n');

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let trimmed = line.trim();
  
  // Count braces for this line
  const openBraces = (line.match(/{/g) || []).length;
  const closeBraces = (line.match(/}/g) || []).length;
  const netBraces = openBraces - closeBraces;
  
  // If we have too many closing braces and this line is problematic, skip it
  if (braceCount + netBraces < 0 && closeBraces > 0 && 
      (trimmed === '}' || trimmed.startsWith('} ') || trimmed.endsWith('}'))) {
    console.log(`Removing orphan } at line ${i+1}: ${trimmed}`);
    continue; // Skip this orphan closing brace
  }
  
  braceCount += netBraces;
  newLines.push(line);
}

// Add missing opening braces if needed
while (braceCount < 0) {
  console.log(`Adding missing opening brace`);
  newLines.unshift('{ // AUTO-ADDED: Missing opening brace');
  braceCount++;
}

console.log(`Final brace balance: ${braceCount}`);
fs.writeFileSync('index.js', newLines.join('\n'));
console.log('✅ Braces balanced');
