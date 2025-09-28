// modules/market-intelligence.js
export class MarketIntelligence {
    constructor() {
        this.isInitialized = false;
        this.marketData = new Map();
        this.volatilityMetrics = new Map();
        this.monitorInterval = null;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            await this.loadMarketData();
            this.startMarketMonitor();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async loadMarketData() {
        try {
            const [gasData, tokenData, marketData] = await Promise.all([
                this.fetchGasPriceData(),
                this.fetchTokenTrends(),
                this.fetchMarketVolatility()
            ]);

            this.marketData.set('gas', gasData);
            this.marketData.set('tokens', tokenData);
            this.marketData.set('volatility', marketData);
        } catch (error) {
            console.error('Market data loading failed:', error);
        }
    }

    getOptimalTransactionTiming() {
        const volatility = this.marketData.get('volatility') || {};
        const gasData = this.marketData.get('gas') || {};
        
        return {
            optimalTime: this.calculateOptimalTime(volatility, gasData),
            recommendedGas: this.calculateOptimalGas(gasData),
            riskLevel: this.calculateRiskLevel(volatility)
        };
    }

    startMarketMonitor() {
        // Clear any existing interval
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
        }
        
        this.monitorInterval = setInterval(async () => {
            await this.loadMarketData();
        }, 300000);
    }

    calculateOptimalTime(volatility, gasData) {
        return Date.now() + 300000;
    }

    calculateOptimalGas(gasData) {
        return {
            maxFeePerGas: 30,
            maxPriorityFeePerGas: 2
        };
    }

    calculateRiskLevel(volatility) {
        return 'medium';
    }

    async fetchGasPriceData() {
        try {
            const response = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle');
            const data = await response.json();
            return data.result;
        } catch (error) {
            return {};
        }
    }

    async fetchTokenTrends() {
        return {};
    }

    async fetchMarketVolatility() {
        return {};
    }

    // Cleanup method to stop monitoring
    cleanup() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }
}