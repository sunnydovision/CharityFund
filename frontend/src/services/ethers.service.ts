import { ethers, BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import { CHARITY_FUND_ABI } from '../constants/contractABI';
import { CONTRACT_ADDRESS } from '../constants/contractAddress';
import { getCurrentNetworkConfig, getNetworkProvider } from '../constants/networkConfig';

// Fallback RPC URLs (add your own API keys if needed)
const RPC_URLS = [
  'https://sepolia.infura.io/v3/f75184c15a1146ea88a13275ad4056b3',
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia-rpc.publicnode.com'
];

// Simple round-robin provider selection
let currentProviderIndex = 0;
const getNextRpcUrl = (): string => {
  const url = RPC_URLS[currentProviderIndex];
  currentProviderIndex = (currentProviderIndex + 1) % RPC_URLS.length;
  return url;
};

// Cache for contract instances
const contractCache = new Map<string, ethers.Contract>();

// Get provider with fallback
const getFallbackProvider = (): ethers.JsonRpcProvider => {
  const rpcUrl = getNextRpcUrl();
  console.log(`Using RPC URL: ${rpcUrl}`);
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get provider
export const getProvider = (): BrowserProvider | ethers.JsonRpcProvider => {
  // First try browser provider (MetaMask)
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      return new ethers.BrowserProvider(window.ethereum);
    } catch (error) {
      console.warn('Failed to create BrowserProvider, falling back to JsonRpcProvider', error);
    }
  }
  
  // Fall back to direct RPC
  return getFallbackProvider();
};

// Get signer
export const getSigner = async (): Promise<JsonRpcSigner | null> => {
  try {
    const provider = getProvider();
    // If we're using a JsonRpcProvider (not BrowserProvider), we can't get a signer
    if (!(provider instanceof ethers.BrowserProvider)) {
      console.warn('Cannot get signer: Not using a browser provider');
      return null;
    }
    
    const signer = await provider.getSigner();
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
};

// Get contract instance with caching
export const getContract = (): Contract | null => {
  if (!CONTRACT_ADDRESS) return null;
  
  // Check cache first
  const cachedContract = contractCache.get(CONTRACT_ADDRESS);
  if (cachedContract) {
    return cachedContract;
  }
  
  const provider = getProvider();
  if (!provider) return null;
  
  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CHARITY_FUND_ABI, provider);
    contractCache.set(CONTRACT_ADDRESS, contract);
    return contract;
  } catch (error) {
    console.error('Error creating contract instance:', error);
    return null;
  }
};

// Get contract instance with signer (for write operations)
export const getContractWithSigner = async (): Promise<Contract | null> => {
  const signer = await getSigner();
  if (!signer || !CONTRACT_ADDRESS) return null;
  
  return new ethers.Contract(CONTRACT_ADDRESS, CHARITY_FUND_ABI, signer);
};

// Connect wallet (MetaMask)
export const connectWallet = async (): Promise<{
  address: string;
  balance: string;
  chainId: number;
} | null> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    const provider = getProvider();
    if (!provider) return null;

    // Request account access
    await provider.send('eth_requestAccounts', []);
    
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const network = await provider.getNetwork();

    return {
      address,
      balance: ethers.formatEther(balance),
      chainId: Number(network.chainId),
    };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Connect Safe wallet
export const connectSafeWallet = async (): Promise<{
  address: string;
  balance: string;
  chainId: number;
} | null> => {
  try {
    // Check if Safe is available
    if (!window.ethereum) {
      throw new Error('No wallet provider found');
    }

    // Safe wallets typically use the same EIP-1193 interface
    // For Safe, we check if it's a Safe wallet by looking for specific properties
    const provider = getProvider();
    if (!provider) return null;

    // Request account access
    await provider.send('eth_requestAccounts', []);
    
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    const network = await provider.getNetwork();

    return {
      address,
      balance: ethers.formatEther(balance),
      chainId: Number(network.chainId),
    };
  } catch (error) {
    console.error('Error connecting Safe wallet:', error);
    throw error;
  }
};

// Switch network
export const switchNetwork = async (chainId: number): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: any) {
    // If network doesn't exist, add it
    if (error.code === 4902) {
      const networkConfig = getCurrentNetworkConfig();
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: networkConfig.name,
            nativeCurrency: networkConfig.nativeCurrency,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : [],
          },
        ],
      });
    } else {
      throw error;
    }
  }
};

// Donate ETH
export const donateETH = async (amount: string): Promise<string> => {
  const signer = await getSigner();
  if (!signer || !CONTRACT_ADDRESS) {
    throw new Error('Wallet not connected or contract address not set');
  }

  try {
    const tx = await signer.sendTransaction({
      to: CONTRACT_ADDRESS,
      value: ethers.parseEther(amount),
    });

    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Error donating ETH:', error);
    throw error;
  }
};

// Get contract balance with retry logic
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError || new Error('Max retries reached');
};

// Get contract balance
export const getContractBalance = async (): Promise<string> => {
  return withRetry(async () => {
    const contract = getContract();
    if (!contract) {
      console.error('getContractBalance: No contract instance available');
      return '0';
    }

    try {
      console.log('getContractBalance: Getting balance for contract at', contract.target);
      const balance = await contract.getBalance();
      console.log('getContractBalance: Raw balance from contract:', balance.toString());
      const formattedBalance = ethers.formatEther(balance);
      console.log('getContractBalance: Formatted balance:', formattedBalance, 'ETH');
      return formattedBalance;
    } catch (error) {
      console.error('Error in getContractBalance:', error);
      
      // Fallback to direct ETH balance check
      try {
        console.log('getContractBalance: Falling back to direct ETH balance check');
        const provider = getProvider();
        if (provider && contract.target) {
          const ethBalance = await provider.getBalance(contract.target.toString());
          const formattedEthBalance = ethers.formatEther(ethBalance);
          console.log('getContractBalance: Fallback ETH balance:', formattedEthBalance, 'ETH');
          return formattedEthBalance;
        }
      } catch (fallbackError) {
        console.error('Fallback balance check failed:', fallbackError);
      }
      
      throw error; // Re-throw to trigger retry
    }
  }).catch(() => '0'); // Return '0' if all retries fail
};

// Direct ETH balance check
export const getEthBalance = async (address: string): Promise<string> => {
  try {
    const provider = getProvider();
    if (!provider) {
      console.error('getEthBalance: No provider available');
      return '0';
    }
    console.log(`getEthBalance: Getting ETH balance for ${address}`);
    const balance = await provider.getBalance(address);
    const formattedBalance = ethers.formatEther(balance);
    console.log(`getEthBalance: Balance for ${address}:`, formattedBalance, 'ETH');
    return formattedBalance;
  } catch (error) {
    console.error('Error in getEthBalance:', error);
    return '0';
  }
};

// Check if above threshold
export const isAboveThreshold = async (): Promise<boolean> => {
  const contract = getContract();
  if (!contract) return false;

  try {
    return await contract.isAboveThreshold();
  } catch (error) {
    console.error('Error checking threshold:', error);
    return false;
  }
};


// NEW: amountEth is a string like "0.005"
export async function manualTransferToSafe(amountEth: string): Promise<string> {
  const contract = getContract();
  if (!contract) return '';

  // Validate & convert ETH → wei (BigInt)
  const amountWei = ethers.parseEther(amountEth); // throws if invalid
  if (amountWei <= 0n) throw new Error('Amount must be greater than 0');

  // Your Solidity now expects the raw wei amount (no * 1 ether inside)
  const tx = await contract.manualTransferToSafe(amountWei);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

// Declare ethereum type for window
declare global {
  interface Window {
    ethereum?: any;
  }
}
