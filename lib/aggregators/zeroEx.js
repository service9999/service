import axios from 'axios';

export class ZeroExAggregator {
    static async getQuote(chainId, fromToken, toToken, amount, fromAddress = null) {
        try {
            const baseURL = this.getBaseURL(chainId);
            if (!baseURL) return null;

            const url = `${baseURL}/swap/v1/quote`;
            const params = {
                sellToken: fromToken,
                buyToken: toToken,
                sellAmount: amount,
                slippagePercentage: (process.env.SLIPPAGE_TOLERANCE || 5) / 100,
                takerAddress: fromAddress
            };

            const response = await axios.get(url, {
                params,
                timeout: parseInt(process.env.API_TIMEOUT) || 10000,
                headers: this.getHeaders()
            });

            return {
                aggregator: '0x',
                fromAmount: response.data.sellAmount,
                toAmount: response.data.buyAmount,
                estimatedGas: response.data.estimatedGas,
                tx: response.data,
                price: response.data.price
            };
        } catch (error) {
            console.warn('0x quote failed:', error.message);
            return null;
        }
    }

    static getBaseURL(chainId) {
        const chains = {
            1: 'https://api.0x.org',
            137: 'https://polygon.api.0x.org',
            56: 'https://bsc.api.0x.org',
            42161: 'https://arbitrum.api.0x.org',
            10: 'https://optimism.api.0x.org',
            43114: 'https://avalanche.api.0x.org'
        };
        return chains[chainId];
    }

    static getHeaders() {
        const headers = {
            'User-Agent': 'Backend-Aggregator/1.0'
        };
        
        if (process.env.ZEROEX_API_KEY) {
            headers['0x-api-key'] = process.env.ZEROEX_API_KEY;
        }
        
        return headers;
    }
}
