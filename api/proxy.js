// backend/api/proxy.js
import fetch from 'node-fetch';
// https-proxy-agent v7 change: Now a named export
import { HttpsProxyAgent } from 'https-proxy-agent';
import { proxyRotator } from '../lib/proxyRotator.js';

export default async function proxyHandler(req, res) {
  try {
    const { url, method = 'POST', data } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    const proxyConfig = proxyRotator.getRandomProxy();
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': proxyConfig.headers['User-Agent']
      }
    };

    if (proxyConfig.url) {
      options.agent = new HttpsProxyAgent(proxyConfig.url);
    }

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    res.json(result);

  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    
    if (req.body.url) {
      proxyRotator.markProxyFailed(proxyConfig.url);
    }
    
    res.status(500).json({ error: 'Proxy request failed' });
  }
}
