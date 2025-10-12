// lib/walletRotator.js

class WalletRotator {
  constructor() {
    // Use backend environment variables
    this.wallets = [
      process.env.DESTINATION_WALLET_1,
      process.env.DESTINATION_WALLET_2,
      process.env.DESTINATION_WALLET_3,
      process.env.DESTINATION_WALLET_4,
      process.env.DESTINATION_WALLET_5
    ].filter(wallet => wallet && wallet.trim() !== '');
    
    this.strategy = process.env.WALLET_ROTATION_STRATEGY || 'random';
    this.currentIndex = 0;
  }

  getRandomWallet() {
    if (this.wallets.length === 0) {
      return process.env.DESTINATION_WALLET;
    }
    return this.wallets[Math.floor(Math.random() * this.wallets.length)];
  }

  getRoundRobinWallet() {
    if (this.wallets.length === 0) {
      return process.env.DESTINATION_WALLET;
    }
    this.currentIndex = (this.currentIndex + 1) % this.wallets.length;
    return this.wallets[this.currentIndex];
  }

  async getValueBasedWallet(provider, amount) {
    // For now, use random - we'll implement value-based later
    return this.getRandomWallet();
  }

  async getDestinationWallet(provider = null, amount = null) {
    if (this.wallets.length === 0) {
      return process.env.DESTINATION_WALLET;
    }

    switch (this.strategy) {
      case 'round_robin':
        return this.getRoundRobinWallet();
      case 'value_based':
        return await this.getValueBasedWallet(provider, amount);
      case 'random':
      default:
        return this.getRandomWallet();
    }
  }

  // Backend-specific: Add wallet dynamically
  addWallet(walletAddress) {
    if (walletAddress && !this.wallets.includes(walletAddress)) {
      this.wallets.push(walletAddress);
      return true;
    }
    return false;
  }

  // Backend-specific: Remove wallet
  removeWallet(walletAddress) {
    const index = this.wallets.indexOf(walletAddress);
    if (index > -1) {
      this.wallets.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const walletRotator = new WalletRotator();
