import { create } from 'zustand';

export interface Donation {
  donor: string;
  amount: string;
  balance: string;
  timestamp: number;
  txHash: string;
}

export interface Transfer {
  amount: string;
  to: string;
  timestamp: number;
  txHash: string;
}

interface ContractState {
  contractBalance: string;
  safeBalance: string;
  threshold: string;
  totalReceived: string;
  totalTransferred: string;
  donations: Donation[];
  transfers: Transfer[];
  isLoading: boolean;
  error: string | null;

  setContractBalance: (balance: string) => void;
  setSafeBalance: (balance: string) => void;
  setThreshold: (threshold: string) => void;
  setDonations: (donations: Donation[]) => void;
  setTransfers: (transfers: Transfer[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addDonation: (donation: Donation) => void;
  addTransfer: (transfer: Transfer) => void;
}

export const useContractStore = create<ContractState>((set, get) => ({
  contractBalance: '0',
  safeBalance: '0',
  threshold: '5',
  totalReceived: '0',
  totalTransferred: '0',
  donations: [],
  transfers: [],
  isLoading: false,
  error: null,

  setContractBalance: (balance) =>
    set({ contractBalance: balance }),

  setSafeBalance: (balance) =>
    set({ safeBalance: balance }),

  setThreshold: (threshold) =>
    set({ threshold }),

  setDonations: (donations) => {
    const totalReceived = donations
      .reduce((sum, d) => sum + parseFloat(d.amount), 0)
      .toFixed(4);
    set({ donations, totalReceived });
  },

  setTransfers: (transfers) => {
    const totalTransferred = transfers
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      .toFixed(4);
    set({ transfers, totalTransferred });
  },

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  addDonation: (donation) => {
    const donations = [donation, ...get().donations];
    const totalReceived = donations
      .reduce((sum, d) => sum + parseFloat(d.amount), 0)
      .toFixed(4);
    set({ donations, totalReceived });
  },

  addTransfer: (transfer) => {
    const transfers = [transfer, ...get().transfers];
    const totalTransferred = transfers
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
      .toFixed(4);
    set({ transfers, totalTransferred });
  },
}));
