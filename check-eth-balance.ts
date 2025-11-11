import { ethers } from 'ethers';

// Your contract address
const CONTRACT_ADDRESS = '0x4cc5261bf525aedc4686735516dd5a626b4343bc';

// RPC URL from your .env
const RPC_URL = 'https://sepolia.infura.io/v3/f75184c15a1146ea88a13275ad4056b3';

async function checkEthBalance() {
  try {
    console.log('Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('Getting ETH balance for contract:', CONTRACT_ADDRESS);
    const balance = await provider.getBalance(CONTRACT_ADDRESS);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log('\n=== Contract ETH Balance ===');
    console.log(`Address: ${CONTRACT_ADDRESS}`);
    console.log(`Balance: ${balanceInEth} ETH`);
    console.log('==========================\n');
    
  } catch (error) {
    console.error('Error checking ETH balance:', error);
  }
}

checkEthBalance();
