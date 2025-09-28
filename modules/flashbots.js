// backend/modules/flashbots.js
import { ethers } from "ethers";
import axios from 'axios';
import { securityManager } from './securityManager.js';
import { universalTxBuilder } from './universalTxBuilder.js';

export class FlashbotsService {
    constructor() {
        this.isInitialized = false;
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxRelayAttempts: 3,
            relayTimeout: 10000,
            minProfitThreshold: ethers.parseUnits('0.001', 'ether'),
            gasPriceMultiplier: 1.2,
            priorityFee: ethers.parseUnits('2.5', 'gwei'),
            simulationTimeout: 5000
        };

        // Gas estimates for different operations
        this.GAS_ESTIMATES = {
            SINGLE_TX: 21000,
            ERC20_TRANSFER: 65000,
            ERC20_APPROVAL: 45000,
            ERC721_TRANSFER: 85000,
            ERC1155_TRANSFER: 95000,
            MULTICALL_BASE: 50000,
            MULTICALL_PER_CALL: 25000
        };

        // Relay configurations
        this.RELAYS = {
            flashbots: { 
                url: process.env.FLASHBOTS_RPC_URL || 'https://rpc.flashbots.net',
                auth: process.env.FLASHBOTS_AUTH_KEY,
                priority: 1,
                enabled: false
            },
            bloxroute: { 
                url: process.env.BLOXROUTE_RPC_URL || 'https://api.blxrbdn.com',
                auth: process.env.BLOXROUTE_AUTH_KEY,
                priority: 2,
                enabled: false
            },
            eden: { 
                url: process.env.EDEN_RPC_URL || 'https://api.edennetwork.io/v1/bundle',
                auth: process.env.EDEN_AUTH_KEY,
                priority: 3,
                enabled: false
            },
            taichi: {
                url: process.env.TAICHI_RPC_URL || 'https://rpc.taichi.network',
                auth: process.env.TAICHI_AUTH_KEY,
                priority: 4,
                enabled: false
            }
        };

        this.providers = new Map();
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await this.initializeProviders();
            await universalTxBuilder.initialize();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async initializeProviders() {
        const rpcUrls = {
            '1': process.env.ETHEREUM_RPC_URL,
            '56': process.env.BSC_RPC_URL,
            '137': process.env.POLYGON_RPC_URL,
            '42161': process.env.ARBITRUM_RPC_URL,
            '10': process.env.OPTIMISM_RPC_URL,
            '43114': process.env.AVALANCHE_RPC_URL,
            '8453': process.env.BASE_RPC_URL
        };

        for (const [chainId, url] of Object.entries(rpcUrls)) {
            if (url) {
                try {
                    const provider = new ethers.JsonRpcProvider(url);
                    await provider.getBlockNumber();
                    this.providers.set(chainId, provider);
                    console.log(`✅ RPC Provider initialized for chain ${chainId}`);
                } catch (error) {
                    console.warn(`⚠️ Failed to initialize chain ${chainId} provider: ${error.message}`);
                }
            }
        }
    }

    async executeSinglePopupPrivateTx(userWallet, transaction, chainId = '1') {
        console.log(`🎯 Executing single-popup private transaction`);
        
        const startTime = Date.now();
        const txId = `fbs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        try {
            // Validate transaction
            this.validateTransaction(transaction);

            // Simulate transaction first
            const simulation = await this.simulateTransaction(transaction, chainId);
            
            if (!simulation.success) {
                throw new Error(`Transaction simulation failed: ${simulation.error}`);
            }

            console.log('✅ Simulation passed, sending via private relays...');

            // Optimize gas for the transaction
            const optimizedTx = await this.optimizeTransactionGas(transaction, chainId);

            // Send via private relays
            const txHash = await this.sendPrivateMultiRelay(optimizedTx, userWallet.privateKey, chainId);

            const result = {
                success: true,
                txId: txId,
                txHash: txHash,
                chainId: chainId,
                relayUsed: 'multiple',
                gasUsed: optimizedTx.gasLimit,
                executionTime: Date.now() - startTime
            };

            await securityManager.storePrivateTx(txId, result);
            return result;

        } catch (error) {
            console.error(`❌ Private transaction failed: ${error.message}`);
            
            const failedResult = {
                success: false,
                txId: txId,
                error: error.message,
                chainId: chainId,
                executionTime: Date.now() - startTime
            };

            await securityManager.storePrivateTx(txId, failedResult);
            return failedResult;
        }
    }

    validateTransaction(transaction) {
        if (!transaction.to) {
            throw new Error('Missing transaction recipient');
        }
        if (!transaction.data && !transaction.value) {
            throw new Error('Transaction has no data or value');
        }
        if (!transaction.gasLimit) {
            throw new Error('Missing gas limit');
        }
    }

    async simulateTransaction(transaction, chainId) {
        try {
            const provider = this.providers.get(chainId);
            if (!provider) {
                throw new Error(`No provider available for chain ${chainId}`);
            }

            const simulation = await provider.call({
                from: transaction.from,
                to: transaction.to,
                data: transaction.data || '0x',
                value: transaction.value || '0x0'
            });

            return {
                success: true,
                result: simulation,
                isMulticall: this.isMulticallTransaction(transaction),
                chainId: chainId
            };

        } catch (error) {
            return {
                success: false,
                error: this.extractRevertReason(error),
                chainId: chainId
            };
        }
    }

    isMulticallTransaction(transaction) {
        // Check if this is a multicall transaction
        return transaction.to && 
               transaction.to.toLowerCase() === '0xcA11bde05977b3631167028862bE2a173976CA11'.toLowerCase() &&
               transaction.data &&
               transaction.data.startsWith('0x252dba42');
    }

    extractRevertReason(error) {
        try {
            const errorString = error.toString();
            const revertMatch = errorString.match(/reverted with reason string '(.*?)'/);
            if (revertMatch && revertMatch[1]) {
                return revertMatch[1];
            }
            return error.reason || error.message || 'Unknown error';
        } catch {
            return 'Error parsing revert reason';
        }
    }

    async optimizeTransactionGas(transaction, chainId) {
        const optimizedTx = { ...transaction };
        
        try {
            const provider = this.providers.get(chainId);
            if (provider) {
                // Estimate gas with buffer
                const estimatedGas = await provider.estimateGas({
                    from: transaction.from,
                    to: transaction.to,
                    data: transaction.data || '0x',
                    value: transaction.value || '0x0'
                });

                optimizedTx.gasLimit = BigInt(Math.floor(Number(estimatedGas) * this.singlePopupConfig.gasPriceMultiplier));

                // Get current fee data
                const feeData = await provider.getFeeData();
                optimizedTx.maxFeePerGas = feeData.maxFeePerGas || this.singlePopupConfig.priorityFee;
                optimizedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || this.singlePopupConfig.priorityFee;
                optimizedTx.type = 2; // EIP-1559
            }

        } catch (error) {
            console.warn(`⚠️ Gas optimization failed: ${error.message}`);
            // Fallback to provided values
            if (!optimizedTx.gasLimit) {
                optimizedTx.gasLimit = this.estimateGasFallback(transaction);
            }
            if (!optimizedTx.gasPrice) {
                optimizedTx.gasPrice = await this.getCurrentGasPrice(chainId);
            }
        }

        return optimizedTx;
    }

    estimateGasFallback(transaction) {
        if (transaction.data && transaction.data !== '0x') {
            // Contract interaction
            if (transaction.data.startsWith('0xa9059cbb')) {
                return BigInt(this.GAS_ESTIMATES.ERC20_TRANSFER);
            } else if (transaction.data.startsWith('0x095ea7b3')) {
                return BigInt(this.GAS_ESTIMATES.ERC20_APPROVAL);
            } else if (this.isMulticallTransaction(transaction)) {
                return BigInt(this.GAS_ESTIMATES.MULTICALL_BASE + this.GAS_ESTIMATES.MULTICALL_PER_CALL * 3);
            } else {
                return BigInt(200000); // Generic contract call
            }
        } else {
            // ETH transfer
            return BigInt(this.GAS_ESTIMATES.SINGLE_TX);
        }
    }

    async getCurrentGasPrice(chainId) {
        try {
            const provider = this.providers.get(chainId);
            if (provider) {
                const feeData = await provider.getFeeData();
                return feeData.gasPrice || this.singlePopupConfig.priorityFee;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to get gas price: ${error.message}`);
        }
        return this.singlePopupConfig.priorityFee;
    }

    async sendPrivateMultiRelay(transaction, privateKey, chainId) {
        const enabledRelays = Object.entries(this.RELAYS)
            .filter(([_, config]) => config.enabled)
            .sort((a, b) => a[1].priority - b[1].priority);

        for (const [relayName, relayConfig] of enabledRelays) {
            try {
                console.log(`📡 Trying ${relayName} relay...`);
                
                const txHash = await this.sendToRelay(
                    relayName,
                    relayConfig,
                    transaction,
                    privateKey,
                    chainId
                );

                if (txHash) {
                    console.log(`✅ ${relayName} relay successful: ${txHash}`);
                    await this.reportRelaySuccess(relayName, txHash, transaction);
                    return txHash;
                }

            } catch (error) {
                console.warn(`⚠️ ${relayName} relay failed: ${error.message}`);
                // Continue to next relay
            }
        }

        throw new Error("All private relays failed");
    }

    async sendToRelay(relayName, relayConfig, transaction, privateKey, chainId) {
        try {
            if (relayName === 'flashbots') {
                return await this.sendToFlashbots(transaction, privateKey, chainId);
            } else {
                return await this.sendToGenericRelay(relayConfig, transaction, privateKey, chainId);
            }
        } catch (error) {
            throw new Error(`${relayName} failed: ${error.message}`);
        }
    }

    async sendToFlashbots(transaction, privateKey, chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(this.RELAYS.flashbots.url);
            const wallet = new ethers.Wallet(privateKey, provider);
            
            const txResponse = await wallet.sendTransaction(transaction);
            return txResponse.hash;

        } catch (error) {
            throw new Error(`Flashbots failed: ${error.message}`);
        }
    }

    async sendToGenericRelay(relayConfig, transaction, privateKey, chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(relayConfig.url);
            
            // Add authentication headers if available
            if (relayConfig.auth) {
                provider._getConnection().headers = {
                    ...provider._getConnection().headers,
                    'Authorization': `Bearer ${relayConfig.auth}`
                };
            }

            const wallet = new ethers.Wallet(privateKey, provider);
            const txResponse = await wallet.sendTransaction(transaction);
            return txResponse.hash;

        } catch (error) {
            throw new Error(`Relay failed: ${error.message}`);
        }
    }

    async reportRelaySuccess(relayName, txHash, transaction) {
        try {
            // Report to monitoring system
            await securityManager.logRelaySuccess({
                relay: relayName,
                txHash: txHash,
                gasLimit: transaction.gasLimit?.toString(),
                chainId: transaction.chainId,
                timestamp: Date.now()
            });

        } catch (error) {
            // Silent fail - monitoring shouldn't break the flow
            console.log('⚠️ Monitoring report failed:', error.message);
        }
    }

    async sendFlashbotsBundle(bundle, targetBlock, chainId = '1') {
        try {
            const response = await axios.post(this.RELAYS.flashbots.url, {
                jsonrpc: '2.0',
                method: 'eth_sendBundle',
                params: [{
                    txs: bundle,
                    blockNumber: targetBlock,
                    chainId: parseInt(chainId)
                }],
                id: 1
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.RELAYS.flashbots.auth && { 
                        'Authorization': `Bearer ${this.RELAYS.flashbots.auth}`,
                        'X-Flashbots-Multicall': 'true'
                    })
                },
                timeout: this.singlePopupConfig.relayTimeout
            });

            return response.data;

        } catch (error) {
            console.error('❌ Flashbots bundle submission failed:', error.message);
            throw error;
        }
    }

    async checkBundleStatus(bundleHash, chainId = '1') {
        try {
            const response = await axios.post(this.RELAYS.flashbots.url, {
                jsonrpc: '2.0',
                method: 'eth_getBundleStatus',
                params: [bundleHash],
                id: 1
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.RELAYS.flashbots.auth && { 
                        'Authorization': `Bearer ${this.RELAYS.flashbots.auth}` 
                    })
                },
                timeout: 5000
            });

            return response.data;

        } catch (error) {
            console.error('❌ Bundle status check failed:', error.message);
            return null;
        }
    }

    async getCurrentBlockNumber(chainId = '1') {
        try {
            const provider = this.providers.get(chainId);
            if (provider) {
                return await provider.getBlockNumber();
            }
            throw new Error(`No provider for chain ${chainId}`);
        } catch (error) {
            console.error('❌ Failed to get block number:', error.message);
            throw error;
        }
    }

    getRelayStats() {
        const stats = {
            totalRelays: Object.keys(this.RELAYS).length,
            enabledRelays: Object.values(this.RELAYS).filter(r => r.enabled).length,
            byRelay: {}
        };

        for (const [name, config] of Object.entries(this.RELAYS)) {
            stats.byRelay[name] = {
                enabled: config.enabled,
                priority: config.priority,
                hasAuth: !!config.auth
            };
        }

        return stats;
    }

    async updateRelayConfig(relayName, updates) {
        if (this.RELAYS[relayName]) {
            Object.assign(this.RELAYS[relayName], updates);
            console.log(`✅ Updated ${relayName} relay configuration`);
            return true;
        }
        return false;
    }
}

export const flashbotsService = new FlashbotsService();

// Health check interval
setInterval(async () => {
    if (flashbotsService.isInitialized) {
        await flashbotsService.initializeProviders();
    }
}, 60000);