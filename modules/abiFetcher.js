// modules/abiFetcher.js
import axios from 'axios';

export class ABIFetcher {
    constructor() {
        this.EXPLORER_API_BASE = {
            1: "https://api.etherscan.io",
            56: "https://api.bscscan.com",
            137: "https://api.polygonscan.com",
            42161: "https://api.arbiscan.io",
            10: "https://api-optimistic.etherscan.io",
            43114: "https://api.snowtrace.io",
            8453: "https://api.basescan.org"
        };
        
        this.abiCache = new Map();
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('📦 Initializing ABI Fetcher...');
            // Check if we have at least one API key
            if (!process.env.ETHERSCAN_API_KEY && !process.env.BSCSCAN_API_KEY) {
                console.warn('⚠️ No explorer API keys found - ABI fetching may be limited');
            }
            this.isInitialized = true;
            console.log('✅ ABI Fetcher initialized');
            return true;
        } catch (error) {
            console.error('❌ ABI Fetcher initialization failed:', error);
            return false;
        }
    }

    async fetchEvmAbi(tokenAddress, chainId) {
        try {
            const apiKey = process.env[`${this.getChainName(chainId).toUpperCase()}_API_KEY`] || 
                           process.env.ETHERSCAN_API_KEY;
            
            if (!apiKey) {
                throw new Error('No API key configured for explorer');
            }

            const baseUrl = this.EXPLORER_API_BASE[chainId];
            const url = `${baseUrl}/api`;
            
            const params = {
                module: 'contract',
                action: 'getabi',
                address: tokenAddress,
                apikey: apiKey
            };

            const response = await axios.get(url, {
                params,
                timeout: parseInt(process.env.API_TIMEOUT) || 10000
            });

            if (response.data.status !== '1') {
                throw new Error(response.data.result || 'ABI fetch failed');
            }

            return JSON.parse(response.data.result);
        } catch (err) {
            console.error(`❌ ABI fetch error for ${tokenAddress}: ${err.message}`);
            return null;
        }
    }

    getChainName(chainId) {
        const chains = {
            1: 'etherscan',
            56: 'bscscan',
            137: 'polygonscan',
            42161: 'arbiscan',
            10: 'optimistic',
            43114: 'snowtrace',
            8453: 'basescan'
        };
        return chains[chainId] || 'etherscan';
    }

    async getCachedAbi(tokenAddress, chainId) {
        const cacheKey = `${chainId}:${tokenAddress.toLowerCase()}`;
        
        if (this.abiCache.has(cacheKey)) {
            return this.abiCache.get(cacheKey);
        }

        const abi = await this.fetchEvmAbi(tokenAddress, chainId);
        if (abi) {
            this.abiCache.set(cacheKey, abi);
            // Cache for 1 hour
            setTimeout(() => this.abiCache.delete(cacheKey), 60 * 60 * 1000);
        }
        
        return abi;
    }
}

// Create singleton instance
export const abiFetcher = new ABIFetcher();