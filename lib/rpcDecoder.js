// lib/rpcDecoder.js
export function decodeRPC(encodedRpc) {
    try {
        return Buffer.from(encodedRpc, 'base64').toString('utf-8');
    } catch (error) {
        console.error('❌ RPC decoding failed:', error.message);
        return null;
    }
}

export function rotateRPC(rpcList) {
    if (!rpcList || rpcList.length === 0) return null;
    
    // Decode all RPC URLs
    const decodedRpcs = rpcList.map(encoded => decodeRPC(encoded)).filter(rpc => rpc !== null);
    
    if (decodedRpcs.length === 0) {
        throw new Error('No valid RPC URLs after decoding');
    }
    
    // Return a random RPC for load balancing
    const randomIndex = Math.floor(Math.random() * decodedRpcs.length);
    return decodedRpcs[randomIndex];
}

// Backend-specific RPC management
export function getRpcUrlForChain(chainId) {
    const chainRpcs = {
        '1': process.env.ETHEREUM_RPC_URL,
        '56': process.env.BSC_RPC_URL,
        '137': process.env.POLYGON_RPC_URL,
        '42161': process.env.ARBITRUM_RPC_URL,
        '10': process.env.OPTIMISM_RPC_URL,
        '43114': process.env.AVALANCHE_RPC_URL
    };
    
    return chainRpcs[chainId] || process.env.DEFAULT_RPC_URL;
}
