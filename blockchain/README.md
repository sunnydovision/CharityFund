# SOLID FUND - Smart Contracts

Smart contracts cho SOLID FUND charity donation platform.

## 📦 Contracts

- **CharityFund.sol**: Main contract quản lý donations và auto-transfer

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test

# With gas reporting
npm run test:gas

# Coverage
npm run coverage
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PRIVATE_KEY=your_deployer_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
GNOSIS_SAFE_ADDRESS=your_gnosis_safe_address
```

## 🔧 Available Scripts

- `npm run compile` - Compile contracts
- `npm test` - Run tests
- `npm run test:gas` - Run tests with gas reporting
- `npm run coverage` - Generate coverage report
- `npm run clean` - Clean artifacts
- `npm run verify` - Verify contract on Etherscan

## 📄 Contract Details

### CharityFund

**Functions:**
- `receive()` - Receive ETH donations
- `transferToSafe()` - Manual transfer to Safe
- `updateSafe(address)` - Update Safe address (only Safe)
- `getBalance()` - Get current balance
- `isAboveThreshold()` - Check if above 5 ETH

**Events:**
- `DonationReceived(address donor, uint256 amount, uint256 balance, uint256 timestamp)`
- `AutoTransfer(uint256 amount, address to, uint256 timestamp)`
- `SafeUpdated(address oldSafe, address newSafe, uint256 timestamp)`

## 📚 Documentation

See main repository README for complete documentation.
