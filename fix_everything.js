import fs from 'fs';

console.log('🔍 FINDING AND FIXING ALL SYNTAX ERRORS AT ONCE...\n');

let content = fs.readFileSync('index.js', 'utf8');
let lines = content.split('\n');

// Track all issues
const issues = {
  duplicateImports: [],
  incompleteTryBlocks: [],
  orphanBraces: [],
  duplicateVariables: []
};

// 1. Find duplicate imports
const imports = {};
lines.forEach((line, i) => {
  if (line.includes('import ') && line.includes('from')) {
    const key = line.trim();
    if (imports[key]) {
      issues.duplicateImports.push({ line: i+1, content: line });
    } else {
      imports[key] = true;
    }
  }
});

// 2. Find incomplete try blocks and orphan braces
let braceCount = 0;
let inFunction = false;

lines.forEach((line, i) => {
  const trimmed = line.trim();
  
  // Track braces
  braceCount += (line.match(/{/g) || []).length;
  braceCount -= (line.match(/}/g) || []).length;
  
  // Find incomplete try blocks
  if (trimmed === 'try {' && !inFunction) {
    issues.incompleteTryBlocks.push({ line: i+1, content: line });
  }
  
  // Track function context
  if (trimmed.startsWith('function ') || trimmed.includes('=> {') || /^(app|io)\..*\(.*\{/.test(trimmed)) {
    inFunction = true;
  }
  if (trimmed === '}' && inFunction && braceCount === 0) {
    inFunction = false;
  }
});

// 3. Find duplicate variables
const variables = {};
['const app', 'const server', 'export const io', 'let clients', 'let clientEarnings', 'let clientVictims'].forEach(varName => {
  lines.forEach((line, i) => {
    if (line.includes(varName)) {
      if (variables[varName]) {
        variables[varName].push(i+1);
      } else {
        variables[varName] = [i+1];
      }
    }
  });
});

Object.entries(variables).forEach(([varName, lines]) => {
  if (lines.length > 1) {
    issues.duplicateVariables.push({ variable: varName, lines });
  }
});

// 4. Find orphan braces
if (braceCount !== 0) {
  issues.orphanBraces.push(`Unbalanced braces: ${braceCount} more ${braceCount > 0 ? 'opening' : 'closing'} braces`);
}

// Print all issues
console.log('📊 FOUND ISSUES:');
console.log('================\n');

if (issues.duplicateImports.length > 0) {
  console.log('❌ DUPLICATE IMPORTS:');
  issues.duplicateImports.forEach(issue => {
    console.log(`   Line ${issue.line}: ${issue.content}`);
  });
  console.log('');
}

if (issues.incompleteTryBlocks.length > 0) {
  console.log('❌ INCOMPLETE TRY BLOCKS:');
  issues.incompleteTryBlocks.forEach(issue => {
    console.log(`   Line ${issue.line}: ${issue.content}`);
  });
  console.log('');
}

if (issues.duplicateVariables.length > 0) {
  console.log('❌ DUPLICATE VARIABLES:');
  issues.duplicateVariables.forEach(issue => {
    console.log(`   ${issue.variable} at lines: ${issue.lines.join(', ')}`);
  });
  console.log('');
}

if (issues.orphanBraces.length > 0) {
  console.log('❌ BRACE ISSUES:');
  issues.orphanBraces.forEach(issue => console.log(`   ${issue}`));
  console.log('');
}

if (Object.values(issues).every(arr => arr.length === 0)) {
  console.log('✅ NO SYNTAX ISSUES FOUND! File should work.');
} else {
  console.log('💡 Run the fix commands above to resolve these issues.');
}
