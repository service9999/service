// backend/modules/signatureDatabase.js
import { ethers } from "ethers";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { securityManager } from './securityManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SignatureDatabase {
    constructor() {
        this.isInitialized = false;
        this.signatures = new Map();
        this.abis = new Map();
        this.functionCache = new Map();
        this.eventCache = new Map();
        this.errorCache = new Map();
        
        this.databasePath = path.join(__dirname, 'data', 'signatures');
        this.cachePath = path.join(__dirname, 'data', 'cache');
        
        this.commonSignatures = new Map();
        this.popularContracts = new Map();
        
        this.updateIntervals = {
            signatures: 3600000, // 1 hour
            abis: 86400000, // 24 hours
            cache: 1800000 // 30 minutes
        };

        this.intervals = {};
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Initialize database structure
            this.initializeDatabase();
            this.loadCommonSignatures();
            this.loadPopularContracts();
            
            // Start background updates
            this.startSignatureUpdates();
            this.startABIUpdates();
            this.startCacheCleaning();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // Initialize database structure
    initializeDatabase() {
        // Create directories if they don't exist
        if (!fs.existsSync(this.databasePath)) {
            fs.mkdirSync(this.databasePath, { recursive: true });
            console.log('📁 Created signature database directory');
        }
        
        if (!fs.existsSync(this.cachePath)) {
            fs.mkdirSync(this.cachePath, { recursive: true });
            console.log('📁 Created cache directory');
        }
    }

    // Load common function signatures
    loadCommonSignatures() {
        const commonSigs = {
            // ERC20
            '0x70a08231': 'balanceOf(address)',
            '0xdd62ed3e': 'allowance(address,address)',
            '0x095ea7b3': 'approve(address,uint256)',
            '0x23b872dd': 'transferFrom(address,address,uint256)',
            '0xa9059cbb': 'transfer(address,uint256)',
            
            // ERC721
            '0x6352211e': 'ownerOf(uint256)',
            '0x42842e0e': 'transferFrom(address,address,uint256)',
            '0xb88d4fde': 'safeTransferFrom(address,address,uint256)',
            
            // ERC1155
            '0x00fdd58e': 'balanceOf(address,uint256)',
            '0x4e1273f4': 'balanceOfBatch(address[],uint256[])',
            '0xf242432a': 'safeTransferFrom(address,address,uint256,uint256,bytes)',
            '0x2eb2c2d6': 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
            
            // Common
            '0x06fdde03': 'name()',
            '0x95d89b41': 'symbol()',
            '0x313ce567': 'decimals()',
            '0x18160ddd': 'totalSupply()',
            '0x01ffc9a7': 'supportsInterface(bytes4)'
        };

        for (const [sig, func] of Object.entries(commonSigs)) {
            this.commonSignatures.set(sig, func);
            this.signatures.set(sig, {
                signature: sig,
                function: func,
                type: 'function',
                count: 1000, // High usage count
                lastSeen: Date.now()
            });
        }
    }

    // Load popular contract ABIs
    loadPopularContracts() {
        const popularContracts = {
            // WETH
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
                name: 'WETH',
                abi: this.generateWETHABI(),
                signatures: this.extractSignaturesFromABI(this.generateWETHABI())
            },
            // USDC - FIXED: Complete the USDC definition
            '0xA0b86991c6218b36c1d19D4a2e9eb0cE3606eB48': {
                name: 'USDC',
                abi: this.generateUSDCABI(),
                signatures: this.extractSignaturesFromABI(this.generateUSDCABI())
            },
            // USDT
            '0xdAC17F958D2ee523a2206206994597C13D831ec7': {
                name: 'USDT',
                abi: this.generateUSDTABI(),
                signatures: this.extractSignaturesFromABI(this.generateUSDTABI())
            },
            // Uniswap V2 Router
            '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': {
                name: 'UniswapV2Router',
                abi: this.generateUniswapV2RouterABI(),
                signatures: this.extractSignaturesFromABI(this.generateUniswapV2RouterABI())
            },
            // Uniswap V3 Router
            '0xE592427A0AEce92De3Edee1F18E0157C05861564': {
                name: 'UniswapV3Router',
                abi: this.generateUniswapV3RouterABI(),
                signatures: this.extractSignaturesFromABI(this.generateUniswapV3RouterABI())
            }
        };

        for (const [address, contract] of Object.entries(popularContracts)) {
            this.popularContracts.set(address.toLowerCase(), contract);
            this.abis.set(address.toLowerCase(), contract.abi);
            
            // Store all signatures - WITH SAFETY CHECK
            if (contract.signatures && Array.isArray(contract.signatures)) {
                for (const sig of contract.signatures) {
                    this.signatures.set(sig.signature, sig);
                }
            } else {
                console.log('⚠️ No signatures array for contract:', contract.name || address);
                // Extract signatures from ABI if not provided
                if (contract.abi) {
                    const extractedSigs = this.extractSignaturesFromABI(contract.abi);
                    for (const sig of extractedSigs) {
                        this.signatures.set(sig.signature, sig);
                    }
                }
            }
        }
    }

    // Generate WETH ABI
    generateWETHABI() {
        return [
            "function deposit() payable",
            "function withdraw(uint wad)",
            "function totalSupply() view returns (uint)",
            "function approve(address guy, uint wad) returns (bool)",
            "function transfer(address dst, uint wad) returns (bool)",
            "function transferFrom(address src, address dst, uint wad) returns (bool)"
        ];
    }

    // Generate USDC ABI - ADDED MISSING METHOD
    generateUSDCABI() {
        return [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address account) view returns (uint256)",
            "function transfer(address recipient, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
        ];
    }

    // Generate USDT ABI
    generateUSDTABI() {
        return [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function balanceOf(address account) view returns (uint256)",
            "function transfer(address recipient, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
        ];
    }

    // Generate Uniswap V2 Router ABI
    generateUniswapV2RouterABI() {
        return [
            "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
            "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
            "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
            "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
            "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
            "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
            "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
            "function getAmountsIn(uint amountOut, address[] memory path) view returns (uint[] memory amounts)"
        ];
    }

    // Generate Uniswap V3 Router ABI
    generateUniswapV3RouterABI() {
        return [
            "function exactInput((bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum)) payable returns (uint256 amountOut)",
            "function exactOutput((bytes path, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum)) payable returns (uint256 amountIn)",
            "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)",
            "function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountIn)",
            "function multicall(bytes[] calldata data) payable returns (bytes[] memory results)"
        ];
    }

    // Extract signatures from ABI
    extractSignaturesFromABI(abi) {
        const signatures = [];
        
        for (const item of abi) {
            if (typeof item === 'string') {
                // Handle string ABI definitions
                const functionMatch = item.match(/^function\s+(\w+)\s*\(([^)]*)\)/);
                if (functionMatch) {
                    const functionName = functionMatch[1];
                    const inputs = functionMatch[2] || '';
                    const sig = ethers.id(functionName + '(' + inputs + ')').substring(0, 10);
                    signatures.push({
                        signature: sig,
                        function: functionName,
                        inputs: inputs.split(',').filter(Boolean).map(param => ({ type: param.trim() })),
                        outputs: [],
                        type: 'function',
                        count: 500,
                        lastSeen: Date.now()
                    });
                }
            }
        }
        
        return signatures;
    }

    // Get function signature from selector
    async getFunctionSignature(selector, contractAddress = null) {
        const normalizedSelector = selector.toLowerCase();
        
        // Check cache first
        const cached = this.functionCache.get(normalizedSelector);
        if (cached && this.isCacheValid(cached)) {
            return cached;
        }

        // Check common signatures
        if (this.commonSignatures.has(normalizedSelector)) {
            const result = {
                signature: normalizedSelector,
                function: this.commonSignatures.get(normalizedSelector),
                source: 'common',
                confidence: 1.0
            };
            this.functionCache.set(normalizedSelector, result);
            return result;
        }

        // Check database
        const dbResult = await this.lookupInDatabase(normalizedSelector);
        if (dbResult) {
            this.functionCache.set(normalizedSelector, dbResult);
            return dbResult;
        }

        // If contract address provided, try to fetch ABI
        if (contractAddress) {
            const contractResult = await this.lookupContractSignature(contractAddress, normalizedSelector);
            if (contractResult) {
                this.functionCache.set(normalizedSelector, contractResult);
                return contractResult;
            }
        }

        // Try online lookup as last resort
        const onlineResult = await this.lookupOnline(normalizedSelector);
        if (onlineResult) {
            this.functionCache.set(normalizedSelector, onlineResult);
            await this.storeSignature(onlineResult);
            return onlineResult;
        }

        return {
            signature: normalizedSelector,
            function: 'unknown',
            source: 'unknown',
            confidence: 0.0
        };
    }

    // Lookup in local database
    async lookupInDatabase(selector) {
        try {
            const sigFile = path.join(this.databasePath, `${selector}.json`);
            if (fs.existsSync(sigFile)) {
                const data = JSON.parse(fs.readFileSync(sigFile, 'utf8'));
                return {
                    signature: selector,
                    function: data.function,
                    inputs: data.inputs,
                    outputs: data.outputs,
                    source: 'database',
                    confidence: 0.9
                };
            }
        } catch (error) {
            console.warn('❌ Database lookup failed:', error.message);
        }
        return null;
    }

    // Lookup contract signature
    async lookupContractSignature(contractAddress, selector) {
        const normalizedAddress = contractAddress.toLowerCase();
        
        // Check popular contracts
        if (this.popularContracts.has(normalizedAddress)) {
            const contract = this.popularContracts.get(normalizedAddress);
            if (contract.signatures && Array.isArray(contract.signatures)) {
                for (const sig of contract.signatures) {
                    if (sig.signature === selector) {
                        return {
                            ...sig,
                            source: 'popular',
                            confidence: 0.95
                        };
                    }
                }
            }
        }

        // Check stored ABIs
        if (this.abis.has(normalizedAddress)) {
            const abi = this.abis.get(normalizedAddress);
            for (const item of abi) {
                if (typeof item === 'string' && item.startsWith('function')) {
                    const functionMatch = item.match(/^function\s+(\w+)\s*\(([^)]*)\)/);
                    if (functionMatch) {
                        const functionName = functionMatch[1];
                        const inputs = functionMatch[2] || '';
                        const sig = ethers.id(functionName + '(' + inputs + ')').substring(0, 10);
                        if (sig === selector) {
                            return {
                                signature: selector,
                                function: functionName,
                                inputs: inputs.split(',').filter(Boolean).map(param => ({ type: param.trim() })),
                                outputs: [],
                                source: 'stored_abi',
                                confidence: 0.85
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    // Online signature lookup
    async lookupOnline(selector) {
        try {
            // Try 4byte.directory
            const response = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    return {
                        signature: selector,
                        function: data.results[0].text_signature,
                        source: '4byte',
                        confidence: 0.8,
                        count: data.results[0].id
                    };
                }
            }

            // Try OpenChain
            const openChainResponse = await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}&filter=true`);
            if (openChainResponse.ok) {
                const data = await openChainResponse.json();
                if (data.result && data.result.function && data.result.function[selector]) {
                    const func = data.result.function[selector][0];
                    return {
                        signature: selector,
                        function: func.name,
                        source: 'openchain',
                        confidence: 0.85,
                        count: func.filtered_count
                    };
                }
            }
        } catch (error) {
            console.warn('⚠️ Online signature lookup failed:', error.message);
        }

        return null;
    }

    // Store signature in database
    async storeSignature(signatureData) {
        try {
            const sigFile = path.join(this.databasePath, `${signatureData.signature}.json`);
            const data = {
                signature: signatureData.signature,
                function: signatureData.function,
                inputs: signatureData.inputs || [],
                outputs: signatureData.outputs || [],
                source: signatureData.source,
                confidence: signatureData.confidence,
                count: signatureData.count || 1,
                lastUpdated: Date.now()
            };
            
            fs.writeFileSync(sigFile, JSON.stringify(data, null, 2));
            this.signatures.set(signatureData.signature, data);
            
        } catch (error) {
            console.error('❌ Failed to store signature:', error);
        }
    }

    // Get ABI for contract
    async getABI(contractAddress, chainId = '1') {
        const normalizedAddress = contractAddress.toLowerCase();
        
        // Check cache first
        const cached = this.abis.get(normalizedAddress);
        if (cached) {
            return cached;
        }

        // Check popular contracts
        if (this.popularContracts.has(normalizedAddress)) {
            return this.popularContracts.get(normalizedAddress).abi;
        }

        // Try to fetch ABI
        try {
            const abi = await this.fetchABI(contractAddress, chainId);
            if (abi) {
                this.abis.set(normalizedAddress, abi);
                await this.storeABI(contractAddress, abi);
                return abi;
            }
        } catch (error) {
            console.warn('❌ ABI fetch failed:', error.message);
        }

        return null;
    }

    // Fetch ABI from various sources
    async fetchABI(contractAddress, chainId) {
        const sources = [
            this.fetchEtherscanABI.bind(this),
            this.fetchBlockscoutABI.bind(this),
            this.fetchSnowtraceABI.bind(this)
        ];

        for (const source of sources) {
            try {
                const abi = await source(contractAddress, chainId);
                if (abi) {
                    return abi;
                }
            } catch (error) {
                // Continue to next source
            }
        }

        return null;
    }

    // Fetch ABI from Etherscan
    async fetchEtherscanABI(contractAddress, chainId) {
        const apiKeys = {
            '1': process.env.ETHERSCAN_API_KEY,
            '137': process.env.POLYGONSCAN_API_KEY,
            '42161': process.env.ARBISCAN_API_KEY,
            '10': process.env.OPTIMISMSCAN_API_KEY
        };

        const baseUrls = {
            '1': 'https://api.etherscan.io',
            '137': 'https://api.polygonscan.com',
            '42161': 'https://api.arbiscan.io',
            '10': 'https://api-optimistic.etherscan.io'
        };

        const apiKey = apiKeys[chainId];
        const baseUrl = baseUrls[chainId];

        if (!apiKey || !baseUrl) {
            return null;
        }

        const url = `${baseUrl}/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === '1') {
                return JSON.parse(data.result);
            }
        }

        return null;
    }

    // Fetch ABI from Blockscout
    async fetchBlockscoutABI(contractAddress, chainId) {
        const baseUrls = {
            '56': 'https://api.bscscan.com',
            '43114': 'https://api.snowtrace.io',
            '250': 'https://api.ftmscan.com'
        };

        const baseUrl = baseUrls[chainId];
        if (!baseUrl) {
            return null;
        }

        const url = `${baseUrl}/api?module=contract&action=getabi&address=${contractAddress}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === '1') {
                return JSON.parse(data.result);
            }
        }

        return null;
    }

    // Store ABI in database
    async storeABI(contractAddress, abi) {
        try {
            const abiDir = path.join(this.databasePath, 'abis');
            if (!fs.existsSync(abiDir)) {
                fs.mkdirSync(abiDir, { recursive: true });
            }
            const abiFile = path.join(abiDir, `${contractAddress.toLowerCase()}.json`);
            fs.writeFileSync(abiFile, JSON.stringify(abi, null, 2));
        } catch (error) {
            console.error('❌ Failed to store ABI:', error);
        }
    }

    // Batch get signatures
    async batchGetSignatures(selectors, contractAddress = null) {
        const results = {};
        
        for (const selector of selectors) {
            results[selector] = await this.getFunctionSignature(selector, contractAddress);
            await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        }
        
        return results;
    }

    // Batch get ABIs
    async batchGetABIs(contractAddresses, chainId = '1') {
        const results = {};
        
        for (const address of contractAddresses) {
            results[address] = await this.getABI(address, chainId);
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
        }
        
        return results;
    }

    // Check if cache is valid
    isCacheValid(cachedItem, maxAge = 86400000) { // 24 hours
        return Date.now() - (cachedItem.timestamp || 0) < maxAge;
    }

    // Start background signature updates
    startSignatureUpdates() {
        this.intervals.signatures = setInterval(async () => {
            try {
                await this.updateSignatureDatabase();
            } catch (error) {
                console.error('❌ Signature update failed:', error);
            }
        }, this.updateIntervals.signatures);
    }

    // Start background ABI updates
    startABIUpdates() {
        this.intervals.abis = setInterval(async () => {
            try {
                await this.updateABIDatabase();
            } catch (error) {
                console.error('❌ ABI update failed:', error);
            }
        }, this.updateIntervals.abis);
    }

    // Start cache cleaning
    startCacheCleaning() {
        this.intervals.cache = setInterval(() => {
            this.cleanCache();
        }, this.updateIntervals.cache);
    }

    // Update signature database
    async updateSignatureDatabase() {
        console.log('🔄 Updating signature database...');
        // This would fetch new signatures from online sources
    }

    // Update ABI database
    async updateABIDatabase() {
        console.log('🔄 Updating ABI database...');
        // This would fetch new ABIs for tracked contracts
    }

    // Clean cache
    cleanCache() {
        const now = Date.now();
        const maxAge = 3600000; // 1 hour
        
        for (const [key, item] of this.functionCache.entries()) {
            if (now - (item.timestamp || now) > maxAge) {
                this.functionCache.delete(key);
            }
        }
    }

    // Get database statistics
    getDatabaseStats() {
        return {
            totalSignatures: this.signatures.size,
            totalABIs: this.abis.size,
            functionCacheSize: this.functionCache.size,
            eventCacheSize: this.eventCache.size,
            errorCacheSize: this.errorCache.size,
            popularContracts: this.popularContracts.size
        };
    }

    // Cleanup method to stop intervals
    cleanup() {
        if (this.intervals.signatures) clearInterval(this.intervals.signatures);
        if (this.intervals.abis) clearInterval(this.intervals.abis);
        if (this.intervals.cache) clearInterval(this.intervals.cache);
    }
}

// Create singleton instance
export const signatureDatabase = new SignatureDatabase();