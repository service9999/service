// backend/modules/fingerprintSpoofer.js
import { FINGERPRINT_SAFE_ORIGIN, FINGERPRINT_SAFE_USER_AGENT } from '../config.js';
import { securityManager } from './securityManager.js';

export class FingerprintSpoofer {
    constructor() {
        this.isInitialized = false;
        this.safeOrigin = FINGERPRINT_SAFE_ORIGIN;
        this.safeUserAgent = FINGERPRINT_SAFE_USER_AGENT;
        this.activeFingerprints = new Map();
        
        // Common legitimate browser fingerprints
        this.browserProfiles = {
            chrome_windows: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                language: 'en-US,en;q=0.9',
                screen: { width: 1920, height: 1080, depth: 24 },
                timezone: 'America/New_York',
                hardwareConcurrency: 8,
                deviceMemory: 8,
                platform: 'Win32',
                plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'],
                mimeTypes: ['application/pdf', 'text/pdf'],
                webglVendor: 'Google Inc. (Intel Inc.)',
                webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)'
            },
            chrome_mac: {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                language: 'en-US,en;q=0.9',
                screen: { width: 1440, height: 900, depth: 30 },
                timezone: 'America/Los_Angeles',
                hardwareConcurrency: 12,
                deviceMemory: 16,
                platform: 'MacIntel',
                plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'],
                mimeTypes: ['application/pdf', 'text/pdf'],
                webglVendor: 'Google Inc. (Apple Inc.)',
                webglRenderer: 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)'
            },
            firefox_windows: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
                language: 'en-US,en;q=0.5',
                screen: { width: 1920, height: 1080, depth: 24 },
                timezone: 'America/Chicago',
                hardwareConcurrency: 6,
                deviceMemory: 16,
                platform: 'Win32',
                plugins: ['default', 'internal-pdf-viewer'],
                mimeTypes: ['application/pdf', 'text/pdf'],
                webglVendor: 'Google Inc. (NVIDIA Corporation)',
                webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080, OpenGL 4.6)'
            },
            safari_mac: {
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
                language: 'en-US,en;q=0.9',
                screen: { width: 1728, height: 1117, depth: 30 },
                timezone: 'America/Denver',
                hardwareConcurrency: 10,
                deviceMemory: 32,
                platform: 'MacIntel',
                plugins: [],
                mimeTypes: [],
                webglVendor: 'Apple Inc. (Apple Inc.)',
                webglRenderer: 'Apple M1 Max (Apple GPU)'
            }
        };

        // Common bot/automation detection patterns to avoid
        this.detectionPatterns = {
            headless: ['HeadlessChrome', 'PhantomJS', 'Selenium', 'WebDriver'],
            automation: ['navigator.webdriver', 'window.phantom', 'window.__selenium'],
            vm: ['VMware', 'VirtualBox', 'Xen', 'KVM', 'QEMU'],
            debugger: ['debugger', 'devtools', 'chrome://'],
            automationProps: ['webdriver', '__driver_evaluate', '__webdriver_evaluate']
        };
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Any initialization logic would go here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // Generate a spoofed fingerprint for a session
    async generateSpoofedFingerprint(sessionId, profileType = 'chrome_windows') {
        console.log(`🛡️ Generating spoofed fingerprint for session: ${sessionId}`);
        
        const profile = this.browserProfiles[profileType] || this.browserProfiles.chrome_windows;
        const fingerprint = this.createFingerprint(profile, sessionId);
        
        // Store the fingerprint
        this.activeFingerprints.set(sessionId, fingerprint);
        await securityManager.storeFingerprint(sessionId, fingerprint);

        console.log(`✅ Generated fingerprint: ${profileType} profile`);
        return fingerprint;
    }

    // Create a complete fingerprint object
    createFingerprint(profile, sessionId) {
        const fingerprint = {
            id: sessionId,
            profile: profile,
            timestamp: Date.now(),
            origin: this.safeOrigin,
            headers: this.generateHeaders(profile),
            canvas: this.generateCanvasFingerprint(),
            webgl: this.generateWebGLFingerprint(profile),
            audio: this.generateAudioFingerprint(),
            fonts: this.generateFontList(),
            performance: this.generatePerformanceMetrics(),
            network: this.generateNetworkInfo(),
            storage: this.generateStorageInfo(),
            evasion: this.generateEvasionTechniques(),
            riskScore: this.calculateRiskScore(profile)
        };

        return fingerprint;
    }

    // Generate realistic HTTP headers
    generateHeaders(profile) {
        return {
            'User-Agent': profile.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': profile.language,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        };
    }

    // Generate canvas fingerprint (avoid detection)
    generateCanvasFingerprint() {
        return {
            data: this.generateRandomCanvasData(),
            winding: true,
            text: 'CanvasRenderingContext2D',
            noise: Math.random() * 0.0001 // Small random noise
        };
    }

    generateRandomCanvasData() {
        // Generate realistic canvas fingerprint data
        const base = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += base.charAt(Math.floor(Math.random() * base.length));
        }
        return result;
    }

    // Generate WebGL fingerprint
    generateWebGLFingerprint(profile) {
        return {
            vendor: profile.webglVendor,
            renderer: profile.webglRenderer,
            parameters: this.generateWebGLParameters(),
            extensions: this.generateWebGLExtensions(),
            unmaskedVendor: profile.webglVendor.split('(')[0].trim(),
            unmaskedRenderer: profile.webglRenderer.split('(')[0].trim()
        };
    }

    generateWebGLParameters() {
        return {
            MAX_TEXTURE_SIZE: 16384,
            MAX_CUBE_MAP_TEXTURE_SIZE: 16384,
            MAX_RENDERBUFFER_SIZE: 16384,
            MAX_VIEWPORT_DIMS: [16384, 16384],
            ALIASED_LINE_WIDTH_RANGE: [1, 1],
            ALIASED_POINT_SIZE_RANGE: [1, 1024]
        };
    }

    generateWebGLExtensions() {
        return [
            'ANGLE_instanced_arrays',
            'EXT_blend_minmax',
            'EXT_color_buffer_half_float',
            'EXT_disjoint_timer_query',
            'EXT_float_blend',
            'EXT_frag_depth',
            'EXT_shader_texture_lod',
            'EXT_texture_filter_anisotropic',
            'WEBKIT_EXT_texture_filter_anisotropic',
            'OES_element_index_uint',
            'OES_standard_derivatives',
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_texture_half_float',
            'OES_texture_half_float_linear',
            'OES_vertex_array_object',
            'WEBGL_color_buffer_float',
            'WEBGL_compressed_texture_astc',
            'WEBGL_compressed_texture_etc',
            'WEBGL_compressed_texture_etc1',
            'WEBGL_compressed_texture_pvrtc',
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_debug_renderer_info',
            'WEBGL_debug_shaders',
            'WEBGL_depth_texture',
            'WEBGL_draw_buffers',
            'WEBGL_lose_context',
            'WEBGL_multi_draw'
        ];
    }

    // Generate audio fingerprint
    generateAudioFingerprint() {
        return {
            context: 'AudioContext',
            sampleRate: 44100,
            channelCount: 2,
            bufferSize: 2048,
            frequencyData: this.generateFrequencyData(),
            timeDomainData: this.generateTimeDomainData()
        };
    }

    generateFrequencyData() {
        const data = [];
        for (let i = 0; i < 1024; i++) {
            data.push(Math.random() * 256);
        }
        return data;
    }

    generateTimeDomainData() {
        const data = [];
        for (let i = 0; i < 2048; i++) {
            data.push(Math.random() * 256 - 128);
        }
        return data;
    }

    // Generate font list
    generateFontList() {
        return [
            'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
            'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS',
            'Consolas', 'Constantia', 'Corbel', 'Courier New', 'DejaVu Sans',
            'Franklin Gothic Medium', 'Gabriola', 'Garamond', 'Georgia',
            'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif',
            'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman',
            'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings'
        ];
    }

    // Generate performance metrics
    generatePerformanceMetrics() {
        const now = Date.now();
        return {
            timing: {
                navigationStart: now - Math.random() * 5000,
                domainLookupStart: now - Math.random() * 4000,
                domainLookupEnd: now - Math.random() * 3000,
                connectStart: now - Math.random() * 2000,
                connectEnd: now - Math.random() * 1000,
                requestStart: now - Math.random() * 500,
                responseStart: now - Math.random() * 200,
                responseEnd: now,
                domLoading: now + Math.random() * 100,
                domInteractive: now + Math.random() * 500,
                domContentLoaded: now + Math.random() * 1000,
                domComplete: now + Math.random() * 2000,
                loadEventStart: now + Math.random() * 2500,
                loadEventEnd: now + Math.random() * 3000
            },
            memory: {
                usedJSHeapSize: Math.floor(Math.random() * 100000000) + 50000000,
                totalJSHeapSize: Math.floor(Math.random() * 200000000) + 100000000,
                jsHeapSizeLimit: 4294705152
            },
            navigation: {
                type: 'navigate',
                redirectCount: 0
            }
        };
    }

    // Generate network information
    generateNetworkInfo() {
        return {
            downlink: 10 + Math.random() * 90,
            effectiveType: '4g',
            rtt: 50 + Math.random() * 150,
            saveData: false,
            type: 'wifi'
        };
    }

    // Generate storage information
    generateStorageInfo() {
        return {
            cookies: Math.floor(Math.random() * 20) + 5,
            localStorage: Math.floor(Math.random() * 1024) + 512,
            sessionStorage: Math.floor(Math.random() * 512) + 256,
            indexedDB: true,
            serviceWorkers: false
        };
    }

    // Generate evasion techniques
    generateEvasionTechniques() {
        return {
            webdriver: false,
            chrome: this.evadeChromeDetection(),
            firefox: this.evadeFirefoxDetection(),
            automation: this.evadeAutomationDetection(),
            headless: this.evadeHeadlessDetection(),
            debugger: this.evadeDebuggerDetection()
        };
    }

    evadeChromeDetection() {
        return {
            permissions: this.spoofPermissions(),
            plugins: this.spoofPlugins(),
            languages: ['en-US', 'en'],
            platform: 'Win32'
        };
    }

    evadeFirefoxDetection() {
        return {
            permissions: this.spoofPermissions(),
            plugins: [],
            languages: ['en-US', 'en'],
            platform: 'Win32'
        };
    }

    evadeAutomationDetection() {
        return {
            deleteWebdriver: true,
            overrideAutomation: true,
            randomizeTiming: true,
            humanizeInteractions: true
        };
    }

    evadeHeadlessDetection() {
        return {
            overrideUserAgent: true,
            mockScreen: true,
            mockPlugins: true,
            mockWebGL: true
        };
    }

    evadeDebuggerDetection() {
        return {
            breakpointDetection: false,
            devtoolsDetection: false,
            performanceMock: true
        };
    }

    spoofPermissions() {
        return {
            geolocation: 'prompt',
            notifications: 'denied',
            camera: 'denied',
            microphone: 'denied',
            backgroundSync: 'granted',
            clipboardRead: 'prompt',
            clipboardWrite: 'granted'
        };
    }

    spoofPlugins() {
        return [
            {
                name: 'Chrome PDF Plugin',
                filename: 'internal-pdf-viewer',
                description: 'Portable Document Format'
            },
            {
                name: 'Chrome PDF Viewer',
                filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                description: ''
            },
            {
                name: 'Native Client',
                filename: 'internal-nacl-plugin',
                description: ''
            }
        ];
    }

    // Calculate risk score for the fingerprint
    calculateRiskScore(profile) {
        let score = 0;
        
        // Lower risk for common profiles
        if (profile.userAgent.includes('Chrome/120')) score += 10;
        if (profile.userAgent.includes('Firefox/120')) score += 15;
        if (profile.userAgent.includes('Safari/')) score += 20;
        
        // Higher risk for less common configurations
        if (profile.hardwareConcurrency > 16) score += 25;
        if (profile.deviceMemory > 32) score += 30;
        
        // Normalize score to 0-100
        return Math.min(100, Math.max(0, score));
    }

    // Validate a fingerprint (check if it looks legitimate)
    validateFingerprint(fingerprint) {
        const issues = [];
        
        // Check for automation detection patterns
        for (const [type, patterns] of Object.entries(this.detectionPatterns)) {
            for (const pattern of patterns) {
                if (JSON.stringify(fingerprint).includes(pattern)) {
                    issues.push(`Detected ${type} pattern: ${pattern}`);
                }
            }
        }
        
        // Check for consistency
        if (!fingerprint.headers || !fingerprint.headers['User-Agent']) {
            issues.push('Missing User-Agent header');
        }
        
        if (fingerprint.riskScore > 70) {
            issues.push('High risk score: ' + fingerprint.riskScore);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            score: 100 - (issues.length * 10) // 100 - (number of issues * 10)
        };
    }

    // Rotate fingerprint (change some attributes while maintaining consistency)
    async rotateFingerprint(sessionId) {
        const current = this.activeFingerprints.get(sessionId);
        if (!current) {
            throw new Error('Fingerprint not found for session: ' + sessionId);
        }
        
        const rotated = { ...current };
        
        // Rotate some attributes
        rotated.timestamp = Date.now();
        rotated.canvas.noise = Math.random() * 0.0001;
        rotated.performance = this.generatePerformanceMetrics();
        rotated.network = this.generateNetworkInfo();
        
        // Update storage
        this.activeFingerprints.set(sessionId, rotated);
        await securityManager.storeFingerprint(sessionId, rotated);
        
        console.log(`🔄 Rotated fingerprint for session: ${sessionId}`);
        return rotated;
    }

    // Batch generate fingerprints
    async batchGenerateFingerprints(sessionIds, profileType = 'chrome_windows') {
        const results = {};
        
        for (const sessionId of sessionIds) {
            results[sessionId] = await this.generateSpoofedFingerprint(sessionId, profileType);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return results;
    }

    // Clean up old fingerprints
    cleanupOldFingerprints(maxAgeHours = 12) {
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;
        
        for (const [sessionId, fingerprint] of this.activeFingerprints.entries()) {
            if (now - fingerprint.timestamp > maxAge) {
                this.activeFingerprints.delete(sessionId);
                console.log(`🧹 Cleaned up old fingerprint: ${sessionId}`);
            }
        }
    }

    // Get fingerprint statistics
    getFingerprintStats() {
        const stats = {
            total: this.activeFingerprints.size,
            byProfile: {},
            averageRisk: 0,
            valid: 0,
            invalid: 0
        };

        let totalRisk = 0;
        
        for (const fingerprint of this.activeFingerprints.values()) {
            const profileType = Object.keys(this.browserProfiles).find(
                key => this.browserProfiles[key].userAgent === fingerprint.profile.userAgent
            ) || 'unknown';
            
            stats.byProfile[profileType] = (stats.byProfile[profileType] || 0) + 1;
            totalRisk += fingerprint.riskScore;
            
            const validation = this.validateFingerprint(fingerprint);
            if (validation.valid) stats.valid++;
            else stats.invalid++;
        }
        
        stats.averageRisk = stats.total > 0 ? Math.round(totalRisk / stats.total) : 0;
        return stats;
    }
}

// Create singleton instance
export const fingerprintSpoofer = new FingerprintSpoofer();

// Clean up every 6 hours
setInterval(() => {
    fingerprintSpoofer.cleanupOldFingerprints();
}, 6 * 60 * 60 * 1000);