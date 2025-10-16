app.post('/api/fingerprint/generate', async (req, res) => {
    try {
        const { sessionId, profileType } = req.body;
        
        // SIMPLE DIRECT IMPLEMENTATION - NO MODULES, NO DEPENDENCIES
        const fingerprint = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            sessionId: sessionId || 'direct_' + Date.now(),
            screen: { width: 1920, height: 1080 },
            language: 'en-US',
            timezone: 'America/New_York',
            timestamp: new Date().toISOString(),
            direct: true
        };
        
        console.log('✅ Fingerprint generated directly:', fingerprint.sessionId);
        res.json({ success: true, fingerprint });
    } catch (error) {
        console.log('❌ Fingerprint error:', error.message);
        res.json({ success: false, error: error.message });
    }
});
