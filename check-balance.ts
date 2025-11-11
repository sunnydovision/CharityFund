import { ethers } from 'ethers';

// Contract ABI - We only need the getBalance function
const ABI = [
  "function getBalance() view returns (uint256)"
];

// Your contract address from .env
const CONTRACT_ADDRESS = '0x4cc5261bf525aedc4686735516dd5a626b4343bc';

// RPC URL from your .env
const RPC_URL = 'https://sepolia.infura.io/v3/f75184c15a1146ea88a13275ad4056b3';

async function checkBalance() {
  try {
    console.log('Connecting to Sepolia network...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    console.log('Getting contract instance...');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    console.log('Fetching contract balance...');
    const balance = await contract.getBalance();
    const balanceInEth = ethers.formatEther(balance);
    
    console.log('\n=== Contract Balance ===');
    console.log(`Address: ${CONTRACT_ADDRESS}`);
    console.log(`Balance: ${balanceInEth} ETH`);
    console.log('========================\n');
    
    // Also check the ETH balance of the contract
    const ethBalance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log('=== ETH Balance ===');
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    console.log('===================\n');
    
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}

checkBalance();
