import fs from 'fs';
let content = fs.readFileSync('index.js', 'utf8');

// Find lines with raw HTML at the start
const lines = content.split('\n');
let inTemplateLiteral = false;
let fixedLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line starts with HTML but isn't in a template literal
    if (line.startsWith('<') && !inTemplateLiteral && 
        !lines[i-1]?.includes('`') && !lines[i-1]?.includes('innerHTML') &&
        !lines[i-1]?.includes('res.send') && !lines[i-1]?.includes('res.write')) {
        
        // This HTML is in wrong context - comment it out
        fixedLines.push('// ' + lines[i]);
        console.log(`⚠️ Commented out raw HTML at line ${i+1}: ${line.substring(0, 50)}...`);
    } else {
        fixedLines.push(lines[i]);
    }
    
    // Track template literal state
    if (lines[i].includes('`') && !lines[i].includes("\\\\`")) {
        const backtickCount = (lines[i].match(/`/g) || []).length;
        if (backtickCount % 2 !== 0) {
            inTemplateLiteral = !inTemplateLiteral;
        }
    }
}

fs.writeFileSync('index.js', fixedLines.join('\n'));
console.log('✅ Fixed raw HTML in JavaScript context');
