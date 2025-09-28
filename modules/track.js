// modules/track.js
import { ethers } from 'ethers';
import { CHAINLINK_ETH_USD_FEED } from '../config.js';

const OPTIMAL_CONDITIONS = {
  GAS_THRESHOLD: 30 // Gwei
};

export class ExecutionScheduler {
  constructor(providerUrl) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.isInitialized = false; // ← ADD THIS
  }

  // ← ADD THIS METHOD
  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      
      // Test provider connection
      await this.provider.getNetwork();
      
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.constructor.name} initialization failed:`, error);
      return false;
    }
  }

  async fetchEthPrice() {
    const aggregatorV3InterfaceABI = [{
      inputs: [],
      name: "latestRoundData",
      outputs: [
        { internalType: "uint80", name: "roundId", type: "uint80" },
        { internalType: "int256", name: "answer", type: "int256" },
        { internalType: "uint256", name: "startedAt", type: "uint256" },
        { internalType: "uint256", name: "updatedAt", type: "uint256" },
        { internalType: "uint80", name: "answeredInRound", type: "uint80" }
      ],
      stateMutability: "view",
      type: "function"
    }];
    
    const priceFeed = new ethers.Contract(
      CHAINLINK_ETH_USD_FEED,
      aggregatorV3InterfaceABI,
      this.provider
    );
    const roundData = await priceFeed.latestRoundData();
    const price = Number(roundData.answer) / 1e8;
    return price;
  }

  async shouldExecute() {
    const [gasPrice, ethPrice] = await Promise.all([
      this.provider.getGasPrice().then(p => ethers.formatUnits(p, 'gwei')),
      this.fetchEthPrice()
    ]);
    return parseFloat(gasPrice) <= OPTIMAL_CONDITIONS.GAS_THRESHOLD && ethPrice > 1500;
  }
}

// Create singleton instance with default provider
export const executionScheduler = new ExecutionScheduler(process.env.DEFAULT_RPC_URL);