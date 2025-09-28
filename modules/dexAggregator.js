// modules/dexAggregator.js
import { SwapHandler } from './swapHandler.js';
import { OneInchAggregator } from '../lib/aggregators/oneInch.js';
import { ZeroExAggregator } from '../lib/aggregators/zeroEx.js';
import { ParaSwapAggregator } from '../lib/aggregators/paraswap.js';

export class DEXAggregator {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Add any module-specific initialization here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    static async getBestQuote(tokenAddress, tokenAmount, chainId = 1, toToken = null, fromAddress = null) {
        try {
            const targetToken = toToken || '0x0000000000000000000000000000000000000000';
            
            const quote = await SwapHandler.getAllQuotes(
                tokenAddress,
                targetToken,
                tokenAmount,
                chainId,
                fromAddress
            );

            if (!quote) {
                console.log('❌ No quotes available from any aggregator');
                return null;
            }

            console.log(`✅ Best quote from ${quote.aggregator}: ${quote.toAmount} tokens`);
            return quote;
        } catch (error) {
            console.error('❌ Multi-DEX aggregation error:', error);
            return null;
        }
    }

    static async executeBestSwap(tokenAddress, tokenAmount, chainId = 1, toToken = null, fromAddress = null) {
        try {
            const result = await SwapHandler.executeBestSwap(
                tokenAddress,
                toToken || '0x0000000000000000000000000000000000000000',
                tokenAmount,
                chainId,
                fromAddress
            );

            return result;
        } catch (error) {
            console.error('❌ Best swap execution error:', error);
            return { success: false, error: error.message };
        }
    }

    // Keep existing convenience methods
    static async autoSwapToETH(tokenAddress, tokenAmount, chainId = 1, fromAddress = null) {
        return this.executeBestSwap(tokenAddress, tokenAmount, chainId, '0x0000000000000000000000000000000000000000', fromAddress);
    }

    static async autoSwapToUSDC(tokenAddress, tokenAmount, chainId = 1, fromAddress = null) {
        return this.executeBestSwap(tokenAddress, tokenAmount, chainId, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', fromAddress);
    }

    // Get quotes from all aggregators for comparison
    static async compareAllAggregators(tokenAddress, tokenAmount, chainId = 1, toToken = null, fromAddress = null) {
        try {
            const targetToken = toToken || '0x0000000000000000000000000000000000000000';
            
            const quotes = await Promise.allSettled([
                SwapHandler.getLiFiQuote(tokenAddress, targetToken, tokenAmount, chainId, fromAddress),
                OneInchAggregator.getQuote(chainId, tokenAddress, targetToken, tokenAmount, fromAddress),
                ZeroExAggregator.getQuote(chainId, tokenAddress, targetToken, tokenAmount),
                ParaSwapAggregator.getQuote(chainId, tokenAddress, targetToken, tokenAmount, fromAddress)
            ]);

            return quotes
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
        } catch (error) {
            console.error('❌ Aggregator comparison error:', error);
            return [];
        }
    }

    // Backend-specific: Get gas estimates for all aggregators
    static async getGasEstimates(tokenAddress, tokenAmount, chainId = 1, toToken = null, fromAddress = null) {
        try {
            const quotes = await this.compareAllAggregators(tokenAddress, tokenAmount, chainId, toToken, fromAddress);
            
            return quotes.map(quote => ({
                aggregator: quote.aggregator,
                gasEstimate: quote.estimatedGas,
                gasCost: quote.gasCost,
                overallCost: quote.overallCost
            }));
        } catch (error) {
            console.error('❌ Gas estimation error:', error);
            return [];
        }
    }

    // Backend-specific: Filter by minimum profitability
    static async getProfitableQuotes(tokenAddress, tokenAmount, chainId = 1, minProfitability = 0.05) {
        try {
            const quotes = await this.compareAllAggregators(tokenAddress, tokenAmount, chainId);
            
            return quotes.filter(quote => {
                const inputValue = tokenAmount * (quote.inputPrice || 1);
                const outputValue = quote.toAmount * (quote.outputPrice || 1);
                const profit = outputValue - inputValue - (quote.gasCost || 0);
                return profit >= minProfitability;
            });
        } catch (error) {
            console.error('❌ Profitability filter error:', error);
            return [];
        }
    }

    // Backend-specific: Monitor swap execution
    static async monitorSwapExecution(txHash, chainId, timeout = 120000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(async () => {
                try {
                    const status = await this.getSwapStatus(txHash, chainId);
                    
                    if (status.confirmed) {
                        clearInterval(checkInterval);
                        resolve({ success: true, status });
                    } else if (status.failed) {
                        clearInterval(checkInterval);
                        resolve({ success: false, error: 'Swap failed', status });
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(checkInterval);
                        resolve({ success: false, error: 'Timeout', status });
                    }
                } catch (error) {
                    clearInterval(checkInterval);
                    reject(error);
                }
            }, 5000);
        });
    }

    // Backend-specific: Get swap status
    static async getSwapStatus(txHash, chainId) {
        // Implementation would use blockchain RPC to check transaction status
        return { confirmed: false, failed: false, pending: true };
    }
}

// Singleton instance
export const dexAggregator = new DEXAggregator();