// lib/pricing.js
import fetch from 'node-fetch';

export async function fetchETHPrice() {
    try {
        const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
        const res = await fetch(url);
        const data = await res.json();
        return data.ethereum.usd;
    } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        return 0;
    }
}

export async function fetchTokenPrices(tokenAddresses = []) {
    if (!tokenAddresses.length) return {};

    try {
        const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenAddresses.join(',')}&vs_currencies=usd`;
        const res = await fetch(url);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error('Failed to fetch token prices:', error);
        return {};
    }
}

// Additional pricing utilities for backend
export async function fetchGasPrice(chainId) {
    try {
        // Use backend RPC URLs from environment
        const rpcUrl = process.env[`${chainId.toUpperCase()}_RPC_URL`] || process.env.ETHEREUM_RPC_URL;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const gasPrice = await provider.getFeeData();
        return gasPrice;
    } catch (error) {
        console.error('Failed to fetch gas price:', error);
        return null;
    }
}
