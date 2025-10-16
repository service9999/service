app.post('/api/fingerprint/generate', async (req, res) => {
    try {
        const { sessionId, profileType } = req.body;
        const fingerprint = await coreDrainer.fingerprintSpoofer.generateSpoofedFingerprint(
            sessionId || 'session_' + Date.now(), 
            profileType || 'chrome_windows'
        );
        res.json({ success: true, fingerprint });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
