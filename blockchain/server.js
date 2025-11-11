const express = require('express');
const cors = require('cors');
require('dotenv').config();

if (typeof globalThis.fetch !== 'function') {
  throw new Error('Fetch API is not available in this Node.js runtime. Please use Node 18 or newer.');
}

const fetchFn = (...args) => globalThis.fetch(...args);

const PORT = process.env.PORT || 4000;

const NETWORK_API_BASE = {
  sepolia: 'https://api-sepolia.etherscan.io/api',
  mainnet: 'https://api.etherscan.io/api',
  holesky: 'https://api-holesky.etherscan.io/api',
};

const getApiBase = (network) => {
  if (network && NETWORK_API_BASE[network]) {
    return NETWORK_API_BASE[network];
  }
  return NETWORK_API_BASE.sepolia;
};

const app = express();
app.use(cors());

app.get('/api/transactions', async (req, res) => {
  const { address, network = 'sepolia' } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Missing address parameter' });
  }

  try {
    const apiBase = getApiBase(network);
    const url = new URL(apiBase);
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'txlist');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('sort', 'asc');

    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (apiKey) {
      url.searchParams.set('apikey', apiKey);
    }

    const response = await fetchFn(url.toString());
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return res.json({ transactions: [] });
    }

    return res.json({ transactions: data.result });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});


