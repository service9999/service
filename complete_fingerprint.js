app.post('/api/fingerprint/generate', async (req, res) => {
    try {
        const { sessionId } = req.body;
        console.log('🎭 Generating fingerprint for session:', sessionId);
        
        const fingerprint = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            sessionId: sessionId || 'fp_' + Date.now(),
            screen: { width: 1920, height: 1080 },
            language: 'en-US',
            timezone: 'America/New_York',
            timestamp: new Date().toISOString(),
            simple: true
        };
        
        res.json({ success: true, fingerprint });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
