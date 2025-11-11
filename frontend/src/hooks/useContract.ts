import { useCallback, useEffect } from 'react';
import { useContractStore } from '../store/contractStore';
import { getContract, getContractBalance, getEthBalance } from '../services/ethers.service';
import { CONTRACT_ADDRESS, SAFE_ADDRESS } from '../constants/contractAddress';
import { ethers } from 'ethers';

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
    setTotalReceived,
    setTotalTransferred,
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

      // Get contract balance from contract function
      const balance = await getContractBalance();
      setContractBalance(balance);

      // Get threshold (capAmountForAutoTransfering)
      let thresholdValue: bigint;
      try {
        thresholdValue = await (contract as any).capAmountForAutoTransfering();
      } catch {
        // Fallback to THRESHOLD if capAmountForAutoTransfering doesn't exist
        thresholdValue = await contract.THRESHOLD();
      }
      setThreshold(ethers.formatEther(thresholdValue));

      // Get total received from contract function
      const totalReceivedValue = await (contract as any).getTotalReceive();
      const totalReceivedFormatted = ethers.formatEther(totalReceivedValue);
      setTotalReceived(totalReceivedFormatted);

      // Get total transferred from contract function
      const totalTransferredValue = await (contract as any).getTotalTransfer();
      const totalTransferredFormatted = ethers.formatEther(totalTransferredValue);
      setTotalTransferred(totalTransferredFormatted);

      // Get Safe balance
      if (SAFE_ADDRESS) {
        const safeBalanceValue = await getEthBalance(SAFE_ADDRESS);
        setSafeBalance(safeBalanceValue);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading contract data:', err);
      setError(err.message || 'Failed to load contract data');
      setLoading(false);
    }
  }, [setContractBalance, setSafeBalance, setThreshold, setTotalReceived, setTotalTransferred, setLoading, setError]);

  const loadDonations = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const contract = getContract();
      if (!contract) return;

      // Query donationReceived and donationFallback events from genesis block
      const donationFilter = contract.filters.donationReceived();
      const fallbackFilter = contract.filters.donationFallback();
      const donationEvents = await contract.queryFilter(donationFilter, 0n);
      const fallbackEvents = await contract.queryFilter(fallbackFilter, 0n);

      // Combine both event types
      const allEvents = [...donationEvents, ...fallbackEvents];

      const donationsList = allEvents
        .filter((event: any) => event.args.amount > 0n) // Only include events with value > 0
        .map((event: any) => ({
          donor: event.args.donor,
          amount: ethers.formatEther(event.args.amount),
          balance: ethers.formatEther(event.args.balance),
          timestamp: Number(event.args.timestamp),
          txHash: event.transactionHash,
        }));

      // Sort by timestamp descending
      donationsList.sort((a, b) => b.timestamp - a.timestamp);

      // Don't calculate totalReceived here - use contract function instead
      setDonations(donationsList, true);
    } catch (err) {
      console.error('Error loading donations:', err);
    }
  }, [setDonations]);

  const loadTransfers = useCallback(async () => {
    if (!CONTRACT_ADDRESS) return;

    try {
      const contract = getContract();
      if (!contract) return;

      // Query autoTransfer and manualTransfer events from genesis block
      const autoTransferFilter = contract.filters.autoTransfer();
      const manualTransferFilter = contract.filters.manualTransfer();
      const autoEvents = await contract.queryFilter(autoTransferFilter, 0n);
      const manualEvents = await contract.queryFilter(manualTransferFilter, 0n);

      // Combine both event types
      const allTransferEvents = [...autoEvents, ...manualEvents];

      const transfersList = allTransferEvents.map((event: any) => ({
        amount: ethers.formatEther(event.args.amount),
        to: event.args.to || event.args.by, // autoTransfer has 'to', manualTransfer has 'by'
        timestamp: Number(event.args.timestamp),
        txHash: event.transactionHash,
      }));

      // QUAN TRỌNG: Loại bỏ duplicate transactions dựa trên txHash
      // Có thể có duplicate nếu cùng 1 transaction emit nhiều events
      const uniqueTransfers = transfersList.reduce((acc: any[], current: any) => {
        // Check xem đã có transaction với cùng txHash chưa
        const existing = acc.find((t) => t.txHash.toLowerCase() === current.txHash.toLowerCase());
        if (!existing) {
          // Nếu chưa có, thêm vào
          acc.push(current);
        } else {
          // Nếu đã có, giữ transaction có timestamp mới hơn hoặc amount lớn hơn
          if (current.timestamp > existing.timestamp || 
              parseFloat(current.amount) > parseFloat(existing.amount)) {
            // Thay thế bằng transaction mới hơn
            const index = acc.indexOf(existing);
            acc[index] = current;
          }
        }
        return acc;
      }, []);

      // Sort by timestamp descending
      uniqueTransfers.sort((a, b) => b.timestamp - a.timestamp);

      // Don't calculate totalTransferred here - use contract function instead
      setTransfers(uniqueTransfers, true);
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

    const onDonationReceived = () => {
      // Refresh data when new donation is received
      refreshData();
    };

    const onAutoTransfer = () => {
      // Refresh data when auto transfer occurs
      refreshData();
    };

    contract.on('donationReceived', onDonationReceived);
    contract.on('donationFallback', onDonationReceived);
    contract.on('autoTransfer', onAutoTransfer);
    contract.on('manualTransfer', onAutoTransfer);

    return () => {
      contract.off('donationReceived', onDonationReceived);
      contract.off('donationFallback', onDonationReceived);
      contract.off('autoTransfer', onAutoTransfer);
      contract.off('manualTransfer', onAutoTransfer);
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
