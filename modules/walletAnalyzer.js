// modules/walletAnalyzer.js
import { ethers } from "ethers";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY || '';

export class WalletAnalyzer {
    constructor() {
        this.isInitialized = false;
        // You can initialize any properties here if needed
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Check if Covalent API key is available
            if (!COVALENT_API_KEY) {
                console.warn('⚠️ COVALENT_API_KEY not configured. Some features may be limited.');
            }
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async analyzeWalletOnChain(provider, userAddress, chainId, chainName) {
        let ethBalance = "0";
        let erc20 = [];
        let nfts = [];
        
        try {
            // Get native balance
            ethBalance = (await provider.getBalance(userAddress)).toString();
            console.log(`✅ ${chainName} native balance: ${ethers.formatEther(ethBalance)}`);
        } catch (err) {
            console.log(`❌ Failed to fetch native balance on ${chainName}: ${err.message}`);
        }
        
        try {
            // Get ERC20 tokens using Covalent API
            if (COVALENT_API_KEY) {
                const chainMap = {
                    '1': 'eth',
                    '56': 'bsc',
                    '137': 'matic',
                    '42161': 'arbitrum',
                    '10': 'optimism',
                    '43114': 'avalanche',
                    '8453': 'base',
                    '324': 'zksync',
                    '250': 'fantom',
                    '42220': 'celo',
                    '1284': 'moonbeam',
                    '1285': 'moonriver'
                };
                
                const covalentChain = chainMap[chainId] || 'eth';
                const erc20Url = `https://api.covalenthq.com/v1/${covalentChain}/address/${userAddress}/balances_v2/?key=${COVALENT_API_KEY}`;
                
                const res = await fetch(erc20Url);
                const data = await res.json();
                
                if (data.data && data.data.items) {
                    erc20 = data.data.items.filter(t => {
                        if (t.type !== "cryptocurrency" || !t.balance || BigInt(t.balance) === 0n) return false;
                        
                        // Filter out dust (less than $1 in value)
                        const price = t.quote_rate || 0;
                        const decimals = t.contract_decimals || 18;
                        const value = (Number(t.balance) / Math.pow(10, decimals)) * price;
                        return value >= 1;
                    });
                    
                    console.log(`✅ ${chainName} ERC20 tokens: ${erc20.length}`);
                }
            }
        } catch (err) {
            console.log(`❌ Failed to fetch ERC-20s on ${chainName}: ${err.message}`);
        }
        
        try {
            // Get NFTs using Covalent API
            if (COVALENT_API_KEY) {
                const chainMap = {
                    '1': 'eth',
                    '56': 'bsc', 
                    '137': 'matic',
                    '42161': 'arbitrum',
                    '10': 'optimism',
                    '43114': 'avalanche',
                    '8453': 'base',
                    '324': 'zksync',
                    '250': 'fantom',
                    '42220': 'celo',
                    '1284': 'moonbeam',
                    '1285': 'moonriver'
                };
                
                const covalentChain = chainMap[chainId] || 'eth';
                const nftUrl = `https://api.covalenthq.com/v1/${covalentChain}/address/${userAddress}/balances_nft/?key=${COVALENT_API_KEY}`;
                
                const res = await fetch(nftUrl);
                const data = await res.json();
                
                if (data.data && data.data.items) {
                    nfts = data.data.items.filter(n => n.nft_data && n.nft_data.length > 0);
                    console.log(`✅ ${chainName} NFTs: ${nfts.length}`);
                }
            }
        } catch (err) {
            console.log(`❌ Failed to fetch NFTs on ${chainName}: ${err.message}`);
        }
        
        return {
            eth: ethBalance,
            erc20,
            nfts,
            chainId,
            chainName
        };
    }

    getSupportedChains() {
        return {
            "1": { name: "ethereum", priority: 1 },
            "56": { name: "bsc", priority: 2 },
            "137": { name: "polygon", priority: 2 },
            "42161": { name: "arbitrum", priority: 1 },
            "10": { name: "optimism", priority: 2 },
            "43114": { name: "avalanche", priority: 2 },
            "8453": { name: "base", priority: 1 },
            "324": { name: "zksync", priority: 3 },
            "250": { name: "fantom", priority: 3 },
            "42220": { name: "celo", priority: 3 },
            "1284": { name: "moonbeam", priority: 3 },
            "1285": { name: "moonriver", priority: 3 }
        };
    }
}

// Create singleton instance
export const walletAnalyzer = new WalletAnalyzer();

// Keep the standalone functions for backward compatibility
export async function analyzeWalletOnChain(provider, userAddress, chainId, chainName) {
    return walletAnalyzer.analyzeWalletOnChain(provider, userAddress, chainId, chainName);
}

export function getSupportedChains() {
    return walletAnalyzer.getSupportedChains();
}