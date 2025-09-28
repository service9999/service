// lib/multiSigManager.js
import { ethers } from 'ethers';

export class MultiSigManager {
    constructor() {
        // Use backend environment variables, not VITE_ prefixed ones
        this.signers = process.env.MULTISIG_SIGNERS 
            ? process.env.MULTISIG_SIGNERS.split(',') 
            : [];
        
        this.requiredSignatures = parseInt(process.env.MULTISIG_THRESHOLD) || 2;
        this.pendingApprovals = new Map();
    }

    // Create approval request for an operation
    createApprovalRequest(operationId, operationData) {
        const request = {
            id: operationId,
            data: operationData,
            signatures: [],
            createdAt: Date.now(),
            status: 'pending'
        };
        
        this.pendingApprovals.set(operationId, request);
        return request;
    }

    // Add signature to approval request
    addSignature(operationId, signerAddress, signature) {
        const request = this.pendingApprovals.get(operationId);
        if (!request) {
            throw new Error('Approval request not found');
        }

        // Verify signer is authorized
        if (!this.signers.includes(signerAddress)) {
            throw new Error('Signer not authorized');
        }

        // Verify signature hasn't been added already
        if (request.signatures.some(sig => sig.signer === signerAddress)) {
            throw new Error('Already signed by this address');
        }

        // Verify signature validity
        this.verifySignature(operationId, signerAddress, signature);

        request.signatures.push({
            signer: signerAddress,
            signature: signature,
            timestamp: Date.now()
        });

        // Check if we have enough signatures
        if (request.signatures.length >= this.requiredSignatures) {
            request.status = 'approved';
            return { approved: true, request };
        }

        return { approved: false, request };
    }

    // Verify signature validity
    verifySignature(operationId, signerAddress, signature) {
        const message = this.getMessageForOperation(operationId);
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
            throw new Error('Invalid signature');
        }
        
        return true;
    }

    getMessageForOperation(operationId) {
        return `Approve operation: ${operationId}\nTimestamp: ${Date.now()}`;
    }

    // Check if operation is approved
    isOperationApproved(operationId) {
        const request = this.pendingApprovals.get(operationId);
        return request && request.status === 'approved';
    }

    // Get pending requests
    getPendingRequests() {
        return Array.from(this.pendingApprovals.values())
            .filter(req => req.status === 'pending');
    }

    // Clean up old requests (24h old)
    cleanupOldRequests() {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        for (const [id, request] of this.pendingApprovals.entries()) {
            if (now - request.createdAt > twentyFourHours) {
                this.pendingApprovals.delete(id);
            }
        }
    }
}

export default new MultiSigManager();
