// Network configuration
export const NETWORK = import.meta.env.VITE_NETWORK || "localhost";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";
export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || "";

export const NETWORK_CONFIG: Record<string, {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}> = {
  localhost: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
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
    rpcUrl: RPC_URL,
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
    rpcUrl: RPC_URL,
    blockExplorer: "https://etherscan.io",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

export const getCurrentNetworkConfig = () => {
  return NETWORK_CONFIG[NETWORK] || NETWORK_CONFIG.localhost;
};
