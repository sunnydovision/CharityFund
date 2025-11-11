import { CONTRACT_ADDRESS } from '../constants/contractAddress';
import { NETWORK } from '../constants/networkConfig';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ContractTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: number;
}

export const fetchContractTransactions = async (
  contractAddress: string = CONTRACT_ADDRESS
): Promise<ContractTx[]> => {
  if (!contractAddress) return [];

  try {
    const url = new URL('/api/transactions', API_BASE_URL);
    url.searchParams.set('address', contractAddress);
    url.searchParams.set('network', NETWORK);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.transactions)) {
      return [];
    }

    return data.transactions.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timeStamp: Number(tx.timeStamp),
    }));
  } catch (error) {
    console.error('Error fetching transactions from API:', error);
    return [];
  }
};


