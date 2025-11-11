import { ethers, BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import { CHARITY_FUND_ABI } from '../constants/contractABI';
import { CONTRACT_ADDRESS } from '../constants/contractAddress';
import { getCurrentNetworkConfig, getNetworkProvider } from '../constants/networkConfig';

// Lazy load Safe SDK to avoid Vite optimization issues
type SafeAppsSDK = any;
type SafeAppProvider = any;

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

// Safe Wallet SDK instance
let safeSdk: SafeAppsSDK | null = null;
let safeProvider: SafeAppProvider | null = null;
let safeEthersProvider: BrowserProvider | null = null;
let safeInfo: any = null;
let isSafeWallet = false;

// Initialize Safe SDK - chỉ khởi tạo khi cần (trong iframe)
// Safe sẽ kiểm tra xem app có khởi tạo SDK hay không khi app được load trong iframe
let safeSDKInitialized = false;

const initializeSafeSDK = async () => {
  if (safeSDKInitialized && safeSdk) return;

  // Kiểm tra xem có global Safe SDK không (từ index.html hoặc main.tsx)
  if (typeof window !== 'undefined') {
    const globalSDK = (window as any).__SAFE_APP_SDK__ || (window as any).safeSDK;
    if (globalSDK) {
      // Sử dụng global SDK nếu có
      safeSdk = globalSDK;
      safeSDKInitialized = true;
      console.log('Using global Safe SDK from window');
      return;
    }
  }

  // Chỉ khởi tạo nếu đang trong iframe (Safe Wallet)
  if (typeof window === 'undefined' || window.self === window.top) {
    return;
  }

  try {
    // Lazy load Safe SDK với dynamic import
    const SafeAppsSDKModule = await import('@safe-global/safe-apps-sdk');
    const SafeAppsSDK = SafeAppsSDKModule.default || SafeAppsSDKModule;

    // Khởi tạo SDK - Safe sẽ detect điều này
    // Không cần options, SDK sẽ tự động detect môi trường
    safeSdk = new SafeAppsSDK();
    safeSDKInitialized = true;

    console.log('Safe Apps SDK initialized');
  } catch (e: any) {
    // Log lỗi nhưng không throw - app vẫn có thể chạy không có Safe
    console.log('Failed to initialize Safe SDK (this is OK if not in Safe Wallet):', e?.message || e);
    safeSDKInitialized = false;
  }
};

// Get Safe Ethers Provider - Handshake với Safe
export const getSafeEthersProvider = async (): Promise<{
  appsSdk: SafeAppsSDK;
  safeInfo: any;
  ethersProvider: BrowserProvider;
  signer: JsonRpcSigner;
} | null> => {
  // Chỉ thử kết nối nếu đang trong iframe
  if (typeof window === 'undefined' || window.self === window.top) {
    return null;
  }

  // Đảm bảo SDK đã được khởi tạo
  await initializeSafeSDK();

  if (!safeSdk) {
    return null;
  }

  try {
    // Gọi SDK để Safe kiểm tra handshake
    // Method có thể là getInfo() hoặc getSafeInfo() tùy version
    let safe: any;
    try {
      safe = await safeSdk.safe.getInfo();
    } catch (e) {
      // Thử method khác nếu getInfo() không tồn tại
      try {
        safe = await (safeSdk.safe as any).getSafeInfo();
      } catch (e2) {
        console.log('Cannot get Safe info:', e2);
        return null;
      }
    }
    
    if (!safe || !safe.safeAddress) {
      return null;
    }

    // Lazy load Safe App Provider
    const SafeAppProviderModule = await import('@safe-global/safe-apps-provider');
    const SafeAppProvider = SafeAppProviderModule.SafeAppProvider || SafeAppProviderModule.default;

    // Tạo provider "đúng chuẩn Safe App"
    const safeProviderInstance = new SafeAppProvider(safe, safeSdk);
    const ethersProvider = new ethers.BrowserProvider(safeProviderInstance as any);
    const signer = await ethersProvider.getSigner();

    // Cache các instances
    safeProvider = safeProviderInstance;
    safeInfo = safe;
    safeEthersProvider = ethersProvider;
    isSafeWallet = true;

    console.log('Safe Wallet handshake successful:', safe.safeAddress);
    
    return { appsSdk: safeSdk, safeInfo: safe, ethersProvider, signer };
  } catch (e) {
    // Nếu getInfo() fail, tức là không nằm trong Safe App hoặc chưa được phép
    console.log('Safe Wallet handshake failed:', e);
    return null;
  }
};

// Check if we're running inside Safe Wallet iframe
const isInSafeWalletIframe = (): boolean => {
  try {
    // Check if we're in an iframe
    if (window.self !== window.top) {
      // Try to get parent origin
      try {
        const parentOrigin = window.location.ancestorOrigins?.[0] || 
                            (document.referrer ? new URL(document.referrer).origin : '');
        if (parentOrigin && (parentOrigin.includes('safe.global') || parentOrigin.includes('app.safe.global'))) {
          return true;
        }
      } catch (e) {
        // Cross-origin check failed, but we're in an iframe
        // Assume it's Safe Wallet if we're in an iframe
        console.log('Cannot check parent origin (cross-origin), assuming Safe Wallet iframe');
        return true;
      }
      
      // If we're in an iframe but can't determine parent, check referrer
      if (document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          if (referrerUrl.hostname.includes('safe.global') || referrerUrl.hostname.includes('app.safe.global')) {
            return true;
          }
        } catch (e) {
          // Invalid referrer URL
        }
      }
      
      // If we're in an iframe, it's likely Safe Wallet
      return true;
    }
    return false;
  } catch (error) {
    // Cross-origin check might fail, but that's okay
    return false;
  }
};

// Initialize Safe Wallet SDK
const initSafeSDK = async (retryCount = 0): Promise<boolean> => {
  try {
    // Check if we're in Safe Wallet iframe first
    const inSafeIframe = isInSafeWalletIframe();
    
    // Lazy load Safe SDK to avoid Vite optimization issues
    const SafeAppsSDKModule = await import('@safe-global/safe-apps-sdk');
    const SafeAppProviderModule = await import('@safe-global/safe-apps-provider');
    const SafeAppsSDK = SafeAppsSDKModule.default || SafeAppsSDKModule;
    const SafeAppProvider = SafeAppProviderModule.SafeAppProvider || SafeAppProviderModule.default;
    
    // Check if we're running inside Safe Wallet interface
    // Allow localhost for development
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
    
    // For Safe Wallet, we need to allow all domains when in iframe
    const opts: any = {
      allowedDomains: isLocalhost 
        ? [/.*/] // Allow all domains in development
        : [/app\.safe\.global$/, /safe\.global$/],
      debug: isLocalhost,
    };
    
    safeSdk = new SafeAppsSDK(opts);
    
    // Wait a bit for Safe Wallet to be ready
    if (retryCount === 0 && inSafeIframe) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Try to get Safe info - this will only work if running inside Safe Wallet
    const safe = await safeSdk.safe.getSafeInfo();
    
    if (safe && safe.safeAddress) {
      // We're inside Safe Wallet interface
      safeProvider = new SafeAppProvider(safe, safeSdk);
      isSafeWallet = true;
      console.log('Connected to Safe Wallet:', safe.safeAddress);
      return true;
    }
    
    // Retry once if in iframe and first attempt failed
    if (inSafeIframe && retryCount === 0) {
      console.log('Retrying Safe Wallet connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initSafeSDK(1);
    }
    
    return false;
  } catch (error: any) {
    // Not running inside Safe Wallet interface
    console.log('Not running inside Safe Wallet interface:', error?.message || error);
    
    // Retry once if in iframe and first attempt failed
    if (isInSafeWalletIframe() && retryCount === 0) {
      console.log('Retrying Safe Wallet connection after error...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initSafeSDK(1);
    }
    
    isSafeWallet = false;
    return false;
  }
};

// Thử handshake ngay khi app load nếu trong iframe
// Điều này giúp Safe detect app hỗ trợ Safe App functionality
// Note: SDK đã được khởi tạo trong main.tsx, chỉ cần thử handshake ở đây
if (typeof window !== 'undefined') {
  // Thử handshake nếu đang trong iframe
  if (window.self !== window.top) {
    // Đợi một chút để Safe sẵn sàng
    setTimeout(() => {
      getSafeEthersProvider().catch((error) => {
        // Silently fail - app có thể không chạy trong Safe
        console.log('Safe Wallet handshake on load failed (this is OK if not in Safe):', error);
      });
    }, 500);
  }
}

// Get provider with fallback
const getFallbackProvider = (): ethers.JsonRpcProvider => {
  const rpcUrl = getNextRpcUrl();
  console.log(`Using RPC URL: ${rpcUrl}`);
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get provider
export const getProvider = (): BrowserProvider | ethers.JsonRpcProvider => {
  // First try Safe Wallet provider if connected
  if (isSafeWallet && safeEthersProvider) {
    return safeEthersProvider;
  }
  
  // Then try browser provider (MetaMask)
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
    // If we're connected to Safe Wallet, use Safe signer
    if (isSafeWallet && safeEthersProvider) {
      return await safeEthersProvider.getSigner();
    }
    
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

// Get Safe Wallet address if connected
export const getSafeAddress = async (): Promise<string | null> => {
  if (isSafeWallet && safeSdk) {
    try {
      const safeInfo = await safeSdk.safe.getSafeInfo();
      return safeInfo.safeAddress;
    } catch (error) {
      console.error('Error getting Safe address:', error);
      return null;
    }
  }
  return null;
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
    // Kiểm tra xem đang trong Safe Wallet iframe không
    const inIframe = window.self !== window.top;
    
    if (!inIframe) {
      // Không trong iframe - hướng dẫn user mở trong Safe Wallet
      const currentUrl = window.location.href;
      const safeUrl = `https://app.safe.global/apps?appUrl=${encodeURIComponent(currentUrl)}`;
      
      const newWindow = window.open(safeUrl, '_blank');
      
      if (!newWindow) {
        throw new Error(
          'Vui lòng mở ứng dụng từ giao diện Safe Wallet (https://app.safe.global/). ' +
          'Pop-up blocker có thể đang chặn cửa sổ Safe Wallet. ' +
          'Vui lòng truy cập thủ công: ' + safeUrl
        );
      }
      
      throw new Error(
        'Để kết nối Safe Wallet:\n' +
        '1. Một cửa sổ Safe Wallet đã được mở\n' +
        '2. Trong Safe Wallet, tìm app "Charity Fund DApp" và nhấn vào nó\n' +
        '3. App sẽ tự động kết nối hoặc nhấn "Connect Safe Wallet" lại\n\n' +
        'Hoặc truy cập: https://app.safe.global/ và mở app từ danh sách "My custom apps".'
      );
    }

    // Đang trong iframe - thử handshake với Safe
    console.log('🔗 Attempting to connect to Safe Wallet (in iframe)...');
    
    // Đợi một chút để Safe Wallet sẵn sàng
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const safeProviderResult = await getSafeEthersProvider();
    
    if (safeProviderResult) {
      const { safeInfo: safe, ethersProvider } = safeProviderResult;
      
      const address = safe.safeAddress;
      const balance = await ethersProvider.getBalance(address);
      const network = await ethersProvider.getNetwork();

      console.log('✅ Successfully connected to Safe Wallet:', address);
      
      return {
        address,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
      };
    } else {
      // Retry một lần nữa sau khi đợi thêm
      console.log('⏳ Retrying Safe Wallet connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const retryResult = await getSafeEthersProvider();
      if (retryResult) {
        const { safeInfo: safe, ethersProvider } = retryResult;
        const address = safe.safeAddress;
        const balance = await ethersProvider.getBalance(address);
        const network = await ethersProvider.getNetwork();

        return {
          address,
          balance: ethers.formatEther(balance),
          chainId: Number(network.chainId),
        };
      }
      
      throw new Error(
        'Không thể kết nối với Safe Wallet. ' +
        'Vui lòng đảm bảo bạn đã nhấn "Use the App with your Safe Account" trong giao diện Safe Wallet. ' +
        'Nếu vẫn không được, hãy refresh trang.'
      );
    }
  } catch (error: any) {
    console.error('Error connecting Safe wallet:', error);
    throw error;
  }
};

// Check if currently connected to Safe Wallet
export const isConnectedToSafe = (): boolean => {
  // Nếu đã set isSafeWallet = true, return true
  if (isSafeWallet) {
    return true;
  }
  
  // Nếu đang trong iframe, có thể đang dùng Safe Wallet
  if (typeof window !== 'undefined' && window.self !== window.top) {
    // Đang trong iframe - có thể là Safe Wallet
    // Nếu có safeSdk và safeInfo, chắc chắn là Safe Wallet
    if (safeSdk && safeInfo) {
      return true;
    }
    
    // Nếu có safeSdk (đã được initialize), có thể đang trong Safe Wallet
    // Safe SDK chỉ được initialize khi app được load trong Safe Wallet iframe
    if (safeSdk) {
      // Có Safe SDK - có thể đang trong Safe Wallet
      // Nhưng chưa có safeInfo, có thể chưa handshake thành công
      // Tuy nhiên, nếu đang trong iframe và có SDK, có thể coi như Safe Wallet
      // Vì Safe SDK chỉ được khởi tạo khi trong Safe Wallet environment
      return true;
    }
    
    // Nếu đang trong iframe nhưng chưa có SDK, check xem có global SDK không
    // (từ index.html hoặc main.tsx)
    if ((window as any).__SAFE_APP_SDK__ || (window as any).safeSDK) {
      // Có global Safe SDK - đang trong Safe Wallet environment
      return true;
    }
    
    // Nếu đang trong iframe và URL có chứa "safe.global", có thể là Safe Wallet
    try {
      const parentUrl = document.referrer || window.location.href;
      if (parentUrl.includes('safe.global') || parentUrl.includes('app.safe.global')) {
        // Đang trong Safe Wallet iframe
        return true;
      }
    } catch (e) {
      // Cross-origin check có thể fail, nhưng đó là OK
    }
  }
  
  return false;
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
// Function này lấy tiền TỪ contract và gửi TỚI Safe address
export async function manualTransferToSafe(amountEth: string): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set');
  }

  // Validate & convert ETH → wei (BigInt)
  const amountWei = ethers.parseEther(amountEth); // throws if invalid
  if (amountWei <= 0n) throw new Error('Amount must be greater than 0');

  // QUAN TRỌNG: Nếu đang dùng Safe Wallet, cần dùng Safe SDK txs API
  // Vì Safe App Provider không hỗ trợ sendTransaction trực tiếp
  if (isSafeWallet && safeSdk) {
    try {
      console.log('🔷 Using Safe Wallet SDK to create transaction proposal...');
      console.log('📞 Will call contract.manualTransferToSafe() to transfer funds FROM contract TO Safe');
      console.log(`💰 Amount: ${amountEth} ETH (${amountWei.toString()} wei)`);
      
      // Dùng Safe SDK txs API để tạo transaction proposal
      // Transaction này sẽ gọi contract.manualTransferToSafe(amountWei) từ Safe address
      // Function này sẽ transfer tiền TỪ contract TỚI Safe address (đã được set trong contract)
      
      // Encode function call data: manualTransferToSafe(uint256 amount)
      const contractInterface = new ethers.Interface(CHARITY_FUND_ABI);
      const data = contractInterface.encodeFunctionData('manualTransferToSafe', [amountWei]);
      
      console.log('📝 Encoded function data:', data);
      console.log('🎯 Target contract:', CONTRACT_ADDRESS);
      
      // Tạo transaction proposal qua Safe SDK
      // Transaction này sẽ được gửi từ Safe address và gọi contract.manualTransferToSafe()
      const safeTransaction = await safeSdk.txs.send({
        txs: [
          {
            to: CONTRACT_ADDRESS, // Gọi function trên contract này
            value: '0', // Không gửi ETH, chỉ gọi function
            data: data, // Encoded function call: manualTransferToSafe(amountWei)
          },
        ],
      });
      
      console.log('✅ Safe transaction proposed successfully!');
      console.log('📋 Safe TX Hash:', safeTransaction.safeTxHash);
      console.log('ℹ️ Transaction cần approval từ Safe owners trước khi execute');
      console.log('ℹ️ Sau khi execute, contract sẽ transfer tiền TỪ contract TỚI Safe address');
      
      // Với Safe Wallet, transaction sẽ được propose và cần approval từ owners
      // Trả về safeTxHash - user có thể track transaction trong Safe Wallet
      return safeTransaction.safeTxHash;
    } catch (error: any) {
      console.error('❌ Error creating Safe transaction proposal:', error);
      throw new Error(`Failed to create Safe transaction proposal: ${error?.message || error}`);
    }
  }

  // Nếu không dùng Safe Wallet, dùng cách thông thường
  // Lấy contract với signer để gọi function
  const contractWithSigner = await getContractWithSigner();
  if (!contractWithSigner) {
    throw new Error('Cannot get contract with signer. Please connect your wallet.');
  }

  try {
    console.log('🔷 Calling contract.manualTransferToSafe() from regular wallet...');
    console.log(`💰 Amount: ${amountEth} ETH (${amountWei.toString()} wei)`);
    console.log('📞 Function: manualTransferToSafe(uint256 amount)');
    console.log('🎯 This will transfer funds FROM contract TO Safe address');
    
    // Gọi function từ contract - function này sẽ transfer tiền TỪ contract TỚI Safe
    const tx = await contractWithSigner.manualTransferToSafe(amountWei);
    console.log('✅ Transaction sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.hash);
    console.log('✅ Funds have been transferred FROM contract TO Safe address');
    
    return receipt?.hash ?? tx.hash;
  } catch (error: any) {
    console.error('❌ Error sending transaction:', error);
    throw new Error(`Failed to send transaction: ${error?.message || error}`);
  }
}

// Declare ethereum type for window
declare global {
  interface Window {
    ethereum?: any;
  }
}
