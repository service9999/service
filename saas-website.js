// saas-website.js - Marketing site for client acquisition
export function generateMarketingSite() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DrainerSAAS - Start Earning Today</title>
    <style>
        :root {
            --primary-color: #6366f1;
            --gradient: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #0f0f23;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .hero {
            min-height: 100vh;
            background: radial-gradient(circle at 10% 20%, rgba(28,28,51,0.8) 0%, rgba(15,15,35,0.9) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 20px;
        }
        
        .hero-content h1 {
            font-size: 3.5rem;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 20px;
        }
        
        .hero-subtitle {
            font-size: 1.3rem;
            color: #94a3b8;
            margin-bottom: 40px;
            max-width: 600px;
        }
        
        .cta-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 16px 32px;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .btn-primary {
            background: var(--gradient);
            color: white;
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        }
        
        .features {
            padding: 100px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 50px;
        }
        
        .feature-card {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            padding: 40px 30px;
            text-align: center;
            backdrop-filter: blur(10px);
            transition: transform 0.3s ease;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
        }
        
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 20px;
        }
        
        .feature-title {
            font-size: 1.4rem;
            margin-bottom: 15px;
            color: var(--primary-color);
        }
        
        .pricing {
            padding: 100px 20px;
            background: rgba(15, 15, 35, 0.8);
            text-align: center;
        }
        
        .pricing-card {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            padding: 50px 40px;
            max-width: 500px;
            margin: 0 auto;
            backdrop-filter: blur(10px);
        }
        
        .price {
            font-size: 3rem;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 20px 0;
        }
        
        .price-note {
            color: #94a3b8;
            margin-bottom: 30px;
        }
        
        .form-container {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            margin: 50px auto;
            backdrop-filter: blur(10px);
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-input {
            width: 100%;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: white;
            font-size: 1rem;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        
        .stat {
            text-align: center;
        }
        
        .stat-number {
            font-size: 2.5rem;
            font-weight: bold;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .stat-label {
            color: #94a3b8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <section class="hero">
        <div class="hero-content">
            <h1>Start Your Drainer Business in 5 Minutes</h1>
            <p class="hero-subtitle">
                No coding needed. Get your custom-branded drainer instantly. 
                Keep 75% of all profits. We handle the technical work.
            </p>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">75%</div>
                    <div class="stat-label">Your Profit Share</div>
                </div>
                <div class="stat">
                    <div class="stat-number">5min</div>
                    <div class="stat-label">Setup Time</div>
                </div>
                <div class="stat">
                    <div class="stat-number">$0</div>
                    <div class="stat-label">Upfront Cost</div>
                </div>
            </div>
            
            <div class="cta-buttons">
                <a href="#signup" class="btn btn-primary">Start Earning Now</a>
                <a href="#features" class="btn btn-secondary">Learn More</a>
            </div>
        </div>
    </section>
    
    <section id="features" class="features">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 20px; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Everything You Need to Succeed
        </h2>
        <p style="text-align: center; color: #94a3b8; font-size: 1.2rem; max-width: 600px; margin: 0 auto 60px;">
            We handle the technical complexity so you can focus on promotion
        </p>
        
        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">🚀</div>
                <h3 class="feature-title">Instant Setup</h3>
                <p>Get your custom drainer in 5 minutes. No technical skills required.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🎨</div>
                <h3 class="feature-title">White-Label Branding</h3>
                <p>Your brand, your domain. Fully customizable to match your style.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h3 class="feature-title">Real-Time Dashboard</h3>
                <p>Track earnings, participants, and performance in real-time.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">💸</div>
                <h3 class="feature-title">Automatic Payouts</h3>
                <p>Get paid every Monday. 75% of all earnings goes straight to you.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🛡️</div>
                <h3 class="feature-title">Secure & Reliable</h3>
                <p>Enterprise-grade infrastructure. We handle security and maintenance.</p>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🎯</div>
                <h3 class="feature-title">Proven Templates</h3>
                <p>High-converting designs that work. Based on successful campaigns.</p>
            </div>
        </div>
    </section>
    
    <section class="pricing">
        <h2 style="font-size: 2.5rem; margin-bottom: 20px; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Simple, Performance-Based Pricing
        </h2>
        
        <div class="pricing-card">
            <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Partner Plan</h3>
            <div class="price">75% / 25%</div>
            <p class="price-note">You keep 75% of all earnings</p>
            
            <ul style="text-align: left; color: #94a3b8; margin-bottom: 30px; list-style: none;">
                <li style="margin-bottom: 10px;">✓ Custom branded drainer</li>
                <li style="margin-bottom: 10px;">✓ Real-time dashboard</li>
                <li style="margin-bottom: 10px;">✓ Weekly automatic payouts</li>
                <li style="margin-bottom: 10px;">✓ 24/7 platform maintenance</li>
                <li style="margin-bottom: 10px;">✓ Technical support</li>
                <li style="margin-bottom: 10px;">✓ No upfront costs</li>
            </ul>
            
            <a href="#signup" class="btn btn-primary" style="display: block; width: 100%;">Get Started Now</a>
        </div>
    </section>
    
    <section id="signup" class="features">
        <div class="form-container">
            <h2 style="text-align: center; margin-bottom: 30px; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                Start Earning Today
            </h2>
            
            <form id="signupForm">
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="Project Name" required>
                </div>
                
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="Your Wallet Address (for payouts)" required>
                </div>
                
                <div class="form-group">
                    <input type="text" class="form-input" placeholder="Telegram Username (for support)">
                </div>
                
                <div class="form-group">
                    <select class="form-input" required>
                        <option value="">Select Theme Color</option>
                        <option value="#6366f1">Purple</option>
                        <option value="#3b82f6">Blue</option>
                        <option value="#ef4444">Red</option>
                        <option value="#10b981">Green</option>
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%;">
            
            console.log("Form found, adding event listener...");
            
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                console.log('Form submitted!');
                
                // Get form elements by index (most reliable approach)
                const inputs = this.getElementsByTagName('input');
                const selects = this.getElementsByTagName('select');
                
                console.log('Inputs count:', inputs.length, 'Selects count:', selects.length);
                
                // Simple validation
                if (inputs.length < 2) {
                    alert('Form elements not found properly');
                    return;
                }
                
                const formData = {
                    projectName: inputs[0].value,
                    wallet: inputs[1].value,
                    contact: inputs[2] ? inputs[2].value : '',
                    themeColor: selects[0] ? selects[0].value : '#6366f1'
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

                } catch (error) {
                    console.error('Request failed:', error);
                    alert('❌ Network error: ' + error.message);
                }
            });
        });
    </script>
</body>
</html>
