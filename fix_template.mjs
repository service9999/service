import fs from 'fs';
let content = fs.readFileSync('index.js', 'utf8');

// Find the controlPanelHTML template
const templateStart = content.indexOf('const controlPanelHTML = `');
if (templateStart !== -1) {
    // Find where the template should end (before res.send)
    const sendIndex = content.indexOf('res.send(controlPanelHTML);', templateStart);
    if (sendIndex !== -1) {
        // Extract the template content
        const beforeSend = content.substring(0, sendIndex);
        const templateEnd = beforeSend.lastIndexOf('`');
        
        if (templateEnd === -1 || templateEnd < templateStart) {
            console.log('❌ Template literal not properly closed');
            // Add closing backtick before res.send
            content = content.replace('res.send(controlPanelHTML);', '`;\n  res.send(controlPanelHTML);');
        }
    }
}

fs.writeFileSync('index.js', content);
console.log('✅ Fixed template literal structure');
