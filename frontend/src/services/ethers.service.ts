import { ethers, BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import { CHARITY_FUND_ABI } from '../constants/contractABI';
import { CONTRACT_ADDRESS } from '../constants/contractAddress';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

// Get provider
export const getProvider = (): BrowserProvider | null => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

// Get signer
export const getSigner = async (): Promise<JsonRpcSigner | null> => {
  const provider = getProvider();
  if (!provider) return null;
  
  try {
    const signer = await provider.getSigner();
    return signer;
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
};

// Get contract instance (read-only)
export const getContract = (): Contract | null => {
  const provider = getProvider();
  if (!provider || !CONTRACT_ADDRESS) return null;
  
  return new ethers.Contract(CONTRACT_ADDRESS, CHARITY_FUND_ABI, provider);
};

// Get contract instance with signer (for write operations)
export const getContractWithSigner = async (): Promise<Contract | null> => {
  const signer = await getSigner();
  if (!signer || !CONTRACT_ADDRESS) return null;
  
  return new ethers.Contract(CONTRACT_ADDRESS, CHARITY_FUND_ABI, signer);
};

// Connect wallet
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

// Get contract balance
export const getContractBalance = async (): Promise<string> => {
  const contract = getContract();
  if (!contract) return '0';

  try {
    const balance = await contract.getBalance();
    return ethers.formatEther(balance);
  } catch (error) {
    console.error('Error getting contract balance:', error);
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
