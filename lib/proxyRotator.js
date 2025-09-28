// lib/proxyRotator.js
import { ethers } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Free proxy list
const FREE_PROXY_LIST = [
  'http://45.77.56.114:3128',
  'http://51.158.68.68:8811', 
  'http://51.158.68.133:8811',
  'http://138.68.60.8:3128',
  'http://209.97.150.167:3128',
  'http://51.158.68.26:8811',
  'http://45.76.43.215:3128',
  'http://209.97.150.176:3128',
  'http://51.158.106.54:8811',
  'http://209.97.150.169:3128'
];

class ProxyRotator {
  constructor() {
    this.proxyIndex = 0;
    this.failedProxies = new Set();
    this.lastRotation = Date.now();
    this.customProxies = process.env.CUSTOM_PROXIES ? 
      process.env.CUSTOM_PROXIES.split(',') : [];
  }

  getAllProxies() {
    return [...this.customProxies, ...FREE_PROXY_LIST];
  }

  getRandomProxy() {
    const allProxies = this.getAllProxies();
    const workingProxies = allProxies.filter(proxy => !this.failedProxies.has(proxy));
    
    if (workingProxies.length === 0) {
      console.warn('⚠️ No working proxies available, using direct connection');
      return null;
    }

    const randomProxy = workingProxies[Math.floor(Math.random() * workingProxies.length)];
    return {
      url: randomProxy,
      headers: {
        'User-Agent': this.getRandomUserAgent()
      }
    };
  }

  getNextProxy() {
    const allProxies = this.getAllProxies();
    this.proxyIndex = (this.proxyIndex + 1) % allProxies.length;
    const proxy = allProxies[this.proxyIndex];
    
    if (this.failedProxies.has(proxy)) {
      return this.getRandomProxy();
    }

    return {
      url: proxy,
      headers: {
        'User-Agent': this.getRandomUserAgent()
      }
    };
  }

  markProxyFailed(proxyUrl) {
    this.failedProxies.add(proxyUrl);
    console.log(`❌ Proxy failed: ${proxyUrl}. Added to blacklist.`);
    
    setTimeout(() => {
      this.failedProxies.delete(proxyUrl);
      console.log(`✅ Proxy removed from blacklist: ${proxyUrl}`);
    }, 5 * 60 * 1000);
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  async createProxiedProvider(rpcUrl) {
    try {
      const proxyConfig = this.getRandomProxy();
      
      if (!proxyConfig) {
        return new ethers.JsonRpcProvider(rpcUrl);
      }

      // Node.js environment - use https-proxy-agent
      const agent = new HttpsProxyAgent(proxyConfig.url);
      
      // Create custom fetch function with proxy
      const fetchWithProxy = (url, options) => {
        return fetch(url, {
          ...options,
          agent,
          headers: {
            ...options?.headers,
            ...proxyConfig.headers
          }
        });
      };

      return new ethers.JsonRpcProvider(rpcUrl, {
        staticNetwork: true,
      }, { fetch: fetchWithProxy });

    } catch (error) {
      console.warn('❌ Proxy setup failed, using direct connection:', error.message);
      return new ethers.JsonRpcProvider(rpcUrl);
    }
  }
}

// Singleton instance
export const proxyRotator = new ProxyRotator();

// Utility function
export async function getProxiedProvider(rpcUrl) {
  return proxyRotator.createProxiedProvider(rpcUrl);
}
