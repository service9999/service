// backend/modules/chainManager.js
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ChainManager {
    constructor() {
        this.isInitialized = false;
        this.supportedChains = {};
        this.isChainsLoaded = false;
        this.loading = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Add any module-specific initialization here
            await this.loadChains();
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async loadChains() {
        if (this.loading || this.isChainsLoaded) {
            console.log('⏩ Chains already loaded, skipping duplicate initialization...');
            return true;
        }
        
        this.loading = true;
        try {
            const chainsPath = path.join(__dirname, '..', 'chains.json');
            const chainsData = fs.readFileSync(chainsPath, 'utf8');
            const chainConfigs = JSON.parse(chainsData);
            
            this.supportedChains = {};
            for (const [chainId, config] of Object.entries(chainConfigs)) {
                this.supportedChains[chainId] = {
                    ...config,
                    activeRpc: this.rotateRPC(config.rpc),
                    lastUsed: Date.now(),
                    health: 'good'
                };
            }
            
            // Initialize Bitcoin separately
            await this.initializeBitcoin();
            
            this.isChainsLoaded = true;
            console.log('✅ Chains loaded successfully from local file');
            return true;
        } catch (error) {
            console.error('❌ Failed to load chains.json:', error.message);
            // Fallback to basic config
            this.supportedChains = {
                "1": {
                    name: "ethereum",
                    rpc: [process.env.RPC_URL],
                    explorer: "https://api.etherscan.io",
                    nativeToken: "ETH",
                    priority: 1,
                    activeRpc: process.env.RPC_URL,
                    lastUsed: Date.now(),
                    health: 'good'
                }
            };
            
            // Initialize Bitcoin even in fallback mode
            await this.initializeBitcoin();
            
            this.isChainsLoaded = true;
            return false;
        } finally {
            this.loading = false;
        }
    }

    async initializeBitcoin() {
        try {
            const bitcoinRpcUrl = process.env.BITCOIN_RPC_URL;
            const bitcoinRpcUser = process.env.BITCOIN_RPC_USER;
            const bitcoinRpcPassword = process.env.BITCOIN_RPC_PASSWORD;

            if (!bitcoinRpcUrl) {
                console.log('⚠️ Bitcoin disabled: Missing RPC configuration');
                return false;
            }

            this.supportedChains['bitcoin'] = {
                name: 'Bitcoin',
                rpc: [bitcoinRpcUrl],
                activeRpc: bitcoinRpcUrl,
                explorer: '',
                nativeToken: 'BTC',
                priority: 2,
                lastUsed: Date.now(),
                health: 'good',
                rpcConfig: {
                    user: bitcoinRpcUser || 'free',
                    password: bitcoinRpcPassword || 'public'
                }
            };
            
            console.log(`✅ Bitcoin initialized: ${bitcoinRpcUrl.substring(0, 30)}...`);
            return true;
        } catch (error) {
            console.log('⚠️ Bitcoin initialization failed:', error.message);
            return false;
        }
    }

    getChainConfig(chainId) {
        return this.supportedChains[chainId] || null;
    }

    getChainName(chainId) {
        const config = this.getChainConfig(chainId);
        const CHAIN_NAMES = {
            '1': 'Ethereum',
            '56': 'Binance Smart Chain', 
            '137': 'Polygon',
            '42161': 'Arbitrum',
            '10': 'Optimism',
            '43114': 'Avalanche',
            '8453': 'Base',
            '324': 'zkSync Era',
            'solana': 'Solana',
            'bitcoin': 'Bitcoin'
        };
        return config?.name || CHAIN_NAMES[chainId] || `Chain ${chainId}`;
    }

    rotateRPC(rpcs) {
        if (!Array.isArray(rpcs)) rpcs = [rpcs];
        const randomIndex = Math.floor(Math.random() * rpcs.length);
        return this.decodeRPC(rpcs[randomIndex]);
    }

    decodeRPC(encoded) {
        try {
            // Handle both encoded and plaintext RPC URLs
            if (encoded.startsWith('http')) {
                return encoded; // Already decoded
            }
            return Buffer.from(encoded, 'base64').toString('utf8');
        } catch {
            return encoded; // Fallback to original
        }
    }

    decode(addr) {
        try {
            return Buffer.from(addr, 'base64').toString('utf8');
        } catch {
            return addr;
        }
    }

    async loadSupportedChains() {
        try {
            const chainsPath = path.join(__dirname, '..', 'chains.json');
            const chainsData = fs.readFileSync(chainsPath, 'utf8');
            const chains = JSON.parse(chainsData);
            
            for (const [id, cfg] of Object.entries(chains)) {
                const rpcList = Array.isArray(cfg.rpc) ? cfg.rpc : [cfg.rpc];
                this.supportedChains[id] = {
                    ...cfg,
                    rpc: rpcList.map(rpc => this.decodeRPC(rpc)),
                    activeRpc: this.rotateRPC(rpcList)
                };
            }
            
            // Initialize Bitcoin
            await this.initializeBitcoin();
            
            console.log("✅ Loaded and rotated RPCs from local file.");
            return true;
        } catch (err) {
            console.error("❌ Failed to load chains.json: " + err.message);
            return false;
        }
    }

    getSupportedChains() {
        return this.supportedChains;
    }

    getChainStatus() {
        return {
            isLoaded: this.isChainsLoaded,
            chainCount: Object.keys(this.supportedChains).length,
            chains: Object.keys(this.supportedChains),
            details: Object.entries(this.supportedChains).reduce((acc, [chainId, config]) => {
                acc[chainId] = {
                    name: config.name,
                    health: config.health,
                    rpc: config.activeRpc ? config.activeRpc.substring(0, 30) + '...' : 'none'
                };
                return acc;
            }, {})
        };
    }

    async checkChainHealth(chainId) {
        const config = this.getChainConfig(chainId);
        if (!config) return { healthy: false, error: 'Chain not configured' };
        
        // Special handling for Bitcoin
        if (chainId === 'bitcoin') {
            return { 
                healthy: !!config.activeRpc, 
                note: 'Bitcoin health check requires custom implementation',
                rpc: config.activeRpc 
            };
        }
        
        try {
            const provider = new ethers.JsonRpcProvider(config.activeRpc);
            const blockNumber = await provider.getBlockNumber();
            return { healthy: true, blockNumber, rpc: config.activeRpc };
        } catch (error) {
            // Try to switch RPC and check again
            const newRpc = await this.switchRPC(chainId);
            if (newRpc) {
                try {
                    const provider = new ethers.JsonRpcProvider(newRpc);
                    const blockNumber = await provider.getBlockNumber();
                    return { 
                        healthy: true, 
                        blockNumber, 
                        rpc: newRpc,
                        note: 'Switched to backup RPC' 
                    };
                } catch (retryError) {
                    return { 
                        healthy: false, 
                        error: retryError.message, 
                        rpc: newRpc 
                    };
                }
            }
            return { healthy: false, error: error.message, rpc: config.activeRpc };
        }
    }

    async switchRPC(chainId) {
        const config = this.getChainConfig(chainId);
        if (!config || !Array.isArray(config.rpc) || config.rpc.length <= 1) return null;
        
        // Get current index and rotate to next
        const currentRpc = config.activeRpc;
        const currentIndex = config.rpc.findIndex(rpc => 
            this.decodeRPC(rpc) === currentRpc || rpc === currentRpc
        );
        
        const nextIndex = (currentIndex + 1) % config.rpc.length;
        config.activeRpc = this.decodeRPC(config.rpc[nextIndex]);
        
        console.log(`🔄 Switched ${this.getChainName(chainId)} to RPC: ${config.activeRpc.substring(0, 30)}...`);
        return config.activeRpc;
    }

    getRPCConfig(chainId) {
        const config = this.getChainConfig(chainId);
        if (!config) return null;
        
        if (chainId === 'bitcoin') {
            return {
                url: config.activeRpc,
                user: config.rpcConfig?.user || 'free',
                password: config.rpcConfig?.password || 'public'
            };
        }
        
        return config.activeRpc;
    }
}

export const chainManager = new ChainManager();