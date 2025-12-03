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
  safeAddress: string;
  threshold: string;
  totalReceived: string;
  totalTransferred: string;
  donations: Donation[];
  transfers: Transfer[];
  isLoading: boolean;
  error: string | null;

  setContractBalance: (balance: string) => void;
  setSafeBalance: (balance: string) => void;
  setSafeAddress: (address: string) => void;
  setThreshold: (threshold: string) => void;
  setTotalReceived: (total: string) => void;
  setTotalTransferred: (total: string) => void;
  setDonations: (donations: Donation[], skipTotalCalc?: boolean) => void;
  setTransfers: (transfers: Transfer[], skipTotalCalc?: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addDonation: (donation: Donation) => void;
  addTransfer: (transfer: Transfer) => void;
}

export const useContractStore = create<ContractState>((set, get) => ({
  contractBalance: '0',
  safeBalance: '0',
  safeAddress: '',
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

  setSafeAddress: (address) =>
    set({ safeAddress: address }),

  setThreshold: (threshold) =>
    set({ threshold }),

  setTotalReceived: (total) =>
    set({ totalReceived: total }),

  setTotalTransferred: (total) =>
    set({ totalTransferred: total }),

  setDonations: (donations, skipTotalCalc = false) => {
    // Only calculate from events if skipTotalCalc is false (for backward compatibility)
    if (!skipTotalCalc) {
      const totalReceived = donations
        .reduce((sum, d) => sum + parseFloat(d.amount), 0)
        .toFixed(4);
      set({ donations, totalReceived });
    } else {
      // Don't override totalReceived - it comes from contract.getTotalReceive()
      set({ donations });
    }
  },

  setTransfers: (transfers, skipTotalCalc = false) => {
    // Only calculate from events if skipTotalCalc is false (for backward compatibility)
    if (!skipTotalCalc) {
      const totalTransferred = transfers
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)
        .toFixed(4);
      set({ transfers, totalTransferred });
    } else {
      // Don't override totalTransferred - it comes from contract.getTotalTransfer()
      set({ transfers });
    }
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
