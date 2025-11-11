import { create } from 'zustand';

interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  
  setWallet: (address: string, balance: string, chainId: number) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  disconnect: () => void;
  updateBalance: (balance: string) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  balance: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  error: null,

  setWallet: (address, balance, chainId) =>
    set({
      address,
      balance,
      chainId,
      isConnected: true,
      isConnecting: false,
      error: null,
    }),

  setConnecting: (isConnecting) =>
    set({ isConnecting }),

  setError: (error) =>
    set({ error, isConnecting: false }),

  disconnect: () =>
    set({
      address: null,
      balance: null,
      chainId: null,
      isConnected: false,
      error: null,
    }),

  updateBalance: (balance) =>
    set({ balance }),
}));
