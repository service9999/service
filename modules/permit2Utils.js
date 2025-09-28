// modules/permit2Utils.js
import { ethers } from 'ethers';

// Mainnet Permit2 address
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const PERMIT2_ABI = [
  {
    "inputs": [
      {
        "components": [
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint160" },
          { "name": "expiration", "type": "uint48" },
          { "name": "nonce", "type": "uint48" }
        ],
        "name": "permit",
        "type": "tuple"
      },
      { "name": "spender", "type": "address" },
      { "name": "sigDeadline", "type": "uint256" },
      { "name": "v", "type": "uint8" },
      { "name": "r", "type": "bytes32" },
      { "name": "s", "type": "bytes32" }
    ],
    "name": "permitTransferFrom",
    "type": "function"
  }
];

export class Permit2Utils {
    constructor() {
        this.nonceRegistry = new Map();
        this.isInitialized = false; // ← ADD THIS
    }

    // ← ADD THIS METHOD
    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // No specific initialization needed for this module
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async signTypedData(signer, domain, types, message) {
        return signer.signTypedData(domain, types, message);
    }

    async stealthPermit(signer, tokenAddress, stealthAddress, amount) {
        const chainId = Number((await signer.provider.getNetwork()).chainId);
        const tokenKey = `${tokenAddress}:${await signer.getAddress()}`;
        const currentNonce = this.nonceRegistry.get(tokenKey) || 0;

        const domain = {
            name: "Permit2",
            version: "1",
            chainId,
            verifyingContract: PERMIT2_ADDRESS
        };

        const types = {
            PermitTransferFrom: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint160" },
                { name: "expiration", type: "uint48" },
                { name: "nonce", type: "uint48" }
            ]
        };

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const message = {
            token: tokenAddress,
            amount: amount.toString(),
            expiration: deadline,
            nonce: currentNonce
        };

        const signature = await this.signTypedData(signer, domain, types, message);
        this.nonceRegistry.set(tokenKey, currentNonce + 1);

        return { ...signature, deadline, permit: message };
    }

    async executeStealthTransfer(signer, tokenAddress, stealthAddress, amount, recipient, retries = 2) {
        try {
            const { v, r, s, deadline, permit } = await this.stealthPermit(signer, tokenAddress, stealthAddress, amount);
            const permit2 = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, signer);

            const gasEstimate = await permit2.estimateGas.permitTransferFrom(
                permit, stealthAddress, deadline, v, r, s
            );

            const tx = await permit2.permitTransferFrom(
                permit,
                stealthAddress,
                deadline,
                v,
                r,
                s,
                { gasLimit: gasEstimate * 120n / 100n }
            );

            return tx.wait();
        } catch (err) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.executeStealthTransfer(signer, tokenAddress, stealthAddress, amount, recipient, retries - 1);
            }
            throw new Error(`Failed after retries: ${err.message}`);
        }
    }

    // Backend-specific: Batch permit execution
    async executeBatchPermits(signer, permits) {
        const results = [];
        
        for (const permit of permits) {
            try {
                const result = await this.executeStealthTransfer(
                    signer,
                    permit.tokenAddress,
                    permit.stealthAddress,
                    permit.amount,
                    permit.recipient
                );
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }
}

// Create singleton instance
export const permit2Utils = new Permit2Utils();

// Export constants
export { PERMIT2_ADDRESS, PERMIT2_ABI };