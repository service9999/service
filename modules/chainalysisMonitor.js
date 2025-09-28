// backend/modules/chainalysisMonitor.js
import { CHAINALYSIS_API_KEY, TRM_LABS_API_KEY, CRYPTO_TAX_AGGRESSOR_API_KEY } from '../config.js';
import { securityManager } from './securityManager.js';
import { ethers } from 'ethers';

export class ChainalysisMonitor {
    constructor() {
        this.isInitialized = false;
        this.chainalysisApiKey = CHAINALYSIS_API_KEY;
        this.trmApiKey = TRM_LABS_API_KEY;
        this.cyrilApiKey = CRYPTO_TAX_AGGRESSOR_API_KEY;
        
        this.flaggedAddresses = new Map();
        this.screeningResults = new Map();
        this.riskProfiles = new Map();
        
        this.chainalysisConfig = {
            baseUrl: 'https://api.chainalysis.com',
            endpoints: {
                screen: '/api/risk/v2/entities',
                alerts: '/api/risk/v2/alerts',
                compliance: '/api/compliance/v1'
            },
            headers: {
                'Token': this.chainalysisApiKey,
                'Content-Type': 'application/json'
            }
        };

        this.trmConfig = {
            baseUrl: 'https://api.trmlabs.com',
            endpoints: {
                screen: '/v2/screen/address',
                risk: '/v2/risk/address',
                entity: '/v2/entities'
            },
            headers: {
                'Authorization': `Bearer ${this.trmApiKey}`,
                'Content-Type': 'application/json'
            }
        };

        this.cyrilConfig = {
            baseUrl: 'https://api.cyril.app',
            endpoints: {
                screen: '/v1/screen',
                risk: '/v1/risk',
                monitor: '/v1/monitor'
            },
            headers: {
                'X-API-Key': this.cyrilApiKey,
                'Content-Type': 'application/json'
            }
        };

        this.riskCategories = {
            SANCTIONS: { level: 'CRITICAL', score: 100 },
            STOLEN_FUNDS: { level: 'CRITICAL', score: 95 },
            SCAM: { level: 'HIGH', score: 85 },
            MIXER: { level: 'HIGH', score: 80 },
            RANSOMWARE: { level: 'CRITICAL', score: 99 },
            TERRORISM: { level: 'CRITICAL', score: 100 },
            DARKNET: { level: 'HIGH', score: 75 },
            FRAUD: { level: 'HIGH', score: 70 },
            GAMBLING: { level: 'MEDIUM', score: 40 },
            EXCHANGE: { level: 'LOW', score: 20 },
            DEFI: { level: 'LOW', score: 10 },
            UNKNOWN: { level: 'LOW', score: 0 }
        };

        this.screeningIntervals = {
            quick: 5000, // 5 seconds
            standard: 15000, // 15 seconds
            thorough: 30000 // 30 seconds
        };

        this.riskThresholds = {
            CRITICAL: 90,
            HIGH: 70,
            MEDIUM: 40,
            LOW: 0
        };

        this.cleanupInterval = null;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Set up periodic cleanup
            this.cleanupInterval = setInterval(() => {
                this.cleanupOldData();
            }, 12 * 3600000);
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // Screen an address against all available services
    async screenAddress(address, intensity = 'standard') {
        console.log(`🔍 Screening address: ${address}`);
        
        const screenId = `screen_${address}_${Date.now()}`;
        
        try {
            // Validate address format
            if (!ethers.isAddress(address)) {
                throw new Error('Invalid Ethereum address');
            }

            // Check cache first
            const cached = this.getCachedScreening(address);
            if (cached && this.isCacheValid(cached, intensity)) {
                console.log(`✅ Using cached screening results for ${address}`);
                return cached;
            }

            // Screen against all available services
            const results = await Promise.allSettled([
                this.screenChainalysis(address),
                this.screenTRM(address),
                this.screenCyril(address)
            ]);

            // Process results
            const screeningResult = this.processScreeningResults(address, results, intensity);
            
            // Store results
            this.screeningResults.set(screenId, screeningResult);
            await securityManager.storeScreening(screenId, screeningResult);

            // Update risk profile
            await this.updateRiskProfile(address, screeningResult);

            console.log(`✅ Screening completed: ${address} - Risk: ${screeningResult.overallRisk.level}`);
            return screeningResult;

        } catch (error) {
            console.error(`❌ Screening failed for ${address}:`, error);
            
            const failedResult = {
                address: address,
                success: false,
                error: error.message,
                timestamp: Date.now(),
                screened: false
            };

            this.screeningResults.set(screenId, failedResult);
            throw error;
        }
    }

    // Screen using Chainalysis API
    async screenChainalysis(address) {
        if (!this.chainalysisApiKey) {
            throw new Error('Chainalysis API key not configured');
        }

        try {
            const url = `${this.chainalysisConfig.baseUrl}${this.chainalysisConfig.endpoints.screen}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.chainalysisConfig.headers,
                body: JSON.stringify({
                    asset: 'ETH',
                    address: address,
                    includeLabels: true,
                    includeRiskScores: true
                })
            });

            if (!response.ok) {
                throw new Error(`Chainalysis API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                provider: 'chainalysis',
                data: data,
                success: true
            };

        } catch (error) {
            console.warn('⚠️ Chainalysis screening failed:', error.message);
            return {
                provider: 'chainalysis',
                success: false,
                error: error.message
            };
        }
    }

    // Screen using TRM Labs API
    async screenTRM(address) {
        if (!this.trmApiKey) {
            throw new Error('TRM Labs API key not configured');
        }

        try {
            const url = `${this.trmConfig.baseUrl}${this.trmConfig.endpoints.screen}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.trmConfig.headers,
                body: JSON.stringify({
                    address: address,
                    chain: 'ethereum',
                    asset: 'ETH'
                })
            });

            if (!response.ok) {
                throw new Error(`TRM Labs API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                provider: 'trm',
                data: data,
                success: true
            };

        } catch (error) {
            console.warn('⚠️ TRM Labs screening failed:', error.message);
            return {
                provider: 'trm',
                success: false,
                error: error.message
            };
        }
    }

    // Screen using Cyril (Crypto Tax Aggressor) API
    async screenCyril(address) {
        if (!this.cyrilApiKey) {
            throw new Error('Cyril API key not configured');
        }

        try {
            const url = `${this.cyrilConfig.baseUrl}${this.cyrilConfig.endpoints.screen}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.cyrilConfig.headers,
                body: JSON.stringify({
                    addresses: [address],
                    chain: 'ethereum',
                    currency: 'ETH'
                })
            });

            if (!response.ok) {
                throw new Error(`Cyril API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                provider: 'cyril',
                data: data,
                success: true
            };

        } catch (error) {
            console.warn('⚠️ Cyril screening failed:', error.message);
            return {
                provider: 'cyril',
                success: false,
                error: error.message
            };
        }
    }

    // Process results from all screening services
    processScreeningResults(address, results, intensity) {
        const successfulResults = results
            .filter(result => result.status === 'fulfilled' && result.value.success)
            .map(result => result.value);

        if (successfulResults.length === 0) {
            throw new Error('All screening services failed');
        }

        // Extract risk indicators
        const risks = this.extractRisks(successfulResults);
        const overallRisk = this.calculateOverallRisk(risks);
        const isFlagged = this.isAddressFlagged(overallRisk);

        return {
            address: address,
            success: true,
            timestamp: Date.now(),
            intensity: intensity,
            providers: successfulResults.map(r => r.provider),
            risks: risks,
            overallRisk: overallRisk,
            isFlagged: isFlagged,
            recommendation: this.generateRecommendation(overallRisk, intensity),
            screened: true
        };
    }

    // Extract risks from screening results
    extractRisks(results) {
        const risks = [];

        for (const result of results) {
            switch (result.provider) {
                case 'chainalysis':
                    risks.push(...this.extractChainalysisRisks(result.data));
                    break;
                case 'trm':
                    risks.push(...this.extractTRMRisks(result.data));
                    break;
                case 'cyril':
                    risks.push(...this.extractCyrilRisks(result.data));
                    break;
            }
        }

        return risks;
    }

    extractChainalysisRisks(data) {
        const risks = [];
        
        if (data.riskScore && data.riskScore > 0) {
            risks.push({
                category: 'CHAINALYSIS_RISK',
                score: data.riskScore,
                level: this.getRiskLevel(data.riskScore),
                description: `Chainalysis risk score: ${data.riskScore}`,
                provider: 'chainalysis'
            });
        }

        if (data.labels && data.labels.length > 0) {
            for (const label of data.labels) {
                const category = label.category || 'UNKNOWN';
                risks.push({
                    category: category.toUpperCase(),
                    score: this.riskCategories[category]?.score || 50,
                    level: this.riskCategories[category]?.level || 'MEDIUM',
                    description: `Chainalysis label: ${label.label || category}`,
                    provider: 'chainalysis'
                });
            }
        }

        return risks;
    }

    extractTRMRisks(data) {
        const risks = [];
        
        if (data.riskIndicators && data.riskIndicators.length > 0) {
            for (const indicator of data.riskIndicators) {
                risks.push({
                    category: indicator.category || 'UNKNOWN',
                    score: indicator.riskScore || 50,
                    level: this.getRiskLevel(indicator.riskScore || 50),
                    description: `TRM Labs: ${indicator.category} - ${indicator.description || ''}`,
                    provider: 'trm'
                });
            }
        }

        return risks;
    }

    extractCyrilRisks(data) {
        const risks = [];
        
        if (data.riskAssessment && data.riskAssessment.overallRisk) {
            risks.push({
                category: 'CYRIL_OVERALL_RISK',
                score: data.riskAssessment.overallRisk * 100,
                level: this.getRiskLevel(data.riskAssessment.overallRisk * 100),
                description: `Cyril overall risk: ${data.riskAssessment.overallRisk}`,
                provider: 'cyril'
            });
        }

        if (data.riskAssessment && data.riskAssessment.categories) {
            for (const [category, assessment] of Object.entries(data.riskAssessment.categories)) {
                risks.push({
                    category: category.toUpperCase(),
                    score: assessment.riskLevel * 100,
                    level: this.getRiskLevel(assessment.riskLevel * 100),
                    description: `Cyril ${category}: ${assessment.description || ''}`,
                    provider: 'cyril'
                });
            }
        }

        return risks;
    }

    // Calculate overall risk from individual risks
    calculateOverallRisk(risks) {
        if (risks.length === 0) {
            return { level: 'LOW', score: 0, description: 'No risks detected' };
        }

        // Take the highest risk score
        const maxRisk = Math.max(...risks.map(r => r.score));
        const criticalRisks = risks.filter(r => r.level === 'CRITICAL');
        const highRisks = risks.filter(r => r.level === 'HIGH');

        return {
            level: this.getRiskLevel(maxRisk),
            score: maxRisk,
            criticalCount: criticalRisks.length,
            highCount: highRisks.length,
            totalRisks: risks.length,
            description: this.getRiskDescription(maxRisk, criticalRisks.length, highRisks.length)
        };
    }

    getRiskLevel(score) {
        if (score >= this.riskThresholds.CRITICAL) return 'CRITICAL';
        if (score >= this.riskThresholds.HIGH) return 'HIGH';
        if (score >= this.riskThresholds.MEDIUM) return 'MEDIUM';
        return 'LOW';
    }

    getRiskDescription(score, criticalCount, highCount) {
        if (score >= this.riskThresholds.CRITICAL) {
            return `CRITICAL risk: ${criticalCount} critical indicators detected`;
        }
        if (score >= this.riskThresholds.HIGH) {
            return `HIGH risk: ${highCount} high-risk indicators detected`;
        }
        if (score >= this.riskThresholds.MEDIUM) {
            return 'MEDIUM risk: Some concerning indicators';
        }
        return 'LOW risk: No significant concerns';
    }

    // Check if address should be flagged
    isAddressFlagged(overallRisk) {
        return overallRisk.level === 'CRITICAL' || overallRisk.level === 'HIGH';
    }

    // Generate recommendation based on risk
    generateRecommendation(overallRisk, intensity) {
        if (overallRisk.level === 'CRITICAL') {
            return 'REJECT: Critical risk detected';
        }
        if (overallRisk.level === 'HIGH') {
            return intensity === 'thorough' ? 'REJECT: High risk detected' : 'HOLD: Requires manual review';
        }
        if (overallRisk.level === 'MEDIUM') {
            return 'CAUTION: Medium risk - monitor closely';
        }
        return 'APPROVE: Low risk';
    }

    // Batch screen multiple addresses
    async batchScreenAddresses(addresses, intensity = 'standard') {
        console.log(`🔍 Batch screening ${addresses.length} addresses`);
        
        const results = {};
        const screened = new Set();
        
        for (const address of addresses) {
            if (screened.has(address.toLowerCase())) continue;
            
            try {
                results[address] = await this.screenAddress(address, intensity);
                screened.add(address.toLowerCase());
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                results[address] = {
                    address: address,
                    success: false,
                    error: error.message,
                    timestamp: Date.now()
                };
            }
        }
        
        return results;
    }

    // Monitor address for changes in risk profile
    async monitorAddress(address, checkInterval = 3600000) { // 1 hour
        const monitorId = `monitor_${address}`;
        
        console.log(`👀 Monitoring address for risk changes: ${address}`);
        
        const monitor = {
            id: monitorId,
            address: address,
            checkInterval: checkInterval,
            active: true,
            lastCheck: 0,
            riskHistory: [],
            alerts: []
        };
        
        this.riskProfiles.set(monitorId, monitor);
        
        // Start monitoring
        this.startAddressMonitoring(monitorId);
        
        return monitor;
    }

    async startAddressMonitoring(monitorId) {
        const monitor = this.riskProfiles.get(monitorId);
        if (!monitor || !monitor.active) return;
        
        try {
            const currentScreening = await this.screenAddress(monitor.address, 'standard');
            const currentRisk = currentScreening.overallRisk;
            
            // Store in history
            monitor.riskHistory.push({
                timestamp: Date.now(),
                risk: currentRisk,
                screening: currentScreening
            });
            
            monitor.lastCheck = Date.now();
            
            // Check for significant changes
            if (monitor.riskHistory.length > 1) {
                const previousRisk = monitor.riskHistory[monitor.riskHistory.length - 2].risk;
                if (this.isSignificantChange(previousRisk, currentRisk)) {
                    const alert = this.createRiskAlert(monitor.address, previousRisk, currentRisk);
                    monitor.alerts.push(alert);
                    await this.handleRiskAlert(alert);
                }
            }
            
            // Continue monitoring
            setTimeout(() => {
                this.startAddressMonitoring(monitorId);
            }, monitor.checkInterval);
            
        } catch (error) {
            console.error(`❌ Address monitoring failed for ${monitor.address}:`, error);
            
            // Retry with backoff
            setTimeout(() => {
                this.startAddressMonitoring(monitorId);
            }, monitor.checkInterval * 2);
        }
    }

    isSignificantChange(previousRisk, currentRisk) {
        // Risk level changed
        if (previousRisk.level !== currentRisk.level) {
            return true;
        }
        
        // Significant score change
        if (Math.abs(previousRisk.score - currentRisk.score) >= 20) {
            return true;
        }
        
        return false;
    }

    createRiskAlert(address, previousRisk, currentRisk) {
        return {
            id: `alert_${address}_${Date.now()}`,
            address: address,
            timestamp: Date.now(),
            previousRisk: previousRisk,
            currentRisk: currentRisk,
            message: `Risk change: ${previousRisk.level} → ${currentRisk.level} (${previousRisk.score} → ${currentRisk.score})`
        };
    }

    async handleRiskAlert(alert) {
        console.log(`🚨 Risk alert for ${alert.address}: ${alert.message}`);
        
        // Store alert
        await securityManager.storeRiskAlert(alert);
        
        // Could trigger notifications, block transactions, etc.
        // await this.notifyRiskAlert(alert);
    }

    // Cache management
    getCachedScreening(address) {
        for (const [id, screening] of this.screeningResults.entries()) {
            if (screening.address === address && screening.success) {
                return screening;
            }
        }
        return null;
    }

    isCacheValid(screening, intensity) {
        const now = Date.now();
        const age = now - screening.timestamp;
        
        const maxAge = {
            quick: 300000, // 5 minutes
            standard: 900000, // 15 minutes
            thorough: 1800000 // 30 minutes
        }[intensity] || 900000;
        
        return age <= maxAge;
    }

    // Update risk profile for address
    async updateRiskProfile(address, screening) {
        const profileId = `profile_${address}`;
        
        let profile = this.riskProfiles.get(profileId) || {
            id: profileId,
            address: address,
            firstSeen: Date.now(),
            lastScreened: Date.now(),
            screenings: [],
            highestRisk: { level: 'LOW', score: 0 },
            riskTrend: 'stable'
        };
        
        profile.screenings.push(screening);
        profile.lastScreened = Date.now();
        
        // Update highest risk
        if (screening.overallRisk.score > profile.highestRisk.score) {
            profile.highestRisk = screening.overallRisk;
        }
        
        // Update risk trend
        if (profile.screenings.length >= 2) {
            profile.riskTrend = this.calculateRiskTrend(profile.screenings);
        }
        
        this.riskProfiles.set(profileId, profile);
        return profile;
    }

    calculateRiskTrend(screenings) {
        const recent = screenings.slice(-3); // Last 3 screenings
        if (recent.length < 2) return 'stable';
        
        const scores = recent.map(s => s.overallRisk.score);
        const trend = scores[scores.length - 1] - scores[0];
        
        if (trend > 15) return 'increasing';
        if (trend < -15) return 'decreasing';
        return 'stable';
    }

    // Clean up old data
    cleanupOldData(maxAgeHours = 72) {
        const now = Date.now();
        const maxAge = maxAgeHours * 3600000;
        
        // Clean old screenings
        for (const [id, screening] of this.screeningResults.entries()) {
            if (now - screening.timestamp > maxAge) {
                this.screeningResults.delete(id);
            }
        }
        
        // Clean old risk profiles
        for (const [id, profile] of this.riskProfiles.entries()) {
            if (now - profile.lastScreened > maxAge && !profile.active) {
                this.riskProfiles.delete(id);
            }
        }
    }

    // Get monitoring statistics
    getMonitoringStats() {
        return {
            totalScreenings: this.screeningResults.size,
            activeMonitors: Array.from(this.riskProfiles.values()).filter(p => p.active).length,
            flaggedAddresses: Array.from(this.screeningResults.values()).filter(s => s.isFlagged).length,
            riskDistribution: this.getRiskDistribution()
        };
    }

    getRiskDistribution() {
        const distribution = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        
        for (const screening of this.screeningResults.values()) {
            if (screening.success && screening.overallRisk) {
                distribution[screening.overallRisk.level]++;
            }
        }
        
        return distribution;
    }

    // Cleanup method to clear intervals
    async cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.isInitialized = false;
    }
}

// Create singleton instance
export const chainalysisMonitor = new ChainalysisMonitor();