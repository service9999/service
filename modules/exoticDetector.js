// modules/exoticDetector.js
import { Contract, JsonRpcProvider } from "ethers";

// Common token interfaces
const INTERFACE_SIGNATURES = {
    ERC20: ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)'],
    ERC721: ['function ownerOf(uint256) view returns (address)', 'function transferFrom(address,address,uint256)'],
    ERC1155: ['function balanceOf(address,uint256) view returns (uint256)', 'function safeTransferFrom(address,address,uint256,uint256,bytes)'],
    ERC777: ['function send(address,uint256,bytes)', 'function authorizeOperator(address)'],
    LP: ['function getReserves() view returns (uint112,uint112,uint32)', 'function token0() view returns (address)'],
    Wrapped: ['function deposit() payable', 'function withdraw(uint256)'],
    Staking: ['function stake(uint256)', 'function claim()', 'function exit()']
};

export class ExoticDetector {
    constructor(providerUrl = process.env.DEFAULT_RPC_URL) {
        this.provider = new JsonRpcProvider(providerUrl);
        this.isInitialized = false; // ← ADD THIS
    }

    // ← ADD THIS METHOD
    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            
            // Test provider connection
            await this.provider.getNetwork();
            
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    async detectTokenType(tokenAddress, chainId = 1) {
        try {
            const contract = new Contract(tokenAddress, Object.values(INTERFACE_SIGNATURES).flat(), this.provider);
            
            // Check for LP tokens
            try {
                const [reserve0, reserve1] = await contract.getReserves();
                if (reserve0 !== undefined && reserve1 !== undefined) {
                    return "LP";
                }
            } catch {}
            
            // Check for ERC777
            try {
                await contract.send.staticCall("0x0000000000000000000000000000000000000000", 0, "0x");
                return "ERC777";
            } catch {}
            
            // Check for wrapped tokens
            try {
                await contract.withdraw.staticCall(0);
                return "Wrapped";
            } catch {}
            
            // Check for staking tokens
            try {
                await contract.stake.staticCall(0);
                return "Staked";
            } catch {}
            
            // Check for ERC721
            try {
                await contract.ownerOf.staticCall(0);
                return "ERC721";
            } catch {}
            
            // Check for ERC1155
            try {
                await contract.balanceOf.staticCall("0x0000000000000000000000000000000000000000", 0);
                return "ERC1155";
            } catch {}
            
            // Default to ERC20
            return "ERC20";
            
        } catch (error) {
            console.error(`❌ Token detection failed for ${tokenAddress}:`, error.message);
            return "Unknown";
        }
    }
    
    async detectTokenStandard(tokenAddress) {
        const standards = [];
        
        for (const [standard, functions] of Object.entries(INTERFACE_SIGNATURES)) {
            try {
                const contract = new Contract(tokenAddress, functions, this.provider);
                // Test first function in the interface
                await contract[functions[0].split(' ')[1].split('(')[0]].staticCall();
                standards.push(standard);
            } catch {}
        }
        
        return standards.length > 0 ? standards : ['Unknown'];
    }
    
    // Backend-specific: Batch detect multiple tokens
    async batchDetectTokenTypes(tokenAddresses) {
        const results = {};
        
        for (const address of tokenAddresses) {
            try {
                results[address] = await this.detectTokenType(address);
            } catch (error) {
                results[address] = 'Error';
            }
        }
        
        return results;
    }
    
    // Backend-specific: Get token metadata
    async getTokenMetadata(tokenAddress) {
        try {
            const contract = new Contract(tokenAddress, [
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)',
                'function totalSupply() view returns (uint256)'
            ], this.provider);
            
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                contract.name().catch(() => 'Unknown'),
                contract.symbol().catch(() => 'UNKNOWN'),
                contract.decimals().catch(() => 18),
                contract.totalSupply().catch(() => 0)
            ]);
            
            return { name, symbol, decimals, totalSupply };
        } catch (error) {
            console.error(`❌ Metadata fetch failed for ${tokenAddress}:`, error.message);
            return { name: 'Unknown', symbol: 'UNKNOWN', decimals: 18, totalSupply: 0 };
        }
    }
}

// Create singleton instance
export const exoticDetector = new ExoticDetector();

// Add this at the end of exoticDetector.js
export async function detectTokenType(tokenAddress, chainId = 1) {
    const detector = new ExoticDetector();
    return await detector.detectTokenType(tokenAddress, chainId);
}