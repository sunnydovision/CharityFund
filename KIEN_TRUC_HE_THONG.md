# 📚 Tài Liệu Kiến Trúc Hệ Thống - Charity Donation DApp

## 🎯 Mục Đích Tài Liệu

Tài liệu này giải thích chi tiết về kiến trúc hệ thống, cách client (frontend) tương tác với smart contract trên Ethereum blockchain, cách kết nối ví MetaMask và Safe Wallet, cùng với các luồng xử lý dữ liệu trong ứng dụng.

**Đối tượng đọc:** Người mới bắt đầu với Ethereum blockchain và web3 development.

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Cách Client Tương Tác Với Smart Contract](#2-cách-client-tương-tác-với-smart-contract)
3. [Kết Nối Ví (Wallet Connection)](#3-kết-nối-ví-wallet-connection)
4. [Luồng Đọc Thông Tin Public Từ Smart Contract](#4-luồng-đọc-thông-tin-public-từ-smart-contract)
5. [Các Thành Phần Chính](#5-các-thành-phần-chính)
6. [Ví Dụ Code Chi Tiết](#6-ví-dụ-code-chi-tiết)

---

## 1. Tổng Quan Kiến Trúc

### 1.1. Kiến Trúc 3 Tầng

```
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (React + TypeScript)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  UI Components (React)                            │  │
│  │  - WalletConnect.tsx                              │  │
│  │  - DonateForm.tsx                                 │  │
│  │  - ContractInfo.tsx                               │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Hooks & State Management                         │  │
│  │  - useWallet.ts (quản lý kết nối ví)              │  │
│  │  - useContract.ts (tương tác với contract)        │  │
│  │  - Zustand stores (state management)              │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Services Layer                                   │  │
│  │  - ethers.service.ts (Ethers.js wrapper)          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕ (RPC Calls)
┌─────────────────────────────────────────────────────────┐
│              BLOCKCHAIN (Ethereum Network)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Smart Contract: CharityFund.sol                  │  │
│  │  - Nhận ETH donations                             │  │
│  │  - Tự động chuyển tiền khi đạt threshold          │  │
│  │  - Emit events (donationReceived, autoTransfer)   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Gnosis Safe (Multisig Wallet)                    │  │
│  │  - Nhận tiền từ contract                          │  │
│  │  - Quản lý bởi 2/3 multisig                       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ↕ (RPC Provider)
┌─────────────────────────────────────────────────────────┐
│              INFRASTRUCTURE                             │
│  - RPC Providers: Infura                                │
│  - Network: Sepolia Testnet                             │
│  - Block Explorer: Etherscan                            │
└─────────────────────────────────────────────────────────┘
```

### 1.2. Luồng Dữ Liệu Tổng Quan

```
User Action (Click "Connect Wallet")
    ↓
Frontend gọi useWallet.connect()
    ↓
ethers.service.ts tạo BrowserProvider từ window.ethereum
    ↓
MetaMask popup yêu cầu user cho phép kết nối
    ↓
Frontend nhận được address, balance, chainId
    ↓
State được cập nhật (Zustand store)
    ↓
UI hiển thị thông tin ví đã kết nối
```

---

## 2. Cách Client Tương Tác Với Smart Contract

### 2.1. Khái Niệm Cơ Bản

**Smart Contract** là một chương trình chạy trên blockchain Ethereum. Để tương tác với contract, client cần:

1. **Contract Address**: Địa chỉ của contract đã được deploy
2. **Contract ABI (Application Binary Interface)**: Mô tả các hàm và events của contract
3. **Provider**: Kết nối đến blockchain network (qua RPC)
4. **Signer**: Đối tượng đại diện cho ví đã kết nối (để thực hiện write operations)

### 2.2. Hai Loại Tương Tác

#### 📖 **Read Operations (Đọc Dữ Liệu)**
- **Không cần ví kết nối** (có thể dùng Provider không có signer)
- **Miễn phí** (không tốn gas)
- **Ví dụ**: Đọc balance, đọc threshold, đọc total received

```typescript
// Đọc dữ liệu từ contract (không cần signer)
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CHARITY_FUND_ABI,
  provider  // Chỉ cần provider, không cần signer
);

// Gọi hàm view/pure function
const balance = await contract.getBalance();
const threshold = await contract.capAmountForAutoTransfering();
```

#### ✍️ **Write Operations (Ghi Dữ Liệu)**
- **Cần ví kết nối** (phải có signer)
- **Tốn gas fee** (ETH)
- **Cần user approve transaction** qua MetaMask/Safe
- **Ví dụ**: Gửi ETH, gọi hàm updateSafe()

```typescript
// Ghi dữ liệu vào contract (cần signer)
const signer = await provider.getSigner();
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  CHARITY_FUND_ABI,
  signer  // Cần signer để ký transaction
);

// Gửi ETH đến contract
await signer.sendTransaction({
  to: CONTRACT_ADDRESS,
  value: ethers.parseEther("0.1")  // 0.1 ETH
});

// Hoặc gọi hàm có modifier
await contract.updateSafe(newSafeAddress);
```

### 2.3. Cách Tạo Contract Instance

Trong project này, contract instance được tạo trong `ethers.service.ts`:

```typescript
// File: frontend/src/services/ethers.service.ts

import { ethers } from 'ethers';
import { CHARITY_FUND_ABI } from '../constants/contractABI';
import { CONTRACT_ADDRESS } from '../constants/contractAddress';

// Tạo contract instance để đọc (read-only)
export const getContract = (): Contract | null => {
  const provider = getProvider();  // Lấy provider (có thể là BrowserProvider hoặc JsonRpcProvider)
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    CHARITY_FUND_ABI,
    provider
  );
  return contract;
};

// Tạo contract instance với signer để ghi (write)
export const getContractWithSigner = async (): Promise<Contract | null> => {
  const signer = await getSigner();  // Lấy signer từ ví đã kết nối
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CHARITY_FUND_ABI,
    signer
  );
};
```

### 2.4. Contract ABI

**ABI (Application Binary Interface)** là file JSON mô tả:
- Các hàm có thể gọi (functions)
- Các events có thể lắng nghe (events)
- Các biến có thể đọc (state variables)

Trong project này, ABI được định nghĩa trong `contractABI.ts`:

```typescript
// File: frontend/src/constants/contractABI.ts

export const CHARITY_FUND_ABI = [
  "function getBalance() view returns (uint256)",  // Hàm đọc balance
  "function getTotalReceive() view returns (uint256)",  // Hàm đọc tổng nhận
  "function capAmountForAutoTransfering() view returns (uint256)",  // Hàm đọc threshold
  "function updateSafe(address _newSafeAddress) external",  // Hàm ghi (cần signer)
  "event donationReceived(address indexed donor, uint256 amount, uint256 balance, uint256 timestamp)",  // Event
  // ... các hàm và events khác
];
```

---

## 3. Kết Nối Ví (Wallet Connection)

### 3.1. MetaMask Connection

#### Bước 1: Kiểm Tra MetaMask Có Cài Đặt

```typescript
// File: frontend/src/services/ethers.service.ts

if (!window.ethereum) {
  throw new Error('MetaMask not installed');
}
```

#### Bước 2: Tạo BrowserProvider

```typescript
// Tạo provider từ window.ethereum (MetaMask inject vào browser)
const provider = new ethers.BrowserProvider(window.ethereum);
```

#### Bước 3: Yêu Cầu Kết Nối

```typescript
// Yêu cầu user cho phép kết nối
await provider.send('eth_requestAccounts', []);

// Lấy signer (đại diện cho ví đã kết nối)
const signer = await provider.getSigner();
const address = await signer.getAddress();
const balance = await provider.getBalance(address);
```

#### Luồng Hoàn Chỉnh

```typescript
// File: frontend/src/services/ethers.service.ts

export const connectWallet = async () => {
  // 1. Kiểm tra MetaMask
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  // 2. Tạo provider
  const provider = new ethers.BrowserProvider(window.ethereum);

  // 3. Yêu cầu kết nối (MetaMask sẽ hiện popup)
  await provider.send('eth_requestAccounts', []);

  // 4. Lấy thông tin ví
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const network = await provider.getNetwork();

  return {
    address,
    balance: ethers.formatEther(balance),
    chainId: Number(network.chainId),
  };
};
```

#### Sử Dụng Trong Component

```typescript
// File: frontend/src/hooks/useWallet.ts

export const useWallet = () => {
  const { connect } = useWalletStore();

  const handleConnect = async () => {
    try {
      const walletInfo = await connectWallet();  // Gọi service
      setWallet(walletInfo.address, walletInfo.balance, walletInfo.chainId);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return { connect: handleConnect, ... };
};
```

### 3.2. Safe Wallet Connection

Safe Wallet hoạt động khác MetaMask vì nó chạy trong iframe và sử dụng Safe Apps SDK.

#### Bước 1: Kiểm Tra Môi Trường Safe

```typescript
// Kiểm tra xem app có đang chạy trong Safe Wallet iframe không
const isInSafeIframe = window.self !== window.top;
```

#### Bước 2: Khởi Tạo Safe SDK

```typescript
// File: frontend/src/services/ethers.service.ts

import SafeAppsSDK from '@safe-global/safe-apps-sdk';
import { SafeAppProvider } from '@safe-global/safe-apps-provider';

// Khởi tạo Safe SDK
const safeSdk = new SafeAppsSDK();

// Lấy thông tin Safe
const safeInfo = await safeSdk.safe.getSafeInfo();
// safeInfo.safeAddress là địa chỉ Safe Wallet

// Tạo Safe App Provider
const safeProvider = new SafeAppProvider(safeInfo, safeSdk);

// Tạo Ethers provider từ Safe provider
const ethersProvider = new ethers.BrowserProvider(safeProvider);
```

#### Bước 3: Handshake Với Safe

Safe Wallet yêu cầu "handshake" - app phải khởi tạo SDK để Safe nhận biết app hỗ trợ Safe Apps.

```typescript
// File: frontend/src/services/ethers.service.ts

export const getSafeEthersProvider = async () => {
  // Chỉ hoạt động trong iframe
  if (window.self === window.top) {
    return null;  // Không phải trong Safe Wallet
  }

  // Khởi tạo SDK
  await initializeSafeSDK();

  // Lấy Safe info (handshake)
  const safe = await safeSdk.safe.getSafeInfo();

  // Tạo provider
  const safeProvider = new SafeAppProvider(safe, safeSdk);
  const ethersProvider = new ethers.BrowserProvider(safeProvider);
  const signer = await ethersProvider.getSigner();

  return { appsSdk: safeSdk, safeInfo: safe, ethersProvider, signer };
};
```

#### Luồng Kết Nối Safe Wallet

```
User mở app trong Safe Wallet
    ↓
App detect đang trong iframe (window.self !== window.top)
    ↓
App khởi tạo Safe SDK
    ↓
Safe Wallet detect SDK initialization (handshake)
    ↓
App gọi safeSdk.safe.getSafeInfo()
    ↓
Safe Wallet trả về safeAddress và chainId
    ↓
App tạo SafeAppProvider và Ethers provider
    ↓
App có thể tương tác với contract qua Safe Wallet
```

### 3.3. So Sánh MetaMask vs Safe Wallet

| Tính Năng | MetaMask | Safe Wallet |
|-----------|----------|-------------|
| **Môi trường** | Browser extension | Web app trong iframe |
| **Provider** | `window.ethereum` | Safe Apps SDK |
| **Ký transaction** | 1 signature | Multisig (2/3) |
| **Use case** | User thường | Admin/Organization |
| **Phí gas** | User trả | Safe Wallet trả |

---

## 4. Luồng Đọc Thông Tin Public Từ Smart Contract

### 4.1. Ví Dụ: Đọc Balance Của Contract

Đây là luồng chi tiết từ khi user mở trang web đến khi hiển thị balance:

#### Bước 1: Component Mount

```typescript
// File: frontend/src/pages/Home.tsx

export const Home: React.FC = () => {
  return (
    <Container>
      <ContractInfo />  {/* Component hiển thị thông tin contract */}
    </Container>
  );
};
```

#### Bước 2: Component ContractInfo Load Data

```typescript
// File: frontend/src/components/ContractInfo.tsx

export const ContractInfo: React.FC = () => {
  // Hook useContract tự động load data khi component mount
  const {
    contractBalance,  // Balance của contract
    threshold,        // Threshold để auto-transfer
    totalReceived,    // Tổng số tiền đã nhận
    isLoading,
  } = useContract();

  return (
    <Card>
      <Typography>Balance: {contractBalance} ETH</Typography>
      <Typography>Threshold: {threshold} ETH</Typography>
    </Card>
  );
};
```

#### Bước 3: Hook useContract Gọi Service

```typescript
// File: frontend/src/hooks/useContract.ts

export const useContract = () => {
  const { contractBalance, setContractBalance } = useContractStore();

  const loadContractData = useCallback(async () => {
    setLoading(true);

    // 1. Lấy contract instance (read-only)
    const contract = getContract();  // Từ ethers.service.ts
    if (!contract) return;

    // 2. Gọi hàm getBalance() trên contract
    const balance = await contract.getBalance();
    // balance là BigInt (wei), cần convert sang ETH
    const balanceInEth = ethers.formatEther(balance);

    // 3. Lưu vào state
    setContractBalance(balanceInEth);

    setLoading(false);
  }, []);

  // Tự động load khi component mount
  useEffect(() => {
    loadContractData();
  }, []);

  return { contractBalance, loadContractData };
};
```

#### Bước 4: Service Tạo Contract Instance

```typescript
// File: frontend/src/services/ethers.service.ts

export const getContract = (): Contract | null => {
  // 1. Lấy provider (có thể là BrowserProvider hoặc JsonRpcProvider)
  const provider = getProvider();

  // 2. Tạo contract instance
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,      // Địa chỉ contract
    CHARITY_FUND_ABI,      // ABI mô tả các hàm
    provider               // Provider để kết nối blockchain
  );

  return contract;
};
```

#### Bước 5: Provider Kết Nối Blockchain

```typescript
// File: frontend/src/services/ethers.service.ts

export const getProvider = () => {
  // Ưu tiên 1: Safe Wallet provider (nếu đang trong Safe)
  if (isSafeWallet && safeEthersProvider) {
    return safeEthersProvider;
  }

  // Ưu tiên 2: MetaMask provider (nếu có window.ethereum)
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }

  // Ưu tiên 3: Public RPC provider (fallback)
  return new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/...');
};
```

#### Bước 6: Contract Gọi Hàm Trên Blockchain

```typescript
// Khi gọi contract.getBalance():
const balance = await contract.getBalance();

// Ethers.js sẽ:
// 1. Encode function call: getBalance()
// 2. Gửi RPC call đến blockchain qua provider
// 3. Blockchain execute hàm getBalance() (view function, không tốn gas)
// 4. Trả về kết quả (BigInt wei)
// 5. Decode kết quả và trả về cho client
```

#### Bước 7: Format Và Hiển Thị

```typescript
// Balance trả về là BigInt (wei), cần convert sang ETH
const balanceInEth = ethers.formatEther(balance);  // "5.123456789"

// Format để hiển thị
const displayBalance = parseFloat(balanceInEth).toFixed(4);  // "5.1234"

// Hiển thị trong UI
<Typography>{displayBalance} ETH</Typography>
```

### 4.2. Luồng Hoàn Chỉnh (Flow Diagram)

```
┌─────────────────────────────────────────────────────────┐
│  User mở trang web                                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  React Component: ContractInfo.tsx mount                │
│  → Gọi useContract() hook                              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Hook: useContract.ts                                    │
│  → Gọi loadContractData()                               │
│  → Gọi getContract() từ ethers.service.ts              │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Service: ethers.service.ts                             │
│  → getContract() tạo Contract instance                   │
│  → Contract instance có provider (kết nối blockchain)   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Contract Instance gọi hàm                              │
│  → contract.getBalance()                                │
│  → Ethers.js encode function call                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Provider gửi RPC Call                                  │
│  → eth_call (read-only, không tốn gas)                  │
│  → Đến RPC endpoint (Infura/Alchemy/Public RPC)         │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Blockchain Network (Sepolia/Mainnet)                   │
│  → Execute hàm getBalance() trên contract                │
│  → Trả về balance (BigInt wei)                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Provider nhận response                                 │
│  → Decode kết quả                                        │
│  → Trả về BigInt cho contract instance                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Hook: useContract.ts                                    │
│  → Convert BigInt sang ETH (ethers.formatEther)         │
│  → Lưu vào Zustand store                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│  Component: ContractInfo.tsx                             │
│  → Đọc từ store                                          │
│  → Hiển thị trong UI                                     │
└─────────────────────────────────────────────────────────┘
```

### 4.3. Ví Dụ Code Đọc Nhiều Thông Tin

```typescript
// File: frontend/src/hooks/useContract.ts

const loadContractData = useCallback(async () => {
  const contract = getContract();
  if (!contract) return;

  try {
    // 1. Đọc balance (view function)
    const balance = await contract.getBalance();
    setContractBalance(ethers.formatEther(balance));

    // 2. Đọc threshold (view function)
    const thresholdValue = await contract.capAmountForAutoTransfering();
    setThreshold(ethers.formatEther(thresholdValue));

    // 3. Đọc total received (view function)
    const totalReceivedValue = await contract.getTotalReceive();
    setTotalReceived(ethers.formatEther(totalReceivedValue));

    // 4. Đọc Safe address (view function)
    const safeAddress = await contract.safe();
    // Safe address là public variable, có thể đọc trực tiếp

    // 5. Đọc ETH balance của Safe (không phải từ contract, mà từ blockchain)
    const provider = getProvider();
    const safeBalance = await provider.getBalance(safeAddress);
    setSafeBalance(ethers.formatEther(safeBalance));

  } catch (error) {
    console.error('Error loading contract data:', error);
  }
}, []);
```

### 4.4. Đọc Events Từ Contract

Events là cách contract "phát sóng" thông tin ra ngoài. Client có thể lắng nghe events để biết khi có donation mới.

```typescript
// File: frontend/src/hooks/useContract.ts

const loadDonations = useCallback(async () => {
  const contract = getContract();
  if (!contract) return;

  // 1. Tạo filter cho event donationReceived
  const donationFilter = contract.filters.donationReceived();

  // 2. Query tất cả events từ block 0 đến hiện tại
  const donationEvents = await contract.queryFilter(donationFilter, 0n);

  // 3. Parse events thành dữ liệu dễ sử dụng
  const donationsList = donationEvents.map((event) => ({
    donor: event.args.donor,                    // Địa chỉ người donate
    amount: ethers.formatEther(event.args.amount),  // Số tiền (ETH)
    balance: ethers.formatEther(event.args.balance),  // Balance sau khi nhận
    timestamp: Number(event.args.timestamp),     // Thời gian
    txHash: event.transactionHash,              // Hash của transaction
  }));

  // 4. Lưu vào state
  setDonations(donationsList);
}, []);
```

#### Lắng Nghe Events Real-time

```typescript
// File: frontend/src/hooks/useContract.ts

useEffect(() => {
  const contract = getContract();
  if (!contract) return;

  // Lắng nghe event donationReceived
  const onDonationReceived = () => {
    // Khi có donation mới, refresh lại data
    refreshData();
  };

  // Đăng ký listener
  contract.on('donationReceived', onDonationReceived);

  // Cleanup khi component unmount
  return () => {
    contract.off('donationReceived', onDonationReceived);
  };
}, []);
```

---

## 5. Các Thành Phần Chính

### 5.1. Frontend Structure

```
frontend/src/
├── components/          # React components
│   ├── WalletConnect.tsx      # Component kết nối ví
│   ├── DonateForm.tsx         # Form donate ETH
│   ├── ContractInfo.tsx       # Hiển thị thông tin contract
│   └── DonationHistory.tsx   # Lịch sử donations
│
├── hooks/              # Custom React hooks
│   ├── useWallet.ts           # Hook quản lý ví
│   └── useContract.ts         # Hook tương tác contract
│
├── services/           # Business logic
│   └── ethers.service.ts      # Wrapper cho Ethers.js
│
├── constants/          # Constants & configs
│   ├── contractABI.ts         # Contract ABI
│   ├── contractAddress.ts     # Contract address
│   └── networkConfig.ts        # Network configuration
│
└── store/             # State management (Zustand)
    ├── walletStore.ts         # State của ví
    └── contractStore.ts       # State của contract
```

### 5.2. Service Layer: ethers.service.ts

File này là trung tâm của tất cả tương tác blockchain:

**Chức năng chính:**
- `getProvider()`: Lấy provider (MetaMask/Safe/RPC)
- `getSigner()`: Lấy signer từ ví đã kết nối
- `getContract()`: Tạo contract instance (read-only)
- `getContractWithSigner()`: Tạo contract instance với signer (write)
- `connectWallet()`: Kết nối MetaMask
- `connectSafeWallet()`: Kết nối Safe Wallet
- `donateETH()`: Gửi ETH đến contract
- `getContractBalance()`: Đọc balance của contract

### 5.3. Hook Layer

**useWallet.ts:**
- Quản lý kết nối ví (MetaMask/Safe)
- Lắng nghe thay đổi account/network
- Refresh balance tự động

**useContract.ts:**
- Load dữ liệu từ contract (balance, threshold, totals)
- Load events (donations, transfers)
- Lắng nghe events real-time
- Refresh data khi có thay đổi

### 5.4. State Management (Zustand)

**walletStore.ts:**
```typescript
{
  address: string | null,
  balance: string,
  chainId: number,
  isConnected: boolean,
  isConnecting: boolean,
  error: string | null
}
```

**contractStore.ts:**
```typescript
{
  contractBalance: string,
  safeBalance: string,
  threshold: string,
  totalReceived: string,
  totalTransferred: string,
  donations: Donation[],
  transfers: Transfer[],
  isLoading: boolean,
  error: string | null
}
```

---

## 6. Ví Dụ Code Chi Tiết

### 6.1. Ví Dụ 1: Đọc Balance Của Contract

```typescript
// Bước 1: Component gọi hook
// File: frontend/src/components/ContractInfo.tsx
const { contractBalance } = useContract();

// Bước 2: Hook load data
// File: frontend/src/hooks/useContract.ts
const loadContractData = async () => {
  const contract = getContract();  // Lấy contract instance
  const balance = await contract.getBalance();  // Gọi hàm
  setContractBalance(ethers.formatEther(balance));  // Format và lưu
};

// Bước 3: Service tạo contract
// File: frontend/src/services/ethers.service.ts
export const getContract = () => {
  const provider = getProvider();  // Lấy provider
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    CHARITY_FUND_ABI,
    provider
  );
};

// Bước 4: Provider kết nối blockchain
export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider('https://sepolia.infura.io/...');
};
```

### 6.2. Ví Dụ 2: Gửi ETH Đến Contract (Donate)

```typescript
// Bước 1: User nhập amount và click "Donate"
// File: frontend/src/components/DonateForm.tsx
const handleDonate = async () => {
  await donateETH(amount);  // Gọi service
};

// Bước 2: Service gửi transaction
// File: frontend/src/services/ethers.service.ts
export const donateETH = async (amount: string) => {
  // 1. Lấy signer (ví đã kết nối)
  const signer = await getSigner();
  if (!signer) throw new Error('Wallet not connected');

  // 2. Tạo transaction
  const tx = await signer.sendTransaction({
    to: CONTRACT_ADDRESS,              // Gửi đến contract
    value: ethers.parseEther(amount),   // Số tiền (convert ETH → wei)
  });

  // 3. Đợi transaction được confirm
  await tx.wait();

  // 4. Trả về transaction hash
  return tx.hash;
};

// Luồng:
// 1. signer.sendTransaction() → MetaMask popup hiện
// 2. User approve transaction → MetaMask ký transaction
// 3. Transaction được broadcast lên network
// 4. tx.wait() đợi transaction được mine vào block
// 5. Contract receive() function được gọi tự động
// 6. Contract emit event donationReceived
```

### 6.3. Ví Dụ 3: Lắng Nghe Events Real-time

```typescript
// File: frontend/src/hooks/useContract.ts

useEffect(() => {
  const contract = getContract();
  if (!contract) return;

  // Đăng ký listener cho event donationReceived
  const onDonationReceived = (
    donor: string,
    amount: bigint,
    balance: bigint,
    timestamp: bigint
  ) => {
    console.log('New donation received!', {
      donor,
      amount: ethers.formatEther(amount),
      balance: ethers.formatEther(balance),
      timestamp: Number(timestamp),
    });

    // Refresh data để hiển thị donation mới
    refreshData();
  };

  // Đăng ký listener
  contract.on('donationReceived', onDonationReceived);

  // Cleanup
  return () => {
    contract.off('donationReceived', onDonationReceived);
  };
}, []);
```

### 6.4. Ví Dụ 4: Kết Nối MetaMask Và Đọc Thông Tin

```typescript
// File: frontend/src/components/WalletConnect.tsx

const WalletConnect = () => {
  const { connect, address, balance, isConnected } = useWallet();

  // Khi user click "Connect MetaMask"
  const handleConnect = async () => {
    await connect();  // Gọi hook
  };

  return (
    <Card>
      {!isConnected ? (
        <Button onClick={handleConnect}>Connect MetaMask</Button>
      ) : (
        <Box>
          <Typography>Address: {address}</Typography>
          <Typography>Balance: {balance} ETH</Typography>
        </Box>
      )}
    </Card>
  );
};

// Hook useWallet.ts
export const useWallet = () => {
  const connect = async () => {
    // Gọi service để kết nối
    const walletInfo = await connectWallet();
    
    // Lưu vào store
    setWallet(walletInfo.address, walletInfo.balance, walletInfo.chainId);
  };

  return { connect, address, balance, isConnected };
};

// Service ethers.service.ts
export const connectWallet = async () => {
  // 1. Kiểm tra MetaMask
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  // 2. Tạo provider
  const provider = new ethers.BrowserProvider(window.ethereum);

  // 3. Yêu cầu kết nối (MetaMask popup)
  await provider.send('eth_requestAccounts', []);

  // 4. Lấy thông tin
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const balance = await provider.getBalance(address);
  const network = await provider.getNetwork();

  return {
    address,
    balance: ethers.formatEther(balance),
    chainId: Number(network.chainId),
  };
};
```

---

## 📝 Tóm Tắt

### Các Khái Niệm Quan Trọng

1. **Provider**: Kết nối đến blockchain network (qua RPC)
2. **Signer**: Đại diện cho ví đã kết nối (để ký transactions)
3. **Contract Instance**: Đối tượng để tương tác với smart contract
4. **ABI**: Mô tả các hàm và events của contract
5. **Read vs Write**: Read không cần signer, Write cần signer và tốn gas

### Luồng Tương Tác Cơ Bản

```
User Action
    ↓
React Component
    ↓
Custom Hook (useWallet/useContract)
    ↓
Service Layer (ethers.service.ts)
    ↓
Ethers.js Library
    ↓
Provider (RPC/Window.ethereum)
    ↓
Blockchain Network
    ↓
Smart Contract
    ↓
Response
    ↓
State Update
    ↓
UI Update
```

### Best Practices

1. **Luôn check provider/signer trước khi dùng**
2. **Handle errors gracefully** (user có thể reject transaction)
3. **Show loading states** khi đang chờ blockchain response
4. **Format BigInt properly** (wei → ETH)
5. **Listen to events** để update UI real-time
6. **Cache contract instances** để tránh tạo lại nhiều lần

---

## 🔗 Tài Liệu Tham Khảo

- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Safe Apps SDK Documentation](https://docs.safe.global/safe-core-aa-sdk/safe-apps)
- [Ethereum Developer Resources](https://ethereum.org/en/developers/)

---

**Tài liệu này được tạo để giúp người mới bắt đầu hiểu cách frontend tương tác với Ethereum blockchain. Nếu có câu hỏi, hãy tham khảo code trong project hoặc tài liệu chính thức của các thư viện.**




