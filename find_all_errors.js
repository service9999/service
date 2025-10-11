import fs from 'fs';

const content = fs.readFileSync('index.js', 'utf8');
const lines = content.split('\n');

console.log('🔍 FINDING ALL INCOMPLETE TRY BLOCKS:\n');

let inFunction = false;
let incompleteCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Track function context
  if (line.startsWith('function ') || line.includes('=> {') || 
      /^(app|io)\..*\(.*\{/.test(line) || line.startsWith('class ')) {
    inFunction = true;
  }
  
  // Find incomplete try blocks (not in functions)
  if (line === 'try {' && !inFunction) {
    console.log(`❌ INCOMPLETE TRY at line ${i+1}:`);
    console.log(`   ${lines[i]}`);
    // Show context
    for (let j = Math.max(0, i-2); j <= Math.min(lines.length-1, i+5); j++) {
      console.log(`   ${j+1}: ${lines[j]}`);
    }
    console.log('');
    incompleteCount++;
  }
  
  // Track function end
  if (line === '}' && inFunction) {
    inFunction = false;
  }
}

console.log(`📊 TOTAL INCOMPLETE TRY BLOCKS: ${incompleteCount}`);
