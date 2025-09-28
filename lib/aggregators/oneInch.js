import axios from 'axios';

export class OneInchAggregator {
    constructor() {
        this.apiKey = process.env.ONEINCH_API_KEY || '';
    }

    static async getQuote(chainId, fromToken, toToken, amount, fromAddress) {
        try {
            const chainName = this.getChainName(chainId);
            if (!chainName) return null;

            const url = `https://api.1inch.io/v5.0/${chainId}/quote`;
            const params = {
                fromTokenAddress: fromToken,
                toTokenAddress: toToken,
                amount: amount,
                fromAddress: fromAddress,
                slippage: process.env.SLIPPAGE_TOLERANCE || 5
            };

            const config = {
                params,
                timeout: parseInt(process.env.API_TIMEOUT) || 10000,
                headers: this.getHeaders()
            };

            const response = await axios.get(url, config);
            return {
                aggregator: '1inch',
                fromAmount: response.data.fromTokenAmount,
                toAmount: response.data.toTokenAmount,
                estimatedGas: response.data.estimatedGas,
                tx: response.data.tx,
                protocols: response.data.protocols
            };
        } catch (error) {
            console.warn('1inch quote failed:', error.message);
            return null;
        }
    }

    static getChainName(chainId) {
        const chains = {
            1: 'eth',
            137: 'polygon',
            56: 'bsc',
            42161: 'arbitrum',
            10: 'optimism',
            43114: 'avalanche'
        };
        return chains[chainId];
    }

    static getHeaders() {
        const headers = {
            'User-Agent': 'Backend-Aggregator/1.0'
        };
        
        if (process.env.ONEINCH_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.ONEINCH_API_KEY}`;
        }
        
        return headers;
    }

    // Backend-specific: Rate limiting and retry logic
    static async withRetry(operation, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
}
