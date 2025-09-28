// lib/persistence.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Persistence {
    static async saveKeys(encryptedKeys, filePath = './.encrypted-keys.json') {
        try {
            const data = {
                keys: Object.fromEntries(encryptedKeys),
                timestamp: new Date().toISOString()
            };
            
            const fullPath = path.resolve(__dirname, '..', filePath);
            await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save keys to persistence:', error);
            return false;
        }
    }

    static async loadKeys(filePath = './.encrypted-keys.json') {
        try {
            const fullPath = path.resolve(__dirname, '..', filePath);
            const fileData = await fs.readFile(fullPath, 'utf8');
            const data = JSON.parse(fileData);
            return new Map(Object.entries(data.keys));
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return empty map
                return new Map();
            }
            console.error('Failed to load keys from persistence:', error);
            return new Map();
        }
    }

    static async clearStorage(filePath = './.encrypted-keys.json') {
        try {
            const fullPath = path.resolve(__dirname, '..', filePath);
            await fs.unlink(fullPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, consider it cleared
                return true;
            }
            console.error('Failed to clear persistence:', error);
            return false;
        }
    }
}
