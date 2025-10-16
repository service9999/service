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
