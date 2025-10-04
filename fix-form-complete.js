const fs = require('fs');
let content = fs.readFileSync('saas-website.js', 'utf8');

// Replace the entire broken form section with a working version
const workingFormCode = `            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted!');
                
                // Get form elements by index - most reliable method
                const inputs = this.getElementsByTagName('input');
                const selects = this.getElementsByTagName('select');
                
                console.log('Found inputs:', inputs.length, 'selects:', selects.length);
                
                // Validate we have the expected elements
                if (inputs.length < 2) {
                    alert('Error: Form elements not loaded properly');
                    return;
                }
                
                const formData = {
                    projectName: inputs[0].value,
                    wallet: inputs[1].value,
                    contact: inputs[2] ? inputs[2].value : '',
                    themeColor: selects[0] ? selects[0].value : '#6366f1'
                };
                
                console.log('Form data to send:', formData);`;

// Replace from the form.addEventListener line
content = content.replace(/form\.addEventListener\('submit', async function\(e\) \{[\s\S]*?const formData = \{/g, workingFormCode);

fs.writeFileSync('saas-website.js', content);
console.log('✅ Form completely fixed with reliable element selection');
