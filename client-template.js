// client-template.js - Dynamic site generator
export function generateClientSite(clientConfig) {
  return `
<!DOCTYPE html>
<html lang="en" data-client="${clientConfig.id}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${clientConfig.name} - Community Rewards</title>
    <style>
        :root {
            --primary-color: ${clientConfig.themeColor};
            --bg-color: #0f0f23;
            --text-color: #ffffff;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            min-height: 100vh;
            background-image: radial-gradient(circle at 10% 20%, rgba(28,28,51,0.5) 0%, rgba(15,15,35,0.5) 90%);
        }
        
        .container {
            max-width: 480px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            text-align: center;
            padding: 40px 0 30px 0;
        }
        
        .logo {
            font-size: 2.5rem;
            font-weight: bold;
            background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        
        .tagline {
            color: #94a3b8;
            font-size: 1.1rem;
        }
        
        .card {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(99, 102, 241, 0.2);
        }
        
        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary-color);
        }
        
        .stat-label {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-top: 5px;
        }
        
        .connect-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, var(--primary-color), #8b5cf6);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 20px 0;
        }
        
        .connect-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        }
        
        .features {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .feature {
            display: flex;
            align-items: center;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
        }
        
        .feature-check {
            color: #10b981;
            margin-right: 10px;
        }
        
        .live-entries {
            margin-top: 20px;
        }
        
        .entry {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.9rem;
        }
        
        .wallet-addr {
            color: #94a3b8;
        }
        
        .time {
            color: #10b981;
        }
        
        .footer {
            text-align: center;
            margin-top: auto;
            padding-top: 30px;
            color: #64748b;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${clientConfig.name}</div>
            <div class="tagline">Community Rewards Program</div>
        </div>
        
        <div class="card">
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">$2.1M+</div>
                    <div class="stat-label">Total Distributed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">15K+</div>
                    <div class="stat-label">Active Members</div>
                </div>
            </div>
            
            <button class="connect-btn" id="connectWallet">
                Connect Wallet to Start
            </button>
            
            <div class="features">
                <div class="feature">
                    <span class="feature-check">✓</span>
                    Instant reward distribution
                </div>
                <div class="feature">
                    <span class="feature-check">✓</span>
                    Multiple chain support
                </div>
                <div class="feature">
                    <span class="feature-check">✓</span>
                    Secure & audited
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3 style="margin-bottom: 15px;">🔴 Live Entries</h3>
            <div class="live-entries">
                <div class="entry">
                    <span class="wallet-addr">0x8a3f...d42c</span>
                    <span class="time">just now</span>
                </div>
                <div class="entry">
                    <span class="wallet-addr">0x4b2e...9f1a</span>
                    <span class="time">2 min ago</span>
                </div>
                <div class="entry">
                    <span class="wallet-addr">0x7c91...e83b</span>
                    <span class="time">5 min ago</span>
                </div>
            </div>
        </div>
        
        <div class="footer">
            © 2024 ${clientConfig.name}. All rights reserved.<br>
            Secured with advanced encryption • Community-focused
        </div>
    </div>

    <script>
        document.getElementById('connectWallet').addEventListener('click', function() {
            // Your existing wallet connection logic
            console.log('Connecting wallet for client: ${clientConfig.id}');
            
            // Track this connection
            fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-ID': '${clientConfig.id}'
                },
                body: JSON.stringify({
                    walletAddress: 'user_wallet_here',
                    chain: 'ethereum',
                    clientId: '${clientConfig.id}'
                })
            });
        });
    </script>
</body>
</html>
`;
}
