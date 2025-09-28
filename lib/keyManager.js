// lib/keyManager.js
import { SecureStorage } from './secureStorage.js';
import { Persistence } from './persistence.js';

export class KeyManager {
    constructor() {
        this.encryptedKeys = new Map();
        this.masterPassword = null;
        this.isInitialized = false;
        this.persistenceFile = './.encrypted-keys.json';
    }

    // Initialize with master password
    async initialize(masterPassword, forceReencrypt = false) {
        if (!masterPassword) {
            throw new Error('Master password is required');
        }

        if (!SecureStorage.isPasswordStrong(masterPassword)) {
            throw new Error('Password must be at least 12 characters with uppercase, lowercase, number, and special character');
        }

        this.masterPassword = masterPassword;
        this.isInitialized = true;

        console.log('🔐 Key Manager initialized');

        // Load persisted keys if they exist
        try {
            const persistedKeys = Persistence.loadKeys(this.persistenceFile);
            if (persistedKeys.size > 0) {
                this.encryptedKeys = persistedKeys;
                console.log(`✅ Loaded ${persistedKeys.size} persisted keys`);
            }
        } catch (error) {
            console.log('ℹ️ No persisted keys found or error loading:', error.message);
        }

        return true;
    }

    // Add a new private key
    async addPrivateKey(privateKey, keyName = 'default', customPassword = null) {
        if (!this.isInitialized) {
            throw new Error('KeyManager not initialized. Call initialize() first.');
        }

        if (!privateKey || !keyName) {
            throw new Error('Private key and key name are required');
        }

        const password = customPassword || this.masterPassword;
        const encrypted = SecureStorage.encryptPrivateKey(privateKey, password);
        
        this.encryptedKeys.set(keyName, encrypted);
        console.log(`✅ Added encrypted key: ${keyName}`);
        
        // Persist after adding
        await this.persistKeys();
        
        return true;
    }

    // Get decrypted private key
    getPrivateKey(keyName = 'drainer', customPassword = null) {
        if (!this.isInitialized) {
            throw new Error('KeyManager not initialized. Call initialize() first.');
        }

        const encrypted = this.encryptedKeys.get(keyName);
        if (!encrypted) {
            throw new Error(`Key not found: ${keyName}`);
        }

        const password = customPassword || this.masterPassword;
        return SecureStorage.decryptPrivateKey(encrypted, password);
    }

    // Check if key exists
    hasKey(keyName) {
        return this.encryptedKeys.has(keyName);
    }

    // Remove a key
    async removeKey(keyName) {
        if (this.encryptedKeys.has(keyName)) {
            this.encryptedKeys.delete(keyName);
            console.log(`✅ Removed key: ${keyName}`);
            
            // Persist after removal
            await this.persistKeys();
            return true;
        }
        return false;
    }

    // Get all key names
    listKeys() {
        return Array.from(this.encryptedKeys.keys());
    }

    // Clear all keys and reset
    async clearAll() {
        this.encryptedKeys.clear();
        this.masterPassword = SecureStorage.secureWipe(this.masterPassword);
        this.isInitialized = false;
        
        // Clear persistence - Use the Persistence module's method instead of direct fs access
        // The Persistence module should handle browser vs. node environment internally
        try {
            Persistence.clearStorage(this.persistenceFile); // Assuming you add this method
            // Alternatively, if clearStorage doesn't exist, just call saveKeys with an empty map
            // Persistence.saveKeys(new Map(), this.persistenceFile);
        } catch (error) {
            console.log('ℹ️ Could not clear persistence:', error.message);
        }
        
        console.log('✅ All keys cleared and memory wiped');
    }

    // Persist keys to file
    async persistKeys() {
        try {
            Persistence.saveKeys(this.encryptedKeys, this.persistenceFile);
            console.log('💾 Keys persisted to secure storage');
        } catch (error) {
            console.error('❌ Failed to persist keys:', error.message);
        }
    }

    // Backup keys to encrypted file
    async backupKeys(backupPassword, filename = 'keys-backup.enc') {
        if (!this.isInitialized) {
            throw new Error('KeyManager not initialized');
        }

        const backupData = {
            keys: Object.fromEntries(this.encryptedKeys),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        const encryptedBackup = SecureStorage.encryptPrivateKey(
            JSON.stringify(backupData),
            backupPassword
        );

        console.log('✅ Backup created. Store this securely:');
        console.log(encryptedBackup);
        
        return encryptedBackup;
    }

    // Restore keys from backup
    async restoreKeys(encryptedBackup, backupPassword) {
        try {
            const decrypted = SecureStorage.decryptPrivateKey(encryptedBackup, backupPassword);
            const backupData = JSON.parse(decrypted);
            
            this.encryptedKeys = new Map(Object.entries(backupData.keys));
            console.log('✅ Keys restored from backup');
            
            // Persist the restored keys
            await this.persistKeys();
            
            return true;
        } catch (error) {
            throw new Error('Restore failed: ' + error.message);
        }
    }

    // Get key info (for debugging)
    getKeyInfo() {
        return {
            totalKeys: this.encryptedKeys.size,
            keyNames: this.listKeys(),
            isInitialized: this.isInitialized,
            hasMasterPassword: !!this.masterPassword
        };
    }
}

// Singleton instance
export const keyManager = new KeyManager();
