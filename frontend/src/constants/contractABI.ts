// CharityFund Contract ABI
export const CHARITY_FUND_ABI = [
  "constructor(address _safe)",
  "receive() external payable",
  "fallback() external payable",
  "function safe() view returns (address)",
  // New dynamic cap amount variable; keep legacy THRESHOLD for backward compatibility
  "function capAmountForAutoTransfering() view returns (uint256)",
  "function THRESHOLD() view returns (uint256)",
  "function getBalance() view returns (uint256)",
  "function getTotalReceive() view returns (uint256)",
  "function getTotalTransfer() view returns (uint256)",
  "function isAboveThreshold() view returns (bool)",
  "function manualTransferToSafe(uint256 amount) external",
  "function updateSafe(address _newSafeAddress) external",
  "event donationReceived(address indexed donor, uint256 amount, uint256 balance, uint256 timestamp)",
  "event donationFallback(address indexed donor, uint256 amount, uint256 balance, uint256 timestamp)",
  "event autoTransfer(uint256 amount, address indexed to, uint256 timestamp)",
  "event manualTransfer(uint256 amount, address indexed by, uint256 timestamp)",
  "event SafeUpdated(address indexed oldSafe, address indexed newSafe, uint256 timestamp)"
];
