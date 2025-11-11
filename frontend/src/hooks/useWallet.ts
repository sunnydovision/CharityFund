import { useCallback, useEffect } from 'react';
import { useWalletStore } from '../store/walletStore';
import { connectWallet, getProvider, switchNetwork } from '../services/ethers.service';
import { getCurrentNetworkConfig } from '../constants/networkConfig';

export const useWallet = () => {
  const {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    error,
    setWallet,
    setConnecting,
    setError,
    disconnect,
    updateBalance,
  } = useWalletStore();

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const walletInfo = await connectWallet();
      if (walletInfo) {
        setWallet(walletInfo.address, walletInfo.balance, walletInfo.chainId);
        
        // Check if on correct network
        const expectedChainId = getCurrentNetworkConfig().chainId;
        if (walletInfo.chainId !== expectedChainId) {
          await switchNetwork(expectedChainId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      disconnect();
    }
  }, [setWallet, setConnecting, setError, disconnect]);

  const switchToCorrectNetwork = useCallback(async () => {
    try {
      const expectedChainId = getCurrentNetworkConfig().chainId;
      await switchNetwork(expectedChainId);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
    }
  }, [setError]);

  const refreshBalance = useCallback(async () => {
    if (!address) return;

    try {
      const provider = getProvider();
      if (provider) {
        const balance = await provider.getBalance(address);
        const { ethers } = await import('ethers');
        updateBalance(ethers.formatEther(balance));
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  }, [address, updateBalance]);

  // Listen for account changes and refresh balance periodically
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          // Reconnect with new account
          connect();
        }
      };

      const handleChainChanged = () => {
        // Reload page on chain change (recommended by MetaMask)
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [connect, disconnect]);

  // Auto-refresh balance every 3 seconds when connected
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      refreshBalance();
    }, 3000);

    return () => clearInterval(interval);
  }, [isConnected, address, refreshBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum && !isConnected) {
        try {
          const provider = getProvider();
          if (provider) {
            const accounts = await provider.send('eth_accounts', []);
            if (accounts.length > 0) {
              await connect();
            }
          }
        } catch (err) {
          console.error('Auto-connect failed:', err);
        }
      }
    };

    autoConnect();
  }, []);

  return {
    address,
    balance,
    chainId,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToCorrectNetwork,
    refreshBalance,
  };
};
