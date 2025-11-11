import { useCallback, useEffect } from 'react';
import { useContractStore } from '../store/contractStore';
import { getContract, getContractBalance, getProvider } from '../services/ethers.service';
import { CONTRACT_ADDRESS, SAFE_ADDRESS } from '../constants/contractAddress';
import { ethers } from 'ethers';
import { fetchContractTransactions } from '../services/etherscan.service';

export const useContract = () => {
  const {
    contractBalance,
    safeBalance,
    threshold,
    totalReceived,
    totalTransferred,
    donations,
    transfers,
    isLoading,
    error,
    setContractBalance,
    setSafeBalance,
    setThreshold,
    setDonations,
    setTransfers,
    setLoading,
    setError,
  } = useContractStore();

  const loadContractData = useCallback(async () => {
    if (!CONTRACT_ADDRESS) {
      setError('Contract address not set');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contract = getContract();
      if (!contract) {
        throw new Error('Failed to get contract instance');
      }

      // Get contract balance
      const balance = await getContractBalance();
      setContractBalance(balance);

      // Get threshold
      const thresholdValue = await contract.THRESHOLD();
      setThreshold(ethers.formatEther(thresholdValue));

      // Get Safe balance
      if (SAFE_ADDRESS) {
        const provider = getProvider();
        if (provider) {
          const safeBalanceValue = await provider.getBalance(SAFE_ADDRESS);
          setSafeBalance(ethers.formatEther(safeBalanceValue));
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading contract data:', err);
      setError(err.message || 'Failed to load contract data');
      setLoading(false);
    }
  }, [setContractBalance, setSafeBalance, setThreshold, setLoading, setError]);

  const loadDonations = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const transactions = await fetchContractTransactions(CONTRACT_ADDRESS);

      if (transactions.length > 0) {
        let runningBalance = 0n;
        const donationsList = transactions
          .filter((tx) => tx.to && tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
          .map((tx) => {
            const value = BigInt(tx.value);
            runningBalance += value;

            return {
              donor: tx.from,
              amount: ethers.formatEther(value),
              balance: ethers.formatEther(runningBalance),
              timestamp: tx.timeStamp,
              txHash: tx.hash,
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp);

        setDonations(donationsList);
        return;
      }
    } catch (err) {
      console.error('Error fetching transactions from Etherscan:', err);
    }

    // Fallback to on-chain events if API returns nothing or fails
    try {
      const contract = getContract();
      if (!contract) return;

      const filter = contract.filters.DonationReceived();
      const events = await contract.queryFilter(filter, 0n);

      const donationsList = events
        .map((event: any) => ({
          donor: event.args.donor,
          amount: ethers.formatEther(event.args.amount),
          balance: ethers.formatEther(event.args.balance),
          timestamp: Number(event.args.timestamp),
          txHash: event.transactionHash,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setDonations(donationsList);
    } catch (err) {
      console.error('Error loading donations from contract events:', err);
      setDonations([]);
    }
  }, [setDonations]);

  const loadTransfers = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const contract = getContract();
      if (!contract) return;

      // Query AutoTransfer events
      const filter = contract.filters.AutoTransfer();
      const events = await contract.queryFilter(filter);

      const transfersList = events.map((event: any) => ({
        amount: ethers.formatEther(event.args.amount),
        to: event.args.to,
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      // Sort by timestamp descending
      transfersList.sort((a, b) => b.timestamp - a.timestamp);

      setTransfers(transfersList);
    } catch (err) {
      console.error('Error loading transfers:', err);
    }
  }, [setTransfers]);

  const loadAllData = useCallback(async () => {
    await loadContractData();
    await loadDonations();
    await loadTransfers();
  }, [loadContractData, loadDonations, loadTransfers]);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Listen for contract events
  useEffect(() => {
    const contract = getContract();
    if (!contract) return;

    const onDonationReceived = (donor: string, amount: bigint, balance: bigint, timestamp: bigint) => {
      console.log('Donation received:', { donor, amount, balance, timestamp });
      // Refresh data when new donation is received
      refreshData();
    };

    const onAutoTransfer = (amount: bigint, to: string, timestamp: bigint) => {
      console.log('Auto transfer:', { amount, to, timestamp });
      // Refresh data when auto transfer occurs
      refreshData();
    };

    contract.on('DonationReceived', onDonationReceived);
    contract.on('AutoTransfer', onAutoTransfer);

    return () => {
      contract.off('DonationReceived', onDonationReceived);
      contract.off('AutoTransfer', onAutoTransfer);
    };
  }, [refreshData]);

  // Load data on mount
  useEffect(() => {
    if (CONTRACT_ADDRESS) {
      loadAllData();
    }
  }, [CONTRACT_ADDRESS]);

  return {
    contractBalance,
    safeBalance,
    threshold,
    totalReceived,
    totalTransferred,
    donations,
    transfers,
    isLoading,
    error,
    refreshData,
    loadContractData,
    loadDonations,
    loadTransfers,
  };
};
