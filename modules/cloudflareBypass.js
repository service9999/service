// backend/modules/cloudflareBypass.js
import { CLOUDFLARE_BYPASS_API_KEY } from '../config.js';
import { securityManager } from './securityManager.js';
import { fingerprintSpoofer } from './fingerprintSpoofer.js';

export class CloudflareBypass {
    constructor() {
        this.apiKey = CLOUDFLARE_BYPASS_API_KEY;
        this.activeChallenges = new Map();
        this.captchaServices = {
            'anti-captcha': {
                url: 'https://api.anti-captcha.com',
                endpoints: {
                    createTask: '/createTask',
                    getResult: '/getTaskResult'
                }
            },
            '2captcha': {
                url: 'https://2captcha.com',
                endpoints: {
                    createTask: '/in.php',
                    getResult: '/res.php'
                }
            },
            'capmonster': {
                url: 'https://api.capmonster.cloud',
                endpoints: {
                    createTask: '/createTask',
                    getResult: '/getTaskResult'
                }
            }
        };

        this.cloudflareIndicators = {
            challenge: [
                'cf-chl-bypass',
                'cf_clearance',
                'challenge-form',
                'ray-id',
                'cf-request-id',
                'attention required!',
                'checking your browser'
            ],
            captcha: [
                'captcha',
                'recaptcha',
                'hcaptcha',
                'turnstile',
                'cloudflare challenge'
            ],
            firewall: [
                'access denied',
                'firewall',
                'security check',
                'blocked',
                'forbidden'
            ]
        };

        this.bypassTechniques = {
            'cookie-reuse': {
                name: 'Cookie Reuse',
                successRate: 85,
                complexity: 'low'
            },
            'header-rotation': {
                name: 'Header Rotation',
                successRate: 75,
                complexity: 'medium'
            },
            'ip-rotation': {
                name: 'IP Rotation',
                successRate: 90,
                complexity: 'high'
            },
            'session-rotation': {
                name: 'Session Rotation',
                successRate: 80,
                complexity: 'medium'
            },
            'fingerprint-spoofing': {
                name: 'Fingerprint Spoofing',
                successRate: 95,
                complexity: 'high'
            }
        };
        
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('🛡️ Initializing Cloudflare Bypass...');
            
            // Check if API key is configured
            if (!this.apiKey) {
                console.warn('⚠️ Cloudflare bypass API key not configured - some features disabled');
            }
            
            // Initialize dependencies if available
            if (fingerprintSpoofer && fingerprintSpoofer.initialize) {
                await fingerprintSpoofer.initialize();
            }
            
            if (securityManager && securityManager.initialize) {
                await securityManager.initialize();
            }
            
            this.isInitialized = true;
            console.log('✅ Cloudflare Bypass initialized');
            return true;
        } catch (error) {
            console.error('❌ Cloudflare Bypass initialization failed:', error);
            return false;
        }
    }

    // Detect Cloudflare protection
    async detectCloudflare(url, htmlContent, headers = {}) {
        console.log(`🛡️ Detecting Cloudflare protection for: ${url}`);
        
        const detection = {
            protected: false,
            protectionType: 'none',
            confidence: 0,
            indicators: [],
            challengePresent: false
        };

        // Check headers for Cloudflare indicators
        const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
        for (const indicator of this.cloudflareIndicators.challenge) {
            if (headerKeys.some(k => k.includes(indicator)) || 
                Object.values(headers).some(v => v && v.toString().includes(indicator))) {
                detection.protected = true;
                detection.protectionType = 'challenge';
                detection.confidence += 30;
                detection.indicators.push(`Header: ${indicator}`);
            }
        }

        // Check HTML content for Cloudflare indicators
        const contentLower = htmlContent.toLowerCase();
        for (const indicator of this.cloudflareIndicators.challenge) {
            if (contentLower.includes(indicator)) {
                detection.protected = true;
                detection.protectionType = 'challenge';
                detection.confidence += 25;
                detection.indicators.push(`Content: ${indicator}`);
            }
        }

        // Check for CAPTCHA
        for (const indicator of this.cloudflareIndicators.captcha) {
            if (contentLower.includes(indicator)) {
                detection.protected = true;
                detection.protectionType = 'captcha';
                detection.confidence += 40;
                detection.indicators.push(`CAPTCHA: ${indicator}`);
                detection.challengePresent = true;
            }
        }

        // Check for firewall
        for (const indicator of this.cloudflareIndicators.firewall) {
            if (contentLower.includes(indicator)) {
                detection.protected = true;
                detection.protectionType = 'firewall';
                detection.confidence += 50;
                detection.indicators.push(`Firewall: ${indicator}`);
            }
        }

        // Normalize confidence
        detection.confidence = Math.min(100, detection.confidence);

        console.log(`🔍 Cloudflare detection: ${detection.protected ? 'PROTECTED' : 'CLEAR'} (${detection.protectionType})`);
        return detection;
    }

    // Solve CAPTCHA challenge
    async solveCaptcha(captchaType, siteKey, pageUrl, enterprise = false) {
        console.log(`🧩 Solving ${captchaType} CAPTCHA for: ${pageUrl}`);
        
        if (!this.apiKey) {
            throw new Error('CAPTCHA solving API key not configured');
        }

        const taskId = `captcha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            let solution;
            switch (captchaType.toLowerCase()) {
                case 'recaptcha':
                case 'recaptchav2':
                    solution = await this.solveRecaptchaV2(siteKey, pageUrl);
                    break;
                case 'recaptchav3':
                    solution = await this.solveRecaptchaV3(siteKey, pageUrl);
                    break;
                case 'hcaptcha':
                    solution = await this.solveHCaptcha(siteKey, pageUrl);
                    break;
                case 'turnstile':
                    solution = await this.solveTurnstile(siteKey, pageUrl);
                    break;
                default:
                    throw new Error(`Unsupported CAPTCHA type: ${captchaType}`);
            }

            const result = {
                taskId: taskId,
                type: captchaType,
                siteKey: siteKey,
                pageUrl: pageUrl,
                solution: solution,
                solvedAt: Date.now(),
                success: true,
                provider: this.selectBestProvider()
            };

            this.activeChallenges.set(taskId, result);
            await securityManager.storeChallenge(taskId, result);

            console.log(`✅ CAPTCHA solved successfully: ${taskId}`);
            return result;

        } catch (error) {
            console.error(`❌ CAPTCHA solving failed: ${error.message}`);
            
            const failedResult = {
                taskId: taskId,
                type: captchaType,
                siteKey: siteKey,
                pageUrl: pageUrl,
                solvedAt: Date.now(),
                success: false,
                error: error.message
            };

            this.activeChallenges.set(taskId, failedResult);
            throw error;
        }
    }

    // Solve reCAPTCHA v2
    async solveRecaptchaV2(siteKey, pageUrl) {
        const provider = this.selectBestProvider();
        const service = this.captchaServices[provider];
        
        const taskData = {
            clientKey: this.apiKey,
            task: {
                type: 'RecaptchaV2TaskProxyless',
                websiteURL: pageUrl,
                websiteKey: siteKey,
                isInvisible: false
            }
        };

        const response = await fetch(`${service.url}${service.endpoints.createTask}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        
        if (result.errorId > 0) {
            throw new Error(result.errorDescription || `CAPTCHA solving error: ${result.errorId}`);
        }

        return await this.waitForSolution(provider, result.taskId);
    }

    // Solve reCAPTCHA v3
    async solveRecaptchaV3(siteKey, pageUrl, minScore = 0.7) {
        const provider = this.selectBestProvider();
        const service = this.captchaServices[provider];
        
        const taskData = {
            clientKey: this.apiKey,
            task: {
                type: 'RecaptchaV3TaskProxyless',
                websiteURL: pageUrl,
                websiteKey: siteKey,
                minScore: minScore,
                pageAction: 'submit'
            }
        };

        const response = await fetch(`${service.url}${service.endpoints.createTask}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        
        if (result.errorId > 0) {
            throw new Error(result.errorDescription || `CAPTCHA solving error: ${result.errorId}`);
        }

        return await this.waitForSolution(provider, result.taskId);
    }

    // Solve hCaptcha
    async solveHCaptcha(siteKey, pageUrl) {
        const provider = this.selectBestProvider();
        const service = this.captchaServices[provider];
        
        const taskData = {
            clientKey: this.apiKey,
            task: {
                type: 'HCaptchaTaskProxyless',
                websiteURL: pageUrl,
                websiteKey: siteKey
            }
        };

        const response = await fetch(`${service.url}${service.endpoints.createTask}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        
        if (result.errorId > 0) {
            throw new Error(result.errorDescription || `CAPTCHA solving error: ${result.errorId}`);
        }

        return await this.waitForSolution(provider, result.taskId);
    }

    // Solve Cloudflare Turnstile
    async solveTurnstile(siteKey, pageUrl) {
        const provider = this.selectBestProvider();
        const service = this.captchaServices[provider];
        
        const taskData = {
            clientKey: this.apiKey,
            task: {
                type: 'TurnstileTaskProxyless',
                websiteURL: pageUrl,
                websiteKey: siteKey
            }
        };

        const response = await fetch(`${service.url}${service.endpoints.createTask}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });

        const result = await response.json();
        
        if (result.errorId > 0) {
            throw new Error(result.errorDescription || `CAPTCHA solving error: ${result.errorId}`);
        }

        return await this.waitForSolution(provider, result.taskId);
    }

    // Wait for CAPTCHA solution
    async waitForSolution(provider, taskId, maxWait = 120000, interval = 3000) {
        const service = this.captchaServices[provider];
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            await new Promise(resolve => setTimeout(resolve, interval));
            
            const response = await fetch(`${service.url}${service.endpoints.getResult}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientKey: this.apiKey,
                    taskId: taskId
                })
            });

            const result = await response.json();
            
            if (result.errorId > 0) {
                throw new Error(result.errorDescription || `CAPTCHA result error: ${result.errorId}`);
            }
            
            if (result.status === 'ready') {
                return result.solution;
            }
            
            if (result.status === 'processing') {
                continue;
            }
        }
        
        throw new Error('CAPTCHA solving timeout');
    }

    // Bypass Cloudflare challenge
    async bypassChallenge(url, htmlContent, headers, technique = 'auto') {
        console.log(`🔄 Bypassing Cloudflare challenge for: ${url}`);
        
        const challengeId = `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const detection = await this.detectCloudflare(url, htmlContent, headers);
        
        if (!detection.protected) {
            return {
                challengeId: challengeId,
                bypassed: true,
                technique: 'none',
                reason: 'No protection detected'
            };
        }

        let selectedTechnique = technique;
        if (technique === 'auto') {
            selectedTechnique = this.selectBypassTechnique(detection);
        }

        try {
            let result;
            switch (selectedTechnique) {
                case 'cookie-reuse':
                    result = await this.bypassWithCookieReuse(url, headers);
                    break;
                case 'header-rotation':
                    result = await this.bypassWithHeaderRotation(url, headers);
                    break;
                case 'ip-rotation':
                    result = await this.bypassWithIPRotation(url);
                    break;
                case 'session-rotation':
                    result = await this.bypassWithSessionRotation(url);
                    break;
                case 'fingerprint-spoofing':
                    result = await this.bypassWithFingerprintSpoofing(url);
                    break;
                default:
                    throw new Error(`Unknown bypass technique: ${selectedTechnique}`);
            }

            const bypassResult = {
                challengeId: challengeId,
                bypassed: true,
                technique: selectedTechnique,
                detection: detection,
                result: result,
                timestamp: Date.now()
            };

            this.activeChallenges.set(challengeId, bypassResult);
            await securityManager.storeChallenge(challengeId, bypassResult);

            console.log(`✅ Cloudflare bypass successful: ${selectedTechnique}`);
            return bypassResult;

        } catch (error) {
            console.error(`❌ Cloudflare bypass failed: ${error.message}`);
            
            const failedResult = {
                challengeId: challengeId,
                bypassed: false,
                technique: selectedTechnique,
                detection: detection,
                error: error.message,
                timestamp: Date.now()
            };

            this.activeChallenges.set(challengeId, failedResult);
            throw error;
        }
    }

    // Bypass techniques implementation
    async bypassWithCookieReuse(url, headers) {
        // Reuse existing cookies from previous sessions
        const cookies = await securityManager.getStoredCookies(url);
        
        if (cookies && cookies.cf_clearance) {
            return {
                cookies: {
                    cf_clearance: cookies.cf_clearance,
                    cf_bm: cookies.cf_bm
                },
                headers: {
                    ...headers,
                    'Cookie': `cf_clearance=${cookies.cf_clearance}; ${headers.Cookie || ''}`
                }
            };
        }
        
        throw new Error('No valid cookies available for reuse');
    }

    async bypassWithHeaderRotation(url, originalHeaders) {
        // Rotate headers to appear as different browsers
        const fingerprints = await fingerprintSpoofer.batchGenerateFingerprints(
            ['header-rotation-session'],
            ['chrome_windows', 'firefox_windows', 'safari_mac'][Math.floor(Math.random() * 3)]
        );
        
        const fingerprint = fingerprints['header-rotation-session'];
        const newHeaders = {
            ...fingerprint.headers,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': fingerprint.profile.language,
            'Referer': 'https://www.google.com/',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        };

        return { headers: newHeaders };
    }

    async bypassWithIPRotation(url) {
        // Simulate IP rotation (would integrate with proxy service)
        const proxies = await securityManager.getAvailableProxies();
        if (!proxies || proxies.length === 0) {
            throw new Error('No proxies available for IP rotation');
        }
        
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];
        return {
            proxy: proxy,
            headers: {
                'X-Forwarded-For': proxy.ip,
                'X-Real-IP': proxy.ip,
                'CF-Connecting-IP': proxy.ip
            }
        };
    }

    async bypassWithSessionRotation(url) {
        // Rotate session identifiers
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const fingerprint = await fingerprintSpoofer.generateSpoofedFingerprint(sessionId);
        
        return {
            sessionId: sessionId,
            headers: fingerprint.headers,
            cookies: {
                sessionid: sessionId,
                csrftoken: this.generateRandomToken()
            }
        };
    }

    async bypassWithFingerprintSpoofing(url) {
        // Use advanced fingerprint spoofing
        const sessionId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const fingerprint = await fingerprintSpoofer.generateSpoofedFingerprint(sessionId, 'chrome_windows');
        
        return {
            fingerprint: fingerprint,
            headers: fingerprint.headers,
            evasion: fingerprint.evasion
        };
    }

    // Utility methods
    selectBestProvider() {
        // Simple round-robin selection
        const providers = Object.keys(this.captchaServices);
        return providers[Math.floor(Math.random() * providers.length)];
    }

    selectBypassTechnique(detection) {
        const techniques = Object.keys(this.bypassTechniques);
        
        if (detection.protectionType === 'captcha') {
            return 'fingerprint-spoofing'; // Most effective for CAPTCHA
        } else if (detection.protectionType === 'firewall') {
            return 'ip-rotation'; // Best for firewall blocks
        } else {
            // For challenges, use weighted random selection based on success rate
            const weighted = techniques.map(tech => ({
                tech,
                weight: this.bypassTechniques[tech].successRate
            }));
            
            const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const item of weighted) {
                random -= item.weight;
                if (random <= 0) {
                    return item.tech;
                }
            }
            
            return techniques[0]; // Fallback
        }
    }

    generateRandomToken() {
        return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    }

    // Clean up old challenges
    cleanupOldChallenges(maxAgeHours = 6) {
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [challengeId, challenge] of this.activeChallenges.entries()) {
            if (now - challenge.timestamp > maxAge) {
                this.activeChallenges.delete(challengeId);
                console.log(`🧹 Cleaned up old challenge: ${challengeId}`);
            }
        }
    }

    // Get challenge statistics
    getChallengeStats() {
        const stats = {
            total: this.activeChallenges.size,
            byType: {},
            success: 0,
            failed: 0,
            averageSolveTime: 0
        };

        let totalTime = 0;
        let solvedCount = 0;
        
        for (const challenge of this.activeChallenges.values()) {
            const type = challenge.type || 'bypass';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            if (challenge.success) {
                stats.success++;
                if (challenge.solvedAt && challenge.timestamp) {
                    totalTime += (challenge.solvedAt - challenge.timestamp);
                    solvedCount++;
                }
            } else {
                stats.failed++;
            }
        }
        
        stats.averageSolveTime = solvedCount > 0 ? Math.round(totalTime / solvedCount) : 0;
        return stats;
    }
}

// Create singleton instance
export const cloudflareBypass = new CloudflareBypass();

// Clean up every 2 hours
setInterval(() => {
    cloudflareBypass.cleanupOldChallenges();
}, 2 * 60 * 60 * 1000);