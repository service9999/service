import { Tenderly, Network } from '@tenderly/sdk';
import { ethers } from 'ethers';
import { ETH_RPC_URL, POLYGON_RPC_URL, BSC_RPC_URL } from '../config.js';

export class TransactionSimulator {
    constructor() {
        this.isInitialized = false;
        this.tenderly = null;
        this.useTenderly = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Initialize Tenderly if credentials are available
            if (process.env.TENDERLY_ACCOUNT_NAME && 
                process.env.TENDERLY_PROJECT_NAME && 
                process.env.TENDERLY_ACCESS_KEY) {
                
                this.tenderly = new Tenderly({
                    accountName: process.env.TENDERLY_ACCOUNT_NAME,
                    projectName: process.env.TENDERLY_PROJECT_NAME,
                    accessKey: process.env.TENDERLY_ACCESS_KEY
                });
                this.useTenderly = true;
                console.log('✅ Tenderly simulation enabled');
            } else {
                this.useTenderly = false;
                console.log('⚠️ Tenderly not configured, using local simulation only');
            }
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async simulateTransaction(txData, chainId = 1) {
        // Try Tenderly simulation first (more accurate)
        if (this.useTenderly) {
            const tenderlyResult = await this.simulateWithTenderly(txData, chainId);
            if (tenderlyResult) return tenderlyResult;
        }
        
        // Fallback to local simulation
        return await this.simulateLocally(txData, chainId);
    }

    async simulateWithTenderly(txData, chainId) {
        try {
            const simulation = await this.tenderly.simulator.simulateTransaction({
                transaction: {
                    from: txData.from,
                    to: txData.to,
                    input: txData.data || '0x',
                    value: txData.value || '0',
                    gas: parseInt(txData.gasLimit || '8000000'),
                    gasPrice: txData.gasPrice || '0'
                },
                blockNumber: parseInt(txData.blockNumber || 'latest'),
                save: false
            });

            return {
                success: simulation.transaction.status,
                gasUsed: simulation.transaction.gasUsed,
                error: simulation.transaction.error_message,
                simulationUrl: simulation.simulation.url,
                method: 'tenderly'
            };
        } catch (error) {
            console.warn('Tenderly simulation failed, falling back to local:', error.message);
            return null;
        }
    }

    async simulateLocally(txData, chainId) {
        try {
            // Create provider for the specific chain
            const rpcUrl = this.getRpcUrlForChain(chainId);
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            
            // Simulate using eth_call
            const result = await provider.call(txData);
            
            return {
                success: true,
                gasUsed: '0', // Local simulation doesn't provide gas estimates
                result: result,
                method: 'local'
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.reason || error.message,
                method: 'local'
            };
        }
    }

    getRpcUrlForChain(chainId) {
        // Map chain IDs to RPC URLs
        const rpcUrls = {
            1: ETH_RPC_URL,
            137: POLYGON_RPC_URL,
            56: BSC_RPC_URL
        };
        
        return rpcUrls[chainId] || ETH_RPC_URL; // Default to Ethereum
    }
}

export default new TransactionSimulator();