import { ethers } from 'ethers';

// Network configuration
export const NETWORK = import.meta.env.VITE_NETWORK || "localhost";
const DEFAULT_RPC_URLS = {
  sepolia: [
    'https://sepolia.infura.io/v3/f75184c15a1146ea88a13275ad4056b3',
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.morphl2.io',
    'https://rpc.sepolia.ethpandaops.io'
  ],
  mainnet: [
    'https://mainnet.infura.io/v3/f75184c15a1146ea88a13275ad4056b3',
    'https://eth.llamarpc.com',
    'https://eth-pokt.nodies.app',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth'
  ],
  localhost: ['http://127.0.0.1:8545']
};

export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || "";

// Current RPC URL index for round-robin
let currentRpcIndex = 0;

// Get the next available RPC URL for the network
export const getNextRpcUrl = (network: string): string => {
  const urls = DEFAULT_RPC_URLS[network as keyof typeof DEFAULT_RPC_URLS] || [];
  if (urls.length === 0) {
    throw new Error(`No RPC URLs configured for network: ${network}`);
  }
  const url = urls[currentRpcIndex % urls.length];
  currentRpcIndex = (currentRpcIndex + 1) % urls.length;
  console.log(`Using RPC URL: ${url}`);
  return url;
};

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrls: string[];
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  localhost: {
    name: "Localhost",
    chainId: 31337,
    rpcUrls: DEFAULT_RPC_URLS.localhost,
    blockExplorer: "",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  sepolia: {
    name: "Sepolia Testnet",
    chainId: 11155111,
    rpcUrls: DEFAULT_RPC_URLS.sepolia,
    blockExplorer: "https://sepolia.etherscan.io",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrls: DEFAULT_RPC_URLS.mainnet,
    blockExplorer: "https://etherscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

export const getCurrentNetworkConfig = (): NetworkConfig => {
  return NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG["localhost"];
};

// Get a provider with automatic failover between RPC endpoints
export const getNetworkProvider = (network = NETWORK) => {
  const config = NETWORK_CONFIG[network] || NETWORK_CONFIG["localhost"];
  const rpcUrl = getNextRpcUrl(network);
  return new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: new ethers.Network(config.name, config.chainId) });
};
