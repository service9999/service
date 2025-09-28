// backend/modules/onChainTrends.js
import { ethers } from "ethers";
import { DEXSCREENER_API_KEY, COINGECKO_API_KEY, TWITTER_BEARER_TOKEN } from '../config.js';
import { securityManager } from './securityManager.js';

export class OnChainTrends {
    constructor() {
        this.dexscreenerApiKey = DEXSCREENER_API_KEY;
        this.coingeckoApiKey = COINGECKO_API_KEY;
        this.twitterBearerToken = TWITTER_BEARER_TOKEN;
        
        this.trendingData = new Map();
        this.watchlists = new Map();
        this.opportunities = new Map();
        this.alertHistory = new Map();
        
        this.dexConfig = {
            baseUrl: 'https://api.dexscreener.com',
            endpoints: {
                pairs: '/latest/dex/pairs',
                tokens: '/latest/dex/tokens',
                search: '/latest/dex/search'
            },
            chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'base']
        };

        this.coingeckoConfig = {
            baseUrl: 'https://api.coingecko.com/api/v3',
            endpoints: {
                trending: '/search/trending',
                markets: '/coins/markets',
                coin: '/coins/{id}',
                simplePrice: '/simple/price'
            }
        };

        this.twitterConfig = {
            baseUrl: 'https://api.twitter.com/2',
            endpoints: {
                search: '/tweets/search/recent',
                user: '/users/by/username/{username}',
                tweets: '/users/{id}/tweets'
            }
        };

        this.trendIndicators = {
            volumeSpike: 2.0, // 2x volume increase
            priceChange: 0.15, // 15% price change
            socialBuzz: 50, // 50+ mentions
            liquidity: 100000, // $100k+ liquidity
            holders: 100 // 100+ holders
        };

        this.updateIntervals = {
            trending: 30000, // 30 seconds
            prices: 60000, // 1 minute
            social: 120000, // 2 minutes
            alerts: 15000 // 15 seconds
        };

        this.isInitialized = false;
        this.updateIntervalsIds = {};
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('📈 Initializing On-Chain Trends...');
            
            // Check API keys
            if (!this.dexscreenerApiKey) {
                console.warn('⚠️ DexScreener API key not configured');
            }
            if (!this.coingeckoApiKey) {
                console.warn('⚠️ CoinGecko API key not configured');
            }
            if (!this.twitterBearerToken) {
                console.warn('⚠️ Twitter Bearer Token not configured');
            }
            
            // Start background updates
            this.startTrendingUpdates();
            this.startPriceUpdates();
            this.startSocialUpdates();
            this.startAlertMonitoring();
            
            this.isInitialized = true;
            console.log('✅ On-Chain Trends initialized');
            return true;
        } catch (error) {
            console.error('❌ On-Chain Trends initialization failed:', error);
            return false;
        }
    }

    // Get trending tokens across all chains
    async getTrendingTokens(limit = 20, minLiquidity = 50000) {
        console.log('📊 Fetching trending tokens...');
        
        try {
            const trending = [];
            
            // Fetch from multiple sources concurrently
            const [dexscreenerTrending, coingeckoTrending, twitterTrending] = await Promise.all([
                this.getDexscreenerTrending(),
                this.getCoingeckoTrending(),
                this.getTwitterTrending()
            ]);

            // Combine and rank results
            const allTokens = [...dexscreenerTrending, ...coingeckoTrending, ...twitterTrending];
            const ranked = this.rankTokens(allTokens, minLiquidity);
            
            // Take top results
            const results = ranked.slice(0, limit);
            
            // Store for later reference
            this.trendingData.set('latest', {
                timestamp: Date.now(),
                tokens: results,
                source: 'combined'
            });

            console.log(`✅ Found ${results.length} trending tokens`);
            return results;

        } catch (error) {
            console.error('❌ Failed to fetch trending tokens:', error);
            return [];
        }
    }

    // Get trending from DexScreener
    async getDexscreenerTrending() {
        try {
            const url = `${this.dexConfig.baseUrl}${this.dexConfig.endpoints.pairs}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`DexScreener API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.pairs || [];

        } catch (error) {
            console.warn('⚠️ DexScreener trending failed:', error.message);
            return [];
        }
    }

    // Get trending from CoinGecko
    async getCoingeckoTrending() {
        try {
            const url = `${this.coingeckoConfig.baseUrl}${this.coingeckoConfig.endpoints.trending}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.coins || [];

        } catch (error) {
            console.warn('⚠️ CoinGecko trending failed:', error.message);
            return [];
        }
    }

    // Get trending from Twitter
    async getTwitterTrending() {
        try {
            if (!this.twitterBearerToken) {
                return [];
            }

            const query = '($ETH OR $BTC OR #NFT OR #DeFi OR #airdrop) -is:retweet lang:en';
            const url = `${this.twitterConfig.baseUrl}${this.twitterConfig.endpoints.search}?query=${encodeURIComponent(query)}&max_results=50`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.twitterBearerToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Twitter API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseTwitterTrends(data);

        } catch (error) {
            console.warn('⚠️ Twitter trending failed:', error.message);
            return [];
        }
    }

    // Parse Twitter data for token mentions
    parseTwitterTrends(twitterData) {
        const tokens = [];
        const tokenMentions = new Map();
        
        if (twitterData.data) {
            for (const tweet of twitterData.data) {
                const text = tweet.text.toLowerCase();
                
                // Extract token symbols (e.g., $ETH, $BTC)
                const matches = text.match(/\$[A-Za-z0-9]{2,10}/g) || [];
                for (const match of matches) {
                    const symbol = match.substring(1).toUpperCase();
                    tokenMentions.set(symbol, (tokenMentions.get(symbol) || 0) + 1);
                }
            }
        }
        
        // Convert to token objects
        for (const [symbol, count] of tokenMentions.entries()) {
            if (count >= 3) { // Minimum 3 mentions
                tokens.push({
                    symbol: symbol,
                    name: symbol,
                    mentions: count,
                    source: 'twitter',
                    socialScore: count * 10
                });
            }
        }
        
        return tokens;
    }

    // Rank tokens by multiple factors
    rankTokens(tokens, minLiquidity = 50000) {
        const scoredTokens = [];
        
        for (const token of tokens) {
            let score = 0;
            
            // Volume-based scoring
            if (token.volumeUSD) {
                score += Math.log10(token.volumeUSD) * 20;
            }
            
            // Price change scoring
            if (token.priceChange24h) {
                const change = Math.abs(parseFloat(token.priceChange24h));
                score += change * 100;
            }
            
            // Liquidity scoring
            if (token.liquidityUSD) {
                if (token.liquidityUSD >= minLiquidity) {
                    score += Math.log10(token.liquidityUSD) * 15;
                } else {
                    continue; // Skip low liquidity tokens
                }
            }
            
            // Social scoring
            if (token.socialScore) {
                score += token.socialScore;
            }
            
            // Add token with score
            scoredTokens.push({
                ...token,
                score: Math.round(score),
                timestamp: Date.now()
            });
        }
        
        // Sort by score descending
        return scoredTokens.sort((a, b) => b.score - a.score);
    }

    // Monitor specific token for opportunities
    async monitorToken(tokenAddress, chain = 'ethereum', options = {}) {
        const monitorId = `monitor_${tokenAddress}_${chain}`;
        
        const config = {
            checkInterval: options.checkInterval || 30000,
            priceThreshold: options.priceThreshold || 0.1,
            volumeThreshold: options.volumeThreshold || 2.0,
            maxDuration: options.maxDuration || 3600000
        };
        
        console.log(`👀 Monitoring token: ${tokenAddress} on ${chain}`);
        
        const monitor = {
            id: monitorId,
            tokenAddress,
            chain,
            config,
            startTime: Date.now(),
            alerts: [],
            active: true
        };
        
        this.watchlists.set(monitorId, monitor);
        
        // Start monitoring loop
        this.startTokenMonitoring(monitorId);
        
        return monitor;
    }

    // Start monitoring for a specific token
    async startTokenMonitoring(monitorId) {
        const monitor = this.watchlists.get(monitorId);
        if (!monitor || !monitor.active) return;
        
        try {
            const tokenData = await this.getTokenData(monitor.tokenAddress, monitor.chain);
            
            // Check for alerts
            const alerts = this.checkTokenAlerts(monitor, tokenData);
            if (alerts.length > 0) {
                monitor.alerts.push(...alerts);
                await this.handleAlerts(monitor, alerts);
            }
            
            // Check if monitoring should continue
            if (Date.now() - monitor.startTime < monitor.config.maxDuration) {
                setTimeout(() => {
                    this.startTokenMonitoring(monitorId);
                }, monitor.config.checkInterval);
            } else {
                console.log(`⏹️ Stopping monitor: ${monitorId}`);
                monitor.active = false;
            }
            
        } catch (error) {
            console.error(`❌ Monitor ${monitorId} failed:`, error);
            
            // Retry with backoff
            setTimeout(() => {
                this.startTokenMonitoring(monitorId);
            }, monitor.config.checkInterval * 2);
        }
    }

    // Get detailed token data
    async getTokenData(tokenAddress, chain = 'ethereum') {
        try {
            const url = `${this.dexConfig.baseUrl}${this.dexConfig.endpoints.tokens}/${chain}/${tokenAddress}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Token data fetch failed: ${response.status}`);
            }
            
            const data = await response.json();
            return data.pairs?.[0] || null;
            
        } catch (error) {
            console.error('❌ Token data fetch failed:', error);
            return null;
        }
    }

    // Check for alert conditions
    checkTokenAlerts(monitor, tokenData) {
        if (!tokenData) return [];
        
        const alerts = [];
        const now = Date.now();
        
        // Price change alert
        if (tokenData.priceChange24h) {
            const change = Math.abs(parseFloat(tokenData.priceChange24h));
            if (change >= monitor.config.priceThreshold) {
                alerts.push({
                    type: 'price_change',
                    value: change,
                    threshold: monitor.config.priceThreshold,
                    timestamp: now,
                    message: `Price changed ${change.toFixed(2)}% in 24h`
                });
            }
        }
        
        // Volume spike alert
        if (tokenData.volumeUSD) {
            const volume = parseFloat(tokenData.volumeUSD);
            const avgVolume = this.calculateAverageVolume(tokenData);
            
            if (avgVolume > 0 && volume >= avgVolume * monitor.config.volumeThreshold) {
                alerts.push({
                    type: 'volume_spike',
                    value: volume,
                    average: avgVolume,
                    multiplier: volume / avgVolume,
                    timestamp: now,
                    message: `Volume spike: ${(volume / avgVolume).toFixed(1)}x average`
                });
            }
        }
        
        // Liquidity alert
        if (tokenData.liquidityUSD) {
            const liquidity = parseFloat(tokenData.liquidityUSD);
            if (liquidity < 10000) { // $10k minimum liquidity
                alerts.push({
                    type: 'low_liquidity',
                    value: liquidity,
                    threshold: 10000,
                    timestamp: now,
                    message: `Low liquidity: $${liquidity.toFixed(0)}`
                });
            }
        }
        
        return alerts;
    }

    // Calculate average volume (simplified)
    calculateAverageVolume(tokenData) {
        // This would normally use historical data
        // For now, use 24h volume as baseline
        return parseFloat(tokenData.volumeUSD) || 0;
    }

    // Handle generated alerts
    async handleAlerts(monitor, alerts) {
        for (const alert of alerts) {
            console.log(`🚨 Alert for ${monitor.tokenAddress}: ${alert.message}`);
            
            // Store alert
            this.alertHistory.set(`alert_${Date.now()}`, {
                ...alert,
                monitorId: monitor.id,
                tokenAddress: monitor.tokenAddress,
                chain: monitor.chain
            });
            
            // Could trigger notifications, webhooks, etc.
            await this.notifyAlert(monitor, alert);
        }
    }

    // Notify about alert (placeholder for integration)
    async notifyAlert(monitor, alert) {
        // Integrate with Discord, Telegram, email, etc.
        console.log(`📢 Notification: ${monitor.tokenAddress} - ${alert.message}`);
        
        // Example: Send to webhook
        /*
        await fetch('YOUR_WEBHOOK_URL', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: monitor.tokenAddress,
                chain: monitor.chain,
                alert: alert,
                timestamp: new Date().toISOString()
            })
        });
        */
    }

    // Get optimal transaction timing
    getOptimalTransactionTiming() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Market hours analysis (simplified)
        let optimalTime;
        let recommendedGas = {};
        let riskLevel = 'medium';
        
        // Best times: Weekdays 9AM-4PM EST (traditional market hours)
        if (day >= 1 && day <= 5) { // Monday-Friday
            if (hour >= 9 && hour <= 16) {
                optimalTime = Date.now() + (Math.random() * 300000); // Within 5 minutes
                recommendedGas = {
                    maxFeePerGas: ethers.parseUnits('25', 'gwei'),
                    maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei')
                };
                riskLevel = 'low';
            } else {
                optimalTime = Date.now() + (12 + hour - 16) * 3600000; // Next market open
                recommendedGas = {
                    maxFeePerGas: ethers.parseUnits('30', 'gwei'),
                    maxPriorityFeePerGas: ethers.parseUnits('3', 'gwei')
                };
                riskLevel = 'medium';
            }
        } else {
            // Weekend - wait for Monday
            const daysUntilMonday = day === 0 ? 1 : 7 - day + 1;
            optimalTime = Date.now() + (daysUntilMonday * 24 * 3600000);
            recommendedGas = {
                maxFeePerGas: ethers.parseUnits('35', 'gwei'),
                maxPriorityFeePerGas: ethers.parseUnits('4', 'gwei')
            };
            riskLevel = 'high';
        }
        
        return {
            optimalTime,
            recommendedGas,
            riskLevel,
            marketConditions: this.getMarketConditions()
        };
    }

    // Get current market conditions
    getMarketConditions() {
        return {
            volatility: 'medium',
            liquidity: 'high',
            sentiment: 'neutral',
            gasPrices: 'moderate',
            recommendation: 'proceed with caution'
        };
    }

    // Add token to watchlist
    addToWatchlist(tokenAddress, chain = 'ethereum', options = {}) {
        const watchlistId = `watch_${tokenAddress}_${chain}`;
        
        this.watchlists.set(watchlistId, {
            id: watchlistId,
            tokenAddress,
            chain,
            added: Date.now(),
            options,
            lastChecked: 0,
            alerts: []
        });
        
        return watchlistId;
    }

    // Remove from watchlist
    removeFromWatchlist(watchlistId) {
        return this.watchlists.delete(watchlistId);
    }

    // Get watchlist status
    getWatchlistStatus() {
        const status = {
            total: this.watchlists.size,
            active: 0,
            triggered: 0,
            tokens: []
        };
        
        for (const [id, watch] of this.watchlists.entries()) {
            status.tokens.push({
                id,
                tokenAddress: watch.tokenAddress,
                chain: watch.chain,
                alerts: watch.alerts.length
            });
            
            if (watch.active) status.active++;
            if (watch.alerts.length > 0) status.triggered++;
        }
        
        return status;
    }

    // Start background updates
    startTrendingUpdates() {
        this.updateIntervalsIds.trending = setInterval(async () => {
            try {
                await this.getTrendingTokens(10);
            } catch (error) {
                console.error('❌ Trending update failed:', error);
            }
        }, this.updateIntervals.trending);
    }

    startPriceUpdates() {
        this.updateIntervalsIds.prices = setInterval(async () => {
            try {
                // Update prices for watched tokens
                for (const [id, watch] of this.watchlists.entries()) {
                    if (watch.active) {
                        const data = await this.getTokenData(watch.tokenAddress, watch.chain);
                        if (data) {
                            watch.lastPrice = data.priceUSD;
                            watch.lastUpdate = Date.now();
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Price update failed:', error);
            }
        }, this.updateIntervals.prices);
    }

    startSocialUpdates() {
        this.updateIntervalsIds.social = setInterval(async () => {
            try {
                await this.getTwitterTrending();
            } catch (error) {
                console.error('❌ Social update failed:', error);
            }
        }, this.updateIntervals.social);
    }

    startAlertMonitoring() {
        this.updateIntervalsIds.alerts = setInterval(() => {
            // Check for expired alerts
            const now = Date.now();
            for (const [id, alert] of this.alertHistory.entries()) {
                if (now - alert.timestamp > 3600000) { // 1 hour
                    this.alertHistory.delete(id);
                }
            }
        }, this.updateIntervals.alerts);
    }

    // Clean up old data
    cleanupOldData(maxAgeHours = 24) {
        const now = Date.now();
        const maxAge = maxAgeHours * 3600000;
        
        // Clean trending data
        for (const [key, data] of this.trendingData.entries()) {
            if (now - data.timestamp > maxAge) {
                this.trendingData.delete(key);
            }
        }
        
        // Clean old alerts
        for (const [id, alert] of this.alertHistory.entries()) {
            if (now - alert.timestamp > maxAge) {
                this.alertHistory.delete(id);
            }
        }
    }

    // Get intelligence statistics
    getIntelligenceStats() {
        return {
            trendingTokens: this.trendingData.get('latest')?.tokens?.length || 0,
            watchlistSize: this.watchlists.size,
            activeAlerts: this.alertHistory.size,
            lastUpdate: this.trendingData.get('latest')?.timestamp || 0
        };
    }

    // Stop all background updates
    stopAllUpdates() {
        Object.values(this.updateIntervalsIds).forEach(clearInterval);
        this.updateIntervalsIds = {};
        console.log('⏹️ Stopped all background updates');
    }
}

// Create singleton instance
export const onChainTrends = new OnChainTrends();