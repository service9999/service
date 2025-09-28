import axios from 'axios';

export class ParaSwapAggregator {
    static async getQuote(chainId, fromToken, toToken, amount, fromAddress) {
        try {
            const baseURL = 'https://api.paraswap.io/v5';
            
            const response = await axios.get(`${baseURL}/prices`, {
                params: {
                    network: chainId,
                    srcToken: fromToken,
                    destToken: toToken,
                    amount: amount,
                    userAddress: fromAddress,
                    side: 'SELL',
                    excludeDEXs: ''
                },
                timeout: parseInt(process.env.API_TIMEOUT) || 10000,
                headers: this.getHeaders()
            });

            const priceRoute = response.data.priceRoute;
            
            // Get transaction data
            const txResponse = await axios.post(`${baseURL}/transactions/${chainId}`, {
                srcToken: fromToken,
                destToken: toToken,
                srcAmount: amount,
                destAmount: priceRoute.destAmount,
                priceRoute: priceRoute,
                userAddress: fromAddress,
                slippage: process.env.SLIPPAGE_TOLERANCE ? parseInt(process.env.SLIPPAGE_TOLERANCE) * 100 : 500 // 5% default
            }, {
                timeout: parseInt(process.env.API_TIMEOUT) || 10000,
                headers: this.getHeaders()
            });

            return {
                aggregator: 'paraswap',
                fromAmount: priceRoute.srcAmount,
                toAmount: priceRoute.destAmount,
                estimatedGas: priceRoute.gasCost,
                tx: txResponse.data,
                priceRoute: priceRoute
            };
        } catch (error) {
            console.warn('ParaSwap quote failed:', error.message);
            return null;
        }
    }

    static getHeaders() {
        const headers = {
            'User-Agent': 'Backend-Aggregator/1.0'
        };
        
        if (process.env.PARASWAP_API_KEY) {
            headers['X-API-KEY'] = process.env.PARASWAP_API_KEY;
        }
        
        return headers;
    }
}
