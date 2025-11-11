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

// MockSafe Contract ABI (for local testing)
export const MOCK_SAFE_ABI = [
  "constructor(address[] memory _owners)",
  "receive() external payable",
  "fallback() external payable",
  "function getBalance() view returns (uint256)",
  "function getOwners() view returns (address[] memory)",
  "function withdraw(address payable _to, uint256 _amount) external",
  "event FundsReceived(address indexed from, uint256 amount, uint256 balance, uint256 timestamp)",
  "event FundsWithdrawn(address indexed to, uint256 amount, uint256 timestamp)"
];
