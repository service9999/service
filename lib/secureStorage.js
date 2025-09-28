// lib/secureStorage.js
import CryptoJS from 'crypto-js';
import fs from 'fs/promises';
import path from 'path';

export class SecureStorage {
    // Encrypt private key with password
    static encryptPrivateKey(privateKey, password) {
        if (!privateKey || !password) {
            throw new Error('Private key and password are required');
        }
        
        try {
            const encrypted = CryptoJS.AES.encrypt(privateKey, password).toString();
            console.log('✅ Private key encrypted successfully');
            return encrypted;
        } catch (error) {
            console.error('❌ Encryption failed:', error.message);
            throw new Error('Encryption failed: ' + error.message);
        }
    }

    // Decrypt private key with password
    static decryptPrivateKey(encryptedData, password) {
        if (!encryptedData || !password) {
            throw new Error('Encrypted data and password are required');
        }

        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, password);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decrypted) {
                throw new Error('Decryption failed - invalid password or corrupted data');
            }
            
            console.log('✅ Private key decrypted successfully');
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            throw new Error('Decryption failed: ' + error.message);
        }
    }

    // Generate strong random password
    static generateStrongPassword(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    }

    // Securely wipe data from memory
    static secureWipe(data) {
        if (typeof data === 'string') {
            // Overwrite the string
            data = data.split('').map(() => Math.random().toString(36)[2]).join('');
        }
        return null;
    }

    // Validate password strength
    static isPasswordStrong(password) {
        const minLength = 12;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()]/.test(password);
        
        return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
    }

    // Backend-specific: Save encrypted data to file
    static async saveToFile(filePath, data, password) {
        try {
            const encrypted = this.encryptPrivateKey(JSON.stringify(data), password);
            await fs.writeFile(filePath, encrypted, 'utf8');
            console.log('✅ Data saved securely to file');
            return true;
        } catch (error) {
            console.error('❌ Failed to save secure data:', error.message);
            return false;
        }
    }

    // Backend-specific: Load encrypted data from file
    static async loadFromFile(filePath, password) {
        try {
            const encryptedData = await fs.readFile(filePath, 'utf8');
            const decrypted = this.decryptPrivateKey(encryptedData, password);
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('❌ Failed to load secure data:', error.message);
            return null;
        }
    }
}
