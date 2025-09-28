// modules/profitTracker.js
import { ethers } from "ethers";
import { getRpcUrl } from '../config.js';

export class ProfitTracker {
    constructor() {
        this.isInitialized = false;
        this.profitData = new Map();
        this.expenses = new Map();
        this.netProfit = 0;
        this.totalRevenue = 0;
        this.totalExpenses = 0;
        this.chainStats = new Map();
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Add any module-specific initialization here
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async trackTransactionProfit(txHash, chainId, gasUsed, valueUSD, tokenSymbol = 'ETH') {
        try {
            const gasCostUSD = await this.calculateGasCostUSD(gasUsed, chainId);
            const netProfit = valueUSD - gasCostUSD;
            
            const transactionData = {
                txHash,
                chainId,
                valueUSD,
                gasCostUSD,
                netProfit,
                tokenSymbol,
                timestamp: Date.now(),
                date: new Date().toISOString().split('T')[0]
            };

            this.profitData.set(txHash, transactionData);
            this.netProfit += netProfit;
            this.totalRevenue += valueUSD;
            this.totalExpenses += gasCostUSD;

            // Update chain statistics
            this.updateChainStats(chainId, valueUSD, gasCostUSD, netProfit);

            return netProfit;
        } catch (error) {
            console.error('Profit tracking error:', error);
            return 0;
        }
    }

    async calculateGasCostUSD(gasUsed, chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(getRpcUrl(chainId));
            const gasPrice = await provider.getGasPrice();
            const gasCostWei = gasUsed * gasPrice;
            const gasCostETH = parseFloat(ethers.formatEther(gasCostWei));
            
            // Simple ETH to USD conversion (would use real API in production)
            const ethPrice = await this.fetchETHPrice();
            return gasCostETH * ethPrice;
        } catch (error) {
            console.error('Gas cost calculation error:', error);
            return 0;
        }
    }

    async fetchETHPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            return data.ethereum.usd || 2000;
        } catch (error) {
            return 2000; // Fallback price
        }
    }

    updateChainStats(chainId, revenue, expenses, profit) {
        const current = this.chainStats.get(chainId) || { revenue: 0, expenses: 0, profit: 0, count: 0 };
        
        this.chainStats.set(chainId, {
            revenue: current.revenue + revenue,
            expenses: current.expenses + expenses,
            profit: current.profit + profit,
            count: current.count + 1
        });
    }

    getProfitSummary(timeframe = 'all') {
        return {
            totalRevenue: this.totalRevenue,
            totalExpenses: this.totalExpenses,
            netProfit: this.netProfit,
            roi: this.totalRevenue > 0 ? (this.netProfit / this.totalRevenue) * 100 : 0,
            transactionCount: this.profitData.size,
            chainStats: Object.fromEntries(this.chainStats)
        };
    }

    getTransactions(timeframe = 'all') {
        return Array.from(this.profitData.values());
    }

    exportToCSV() {
        let csv = 'Tx Hash,Chain,Value USD,Gas Cost USD,Net Profit,Token,Date\n';
        
        this.profitData.forEach(transaction => {
            csv += `"${transaction.txHash}",${transaction.chainId},${transaction.valueUSD},${transaction.gasCostUSD},${transaction.netProfit},${transaction.tokenSymbol},${transaction.date}\n`;
        });

        return csv;
    }

    clearOldData(daysToKeep = 30) {
        const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
        let removed = 0;

        this.profitData.forEach((transaction, txHash) => {
            if (transaction.timestamp < cutoff) {
                this.profitData.delete(txHash);
                removed++;
            }
        });

        return removed;
    }
}

// Singleton instance
export const profitTracker = new ProfitTracker();