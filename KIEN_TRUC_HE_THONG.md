# 📚 Tài Liệu Kiến Trúc Hệ Thống - Charity Donation DApp

## 🎯 Mục Đích Tài Liệu

Tài liệu này giải thích chi tiết về kiến trúc hệ thống, cách client (frontend) tương tác với smart contract trên Ethereum blockchain, cách kết nối ví MetaMask và Safe Wallet, cùng với các luồng xử lý dữ liệu trong ứng dụng.

**Đối tượng đọc:** Người mới bắt đầu với Ethereum blockchain và web3 development.


**Smart Contract: RequireSignerAForTransferGuard.sol**

**Quyết định thiết kế then chốt:**

- **EstimateGas Detection**: Detect và cho phép estimateGas ngay từ đầu để không block quá trình estimate gas, tránh brick Safe.
- **Whitelist Safe Management Functions**: Cho phép các hàm quản lý Safe (setGuard, changeThreshold, etc.) đi qua mà không cần kiểm tra chữ ký để đảm bảo Safe có thể quản lý chính nó.
- **Module Transaction Support**: Cho phép transaction từ Module đã được enable (execTransactionFromModule) để hỗ trợ các module hợp pháp hoạt động.
- **Selective Signature Check**: Chỉ kiểm tra chữ ký cho transfer operations (ETH hoặc ERC20), các transaction khác không cần chữ ký của requiredSigner.
- **Required Signer Enforcement**: Bắt buộc phải có chữ ký của requiredSigner (Signer A) cho mọi transfer operation, ngay cả khi đã có đủ multisig threshold.
- **Fail-Safe Design**: Nếu không parse được chữ ký hoặc detect estimateGas, cho phép transaction để tránh brick Safe (fail-safe).

**Bảo mật:**

- **EstimateGas Protection**: Kiểm tra `gasPrice == 0 && safeTxGas == 0 && baseGas == 0` để detect estimateGas và cho phép ngay, tránh revert trong quá trình estimate.
- **Signature Validation**: Parse và validate signatures đúng cách:
  - Kiểm tra `signatures.length % 65 == 0` để đảm bảo format hợp lệ
  - Validate `v` phải là 27 hoặc 28
  - Sử dụng `ecrecover` để verify signer address
- **Transfer Detection**: Phát hiện transfer operations chính xác:
  - ETH transfer: `value > 0`
  - ERC20 transfer: Function selector `0xa9059cbb` (transfer)
  - ERC20 transferFrom: Function selector `0x23b872dd` (transferFrom)
- **Module Verification**: Kiểm tra `isModuleEnabled(msgSender)` để xác nhận transaction đến từ Module hợp pháp.
- **Function Selector Validation**: Kiểm tra function selector từ `bytes memory` bằng assembly để tránh lỗi parse.
- **Nonce & Hash Validation**: Validate nonce và transaction hash từ Safe trước khi verify signatures.
- **Signature Limit**: Giới hạn tối đa 8 signatures (520 bytes) để tránh Out-of-Gas (OOG) attacks.
- **Immutable State**: `safe` và `requiredSigner` được set trong constructor và không thể thay đổi, đảm bảo Guard không bị thay đổi sau khi deploy.
- **Interface Compliance**: Implement `ISafeGuard` interface và `supportsInterface` để tương thích với Safe 1.4.1+.
- **Error Handling**: Sử dụng try-catch để xử lý lỗi khi gọi external functions (isModuleEnabled, nonce, getTransactionHash) và fallback về fail-safe.

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
   - [1.1. Kiến Trúc 3 Tầng](#11-kiến-trúc-3-tầng)
   - [1.1.1. Mô Tả Chi Tiết Kiến Trúc 3 Tầng](#111-mô-tả-chi-tiết-kiến-trúc-3-tầng)
   - [1.1.2. Pipeline Chi Tiết Cho Các Loại Operations](#112-pipeline-chi-tiết-cho-các-loại-operations)
   - [1.1.3. Luồng Dữ Liệu Giữa Các Tầng](#113-luồng-dữ-liệu-giữa-các-tầng)
   - [1.1.4. Các Điểm Quan Trọng Trong Pipeline](#114-các-điểm-quan-trọng-trong-pipeline)
   - [1.1.5. Tóm Tắt Pipeline Chính](#115-tóm-tắt-pipeline-chính)
   - [1.2. Luồng Dữ Liệu Tổng Quan](#12-luồng-dữ-liệu-tổng-quan)
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

### 1.1.1. Mô Tả Chi Tiết Kiến Trúc 3 Tầng

Kiến trúc hệ thống được chia thành **3 tầng chính**, mỗi tầng có vai trò và trách nhiệm riêng biệt, tạo nên một pipeline hoàn chỉnh từ giao diện người dùng đến blockchain.

#### **Tầng 1: Frontend Layer (Presentation Layer)**

**Vai trò:** Tầng này chịu trách nhiệm hiển thị giao diện người dùng và xử lý các tương tác của người dùng.

**Cấu trúc:**

1. **UI Components Layer (Lớp Component)**
   - **Vị trí:** `frontend/src/components/`
   - **Chức năng:** 
     - Hiển thị UI cho người dùng
     - Xử lý các sự kiện từ người dùng (click, input, submit)
     - Render dữ liệu từ state management
   - **Các component chính:**
     - `WalletConnect.tsx`: Component kết nối ví MetaMask/Safe
     - `DonateForm.tsx`: Form để người dùng nhập số tiền và gửi donation
     - `ContractInfo.tsx`: Hiển thị thông tin contract (balance, threshold, totals)
     - `DonationHistory.tsx`: Hiển thị lịch sử các donations
     - `AdminDashboard.tsx`: Dashboard cho admin quản lý

2. **Hooks & State Management Layer (Lớp Logic & Quản Lý State)**
   - **Vị trí:** `frontend/src/hooks/` và `frontend/src/store/`
   - **Chức năng:**
     - Chứa business logic của ứng dụng
     - Quản lý state toàn cục (Zustand stores)
     - Cung cấp custom hooks để components sử dụng
     - Xử lý side effects (useEffect) như load data, listen events
   - **Các hooks chính:**
     - `useWallet.ts`: Hook quản lý kết nối ví, lắng nghe thay đổi account/network
     - `useContract.ts`: Hook tương tác với contract, load data, listen events
   - **State stores:**
     - `walletStore.ts`: Lưu trữ state của ví (address, balance, chainId, isConnected)
     - `contractStore.ts`: Lưu trữ state của contract (balance, donations, transfers, totals)

3. **Services Layer (Lớp Dịch Vụ)**
   - **Vị trí:** `frontend/src/services/`
   - **Chức năng:**
     - Wrapper cho các thư viện blockchain (Ethers.js)
     - Tạo và quản lý provider, signer, contract instances
     - Xử lý kết nối ví (MetaMask/Safe)
     - Cung cấp các hàm tiện ích để tương tác với blockchain
   - **File chính:**
     - `ethers.service.ts`: Chứa tất cả logic tương tác với blockchain

**Pipeline trong Tầng Frontend:**

```
User Interaction (Click/Input)
    ↓
UI Component (handleClick, handleSubmit)
    ↓
Custom Hook (useWallet, useContract)
    ↓
Service Layer (ethers.service.ts)
    ↓
Ethers.js Library
    ↓
Provider/Signer
```

**Ví dụ cụ thể:**

Khi user click nút "Connect Wallet" trong `WalletConnect.tsx`:
1. Component gọi `handleConnect()` 
2. `handleConnect()` gọi `useWallet().connect()`
3. Hook `useWallet` gọi `connectWallet()` từ `ethers.service.ts`
4. Service tạo `BrowserProvider` từ `window.ethereum`
5. Service gọi `provider.send('eth_requestAccounts', [])` để yêu cầu kết nối
6. MetaMask popup hiện ra, user approve
7. Service lấy address, balance, chainId
8. Hook lưu vào `walletStore` qua `setWallet()`
9. Component đọc từ store và hiển thị thông tin ví

#### **Tầng 2: Blockchain Layer (Smart Contract & Wallet)**

**Vai trò:** Tầng này chứa logic nghiệp vụ được triển khai trên blockchain và các ví để quản lý tài sản.

**Cấu trúc:**

1. **Smart Contract: CharityFund.sol**
   - **Vị trí:** `blockchain/CharityFundContract.sol`
   - **Chức năng:**
     - Nhận ETH donations từ người dùng
     - Tự động chuyển tiền đến Safe Wallet khi đạt threshold
     - Lưu trữ state: balance, totalReceived, totalTransferred, threshold
     - Emit events: `donationReceived`, `autoTransfer`, `manualTransfer`
   - **Các hàm chính:**
     - `receive()`: Hàm fallback để nhận ETH
     - `getBalance()`: View function trả về balance hiện tại
     - `getTotalReceive()`: View function trả về tổng số tiền đã nhận
     - `manualTransferToSafe()`: Hàm để admin chuyển tiền thủ công (chỉ Safe address mới gọi được)

2. **Gnosis Safe Wallet (Multisig Wallet)**
   - **Chức năng:**
     - Nhận tiền từ contract khi đạt threshold hoặc khi admin chuyển thủ công
     - Quản lý bởi multisig (2/3 owners phải approve)
     - Đảm bảo an toàn cho quỹ từ thiện
   - **Đặc điểm:**
     - Chỉ Safe address mới có thể gọi một số hàm của contract (modifier `onlySafe`)
     - Transactions cần approval từ nhiều owners trước khi execute

**Pipeline trong Tầng Blockchain:**

```
Transaction Request từ Frontend
    ↓
Provider/Signer ký transaction
    ↓
Transaction được broadcast lên network
    ↓
Miners validate và mine transaction vào block
    ↓
Smart Contract execute function
    ↓
State được update trên blockchain
    ↓
Events được emit
    ↓
Frontend listen và update UI
```

**Ví dụ cụ thể:**

Khi user donate 0.1 ETH:
1. Frontend gọi `donateETH("0.1")` từ service
2. Service tạo transaction: `{ to: CONTRACT_ADDRESS, value: 0.1 ETH }`
3. MetaMask/Safe Wallet ký transaction
4. Transaction được broadcast lên Sepolia network
5. Miners validate và mine vào block
6. Contract `receive()` function được gọi tự động
7. Contract update state: `balance += 0.1 ETH`, `totalReceived += 0.1 ETH`
8. Contract emit event `donationReceived(donor, amount, balance, timestamp)`
9. Frontend listen event và refresh UI

#### **Tầng 3: Infrastructure Layer (RPC Providers & Network)**

**Vai trò:** Tầng này cung cấp kết nối giữa frontend và blockchain network.

**Cấu trúc:**

1. **RPC Providers**
   - **Chức năng:**
     - Cung cấp endpoint để frontend giao tiếp với blockchain
     - Xử lý các RPC calls (eth_call, eth_sendTransaction, eth_getBalance, etc.)
     - Cache và optimize requests
   - **Các loại providers:**
     - **BrowserProvider (MetaMask)**: Provider từ `window.ethereum` khi dùng MetaMask
     - **SafeAppProvider**: Provider từ Safe Apps SDK khi dùng Safe Wallet
     - **JsonRpcProvider**: Public RPC provider (Infura, Alchemy, public RPC) làm fallback
   - **RPC URLs được sử dụng:**
     - `https://sepolia.infura.io/v3/...` (Infura)
     - `https://rpc.sepolia.org` (Public RPC)
     - `https://ethereum-sepolia-rpc.publicnode.com` (PublicNode)

2. **Ethereum Network (Sepolia Testnet)**
   - **Chức năng:**
     - Network nơi smart contract được deploy
     - Xử lý và validate transactions
     - Lưu trữ state của smart contracts
   - **Đặc điểm:**
     - Testnet: ETH miễn phí để test
     - Block time: ~12 giây
     - Có block explorer: Etherscan Sepolia

3. **Block Explorer (Etherscan)**
   - **Chức năng:**
     - Hiển thị thông tin transactions, blocks, contracts
     - Verify và publish source code của smart contracts
     - Theo dõi events và logs

**Pipeline trong Tầng Infrastructure:**

```
Frontend Request (RPC Call)
    ↓
Provider encode request
    ↓
HTTP/WebSocket Request đến RPC Endpoint
    ↓
RPC Provider xử lý request
    ↓
Gửi đến Ethereum Node
    ↓
Node execute và trả về response
    ↓
Provider decode response
    ↓
Frontend nhận kết quả
```

**Ví dụ cụ thể:**

Khi frontend đọc balance của contract:
1. Frontend gọi `contract.getBalance()`
2. Ethers.js encode function call thành RPC call: `eth_call`
3. Provider gửi HTTP POST request đến RPC endpoint:
   ```
   POST https://sepolia.infura.io/v3/...
   {
     "jsonrpc": "2.0",
     "method": "eth_call",
     "params": [{
       "to": "0x...",
       "data": "0x1203db2f..."
     }, "latest"],
     "id": 1
   }
   ```
4. RPC provider forward request đến Ethereum node
5. Node execute `getBalance()` trên contract (view function, không tốn gas)
6. Node trả về balance (BigInt wei)
7. Provider decode response và trả về cho Ethers.js
8. Ethers.js convert BigInt sang string và trả về cho frontend
9. Frontend format và hiển thị: "5.1234 ETH"

### 1.1.2. Pipeline Chi Tiết Cho Các Loại Operations

#### **Pipeline 1: Read Operations (Đọc Dữ Liệu)**

**Đặc điểm:**
- Không cần ví kết nối
- Không tốn gas fee
- Sử dụng `eth_call` RPC method
- Response ngay lập tức

**Pipeline chi tiết:**

```
┌─────────────────────────────────────────────────────────┐
│ Bước 1: Component Mount                                  │
│ - ContractInfo.tsx render                                │
│ - Gọi useContract() hook                                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 2: Hook Initialize                                 │
│ - useContract.ts: useEffect(() => loadAllData())        │
│ - Gọi loadContractData()                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 3: Service Layer - Tạo Contract Instance           │
│ - ethers.service.ts: getContract()                       │
│   → getProvider() → BrowserProvider/JsonRpcProvider      │
│   → new ethers.Contract(ADDRESS, ABI, provider)         │
│   → Cache contract instance                             │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: Gọi View Function                               │
│ - contract.getBalance()                                  │
│ - Ethers.js encode function call                        │
│   → Function selector: 0x1203db2f...                    │
│   → Encode thành data: "0x1203db2f..."                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: RPC Call                                        │
│ - Provider.send("eth_call", [{                         │
│     to: CONTRACT_ADDRESS,                               │
│     data: "0x1203db2f..."                               │
│   }, "latest"])                                         │
│ - HTTP POST đến RPC endpoint                            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 6: Blockchain Execute                             │
│ - Ethereum Node nhận RPC call                           │
│ - Execute getBalance() trên contract                    │
│ - Trả về balance (BigInt wei): "5000000000000000000"   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 7: Decode Response                                │
│ - Provider nhận response                                │
│ - Ethers.js decode kết quả                              │
│ - Convert BigInt: 5000000000000000000n                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 8: Format & Store                                 │
│ - ethers.formatEther(balance) → "5.0"                  │
│ - Hook lưu vào contractStore                           │
│   → setContractBalance("5.0")                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 9: UI Update                                       │
│ - Component đọc từ store                                │
│ - React re-render với data mới                          │
│ - Hiển thị: "Balance: 5.0 ETH"                         │
└─────────────────────────────────────────────────────────┘
```

**Thời gian thực thi:** ~100-500ms (tùy vào RPC provider và network latency)

#### **Pipeline 2: Write Operations (Ghi Dữ Liệu)**

**Đặc điểm:**
- Cần ví kết nối (phải có signer)
- Tốn gas fee
- Cần user approve transaction
- Sử dụng `eth_sendTransaction` RPC method
- Phải đợi transaction được mine vào block

**Pipeline chi tiết:**

```
┌─────────────────────────────────────────────────────────┐
│ Bước 1: User Action                                     │
│ - User nhập amount: "0.1"                               │
│ - Click nút "Donate"                                    │
│ - DonateForm.tsx: handleDonate()                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 2: Validation                                     │
│ - Hook validate amount > 0                              │
│ - Check ví đã kết nối chưa                              │
│ - Check đủ balance không                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 3: Service Layer - Tạo Transaction                │
│ - ethers.service.ts: donateETH("0.1")                  │
│   → getSigner() → Lấy signer từ provider                │
│   → signer.sendTransaction({                           │
│       to: CONTRACT_ADDRESS,                             │
│       value: ethers.parseEther("0.1")                  │
│     })                                                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: Wallet Popup (MetaMask/Safe)                   │
│ - MetaMask popup hiện ra                                │
│ - Hiển thị: "Send 0.1 ETH to 0x..."                    │
│ - User review và approve                                │
│ - Wallet ký transaction với private key                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: Transaction Signed                             │
│ - Transaction object: {                                 │
│     to: "0x...",                                        │
│     value: "100000000000000000",                        │
│     gasPrice: "20000000000",                           │
│     gasLimit: "21000",                                  │
│     nonce: 42,                                          │
│     signature: { r, s, v }                              │
│   }                                                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 6: Broadcast Transaction                         │
│ - Provider.send("eth_sendRawTransaction", [tx])        │
│ - Transaction được broadcast lên network                │
│ - Trả về transaction hash: "0xabc123..."               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 7: Transaction Pending                            │
│ - Transaction vào mempool                               │
│ - Miners chọn transaction để mine                       │
│ - Frontend hiển thị: "Transaction pending..."          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 8: Transaction Mined                              │
│ - Miner validate transaction                            │
│ - Execute transaction trong block                        │
│ - Contract receive() function được gọi                  │
│ - Contract update state: balance += 0.1 ETH            │
│ - Contract emit event: donationReceived(...)            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 9: Wait for Confirmation                          │
│ - tx.wait() đợi transaction được confirm               │
│ - Đợi 1-2 block confirmations                           │
│ - Trả về transaction receipt                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 10: Event Detection                               │
│ - Frontend listen event donationReceived                │
│ - Event listener được trigger                           │
│ - Hook gọi refreshData()                                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 11: UI Update                                     │
│ - Hook load lại contract data                           │
│ - Store được update với data mới                        │
│ - Component re-render                                   │
│ - Hiển thị: "Donation successful! New balance: 5.1 ETH"│
└─────────────────────────────────────────────────────────┘
```

**Thời gian thực thi:** ~15-60 giây (tùy vào network congestion và gas price)

#### **Pipeline 3: Event Listening (Lắng Nghe Events)**

**Đặc điểm:**
- Real-time updates
- Không tốn gas (chỉ đọc logs)
- Sử dụng `eth_getLogs` RPC method
- Có thể query historical events hoặc listen real-time

**Pipeline chi tiết:**

```
┌─────────────────────────────────────────────────────────┐
│ Bước 1: Hook Setup Event Listener                      │
│ - useContract.ts: useEffect(() => {                    │
│     const contract = getContract();                     │
│     contract.on('donationReceived', onDonationReceived) │
│   })                                                    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 2: Ethers.js Register Listener                    │
│ - Contract instance đăng ký event listener              │
│ - Tạo filter cho event:                                │
│   contract.filters.donationReceived()                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 3: Polling Mechanism                              │
│ - Ethers.js tự động poll blockchain                     │
│ - Mỗi 4 giây gọi eth_getLogs                           │
│ - Query logs từ block mới nhất                          │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: New Event Detected                             │
│ - Blockchain có transaction mới                        │
│ - Contract emit event donationReceived                  │
│ - Event được lưu trong transaction logs                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: RPC Call Get Logs                              │
│ - Provider.send("eth_getLogs", [{                     │
│     address: CONTRACT_ADDRESS,                          │
│     topics: ["0x..."] // Event signature                │
│     fromBlock: "latest"                                │
│   }])                                                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 6: Blockchain Return Logs                         │
│ - Node trả về event logs                               │
│ - Logs chứa: donor, amount, balance, timestamp         │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 7: Decode Event                                   │
│ - Ethers.js decode event logs                           │
│ - Parse event args: {                                   │
│     donor: "0x...",                                     │
│     amount: 100000000000000000n,                       │
│     balance: 5000000000000000000n,                      │
│     timestamp: 1704067200n                              │
│   }                                                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 8: Callback Triggered                             │
│ - onDonationReceived() callback được gọi                │
│ - Hook gọi refreshData()                                │
│ - Load lại contract data và donations                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 9: UI Update                                      │
│ - Store được update với donation mới                    │
│ - Component re-render                                   │
│ - Hiển thị donation mới trong DonationHistory           │
└─────────────────────────────────────────────────────────┘
```

**Thời gian phát hiện:** ~4-12 giây (tùy vào polling interval và block time)

#### **Pipeline 4: Query Historical Events (Truy Vấn Events Lịch Sử)**

**Đặc điểm:**
- Query tất cả events từ một block cụ thể đến hiện tại
- Sử dụng `eth_getLogs` với `fromBlock` và `toBlock`
- Không tốn gas (chỉ đọc logs)

**Pipeline chi tiết:**

```
┌─────────────────────────────────────────────────────────┐
│ Bước 1: User Action                                     │
│ - User vào trang "Donation History"                     │
│ - Component mount và gọi loadDonations()                │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 2: Hook Load Historical Events                    │
│ - useContract.ts: loadDonations()                       │
│   → getContract()                                       │
│   → contract.filters.donationReceived()                 │
│   → contract.queryFilter(filter, 0n) // từ block 0      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 3: RPC Call Get Logs                              │
│ - Provider.send("eth_getLogs", [{                      │
│     address: CONTRACT_ADDRESS,                          │
│     topics: ["0x...", null, null, null],                │
│     fromBlock: "0x0",                                   │
│     toBlock: "latest"                                   │
│   }])                                                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 4: Blockchain Return All Logs                      │
│ - Node query tất cả logs từ block 0 đến latest          │
│ - Trả về array of logs: [log1, log2, ..., logN]        │
│ - Mỗi log chứa: transactionHash, blockNumber, data     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 5: Decode & Parse Events                           │
│ - Ethers.js decode từng log                             │
│ - Parse thành event objects:                            │
│   [{ donor, amount, balance, timestamp, txHash }, ...]  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 6: Process & Format Data                          │
│ - Filter events có amount > 0                           │
│ - Format amount: ethers.formatEther(amount)             │
│ - Sort theo timestamp (mới nhất trước)                  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 7: Store Data                                      │
│ - Hook lưu vào contractStore                            │
│   → setDonations(donationsList, true)                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ Bước 8: UI Display                                      │
│ - Component đọc từ store                                 │
│ - Render danh sách donations                            │
│ - Hiển thị: Donor, Amount, Time, Transaction Hash      │
└─────────────────────────────────────────────────────────┘
```

**Thời gian thực thi:** ~1-5 giây (tùy vào số lượng events và RPC provider)

#### **Bảng So Sánh Các Pipeline**

| Đặc điểm | Read Operations | Write Operations | Event Listening | Query Historical Events |
|----------|----------------|------------------|-----------------|------------------------|
| **Cần ví kết nối** | ❌ Không | ✅ Có | ❌ Không | ❌ Không |
| **Tốn gas** | ❌ Không | ✅ Có | ❌ Không | ❌ Không |
| **RPC Method** | `eth_call` | `eth_sendTransaction` | `eth_getLogs` (polling) | `eth_getLogs` (query) |
| **Thời gian** | ~100-500ms | ~15-60s | ~4-12s (detection) | ~1-5s |
| **User approval** | ❌ Không | ✅ Có (MetaMask/Safe) | ❌ Không | ❌ Không |
| **Real-time** | ❌ Không | ❌ Không | ✅ Có | ❌ Không |
| **Ví dụ** | Đọc balance | Gửi donation | Lắng nghe donation mới | Load donation history |

### 1.1.3. Luồng Dữ Liệu Giữa Các Tầng

**Luồng dữ liệu từ trên xuống (User → Blockchain):**

```
User Input/Click
    ↓
UI Component (handle event)
    ↓
Custom Hook (business logic)
    ↓
Service Layer (create transaction)
    ↓
Ethers.js (encode & sign)
    ↓
Provider (RPC call)
    ↓
Blockchain Network (execute)
    ↓
Smart Contract (update state)
```

**Luồng dữ liệu từ dưới lên (Blockchain → User):**

```
Smart Contract (emit event / return value)
    ↓
Blockchain Network (logs / response)
    ↓
Provider (decode response / logs)
    ↓
Ethers.js (parse data)
    ↓
Service Layer (format data)
    ↓
Custom Hook (update store)
    ↓
State Management (Zustand store)
    ↓
UI Component (re-render)
    ↓
User sees updated data
```

**Luồng dữ liệu hai chiều (Bidirectional):**

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Components: User interactions, Display data      │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Hooks: Business logic, State management         │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Services: Blockchain interaction, Data format   │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Ethers.js: Encode/Decode, Sign transactions      │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Provider: RPC calls, Network communication        │  │
│  └────────────────────┬──────────────────────────────┘  │
│                       ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Blockchain: Execute, Store state, Emit events    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1.1.4. Các Điểm Quan Trọng Trong Pipeline

#### **1. Provider Selection Strategy (Chiến Lược Chọn Provider)**

Hệ thống sử dụng **fallback mechanism** để đảm bảo luôn có provider:

```
Ưu tiên 1: Safe Wallet Provider
    ↓ (nếu không có)
Ưu tiên 2: MetaMask BrowserProvider
    ↓ (nếu không có)
Ưu tiên 3: Public RPC Provider (JsonRpcProvider)
```

**Lý do:**
- **Safe Wallet**: Ưu tiên cao nhất vì cần multisig cho admin operations
- **MetaMask**: User-friendly, dễ sử dụng cho donations
- **Public RPC**: Fallback để đọc data khi không có ví kết nối

**Code implementation:**
```typescript
export const getProvider = (): BrowserProvider | JsonRpcProvider => {
  // 1. Safe Wallet (nếu đang trong Safe)
  if (isSafeWallet && safeEthersProvider) {
    return safeEthersProvider;
  }
  
  // 2. MetaMask (nếu có window.ethereum)
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  
  // 3. Public RPC (fallback)
  return getFallbackProvider();
};
```

#### **2. Contract Instance Caching (Cache Contract Instance)**

Hệ thống cache contract instances để tránh tạo lại nhiều lần:

**Lợi ích:**
- Giảm overhead khi tạo contract instance
- Tối ưu performance
- Đảm bảo consistency

**Code implementation:**
```typescript
const contractCache = new Map<string, ethers.Contract>();

export const getContract = (): Contract | null => {
  // Check cache first
  const cachedContract = contractCache.get(CONTRACT_ADDRESS);
  if (cachedContract) {
    return cachedContract;
  }
  
  // Create new instance và cache
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  contractCache.set(CONTRACT_ADDRESS, contract);
  return contract;
};
```

#### **3. Error Handling & Retry Logic (Xử Lý Lỗi & Retry)**

Hệ thống có retry mechanism cho các operations quan trọng:

**Ví dụ:** `getContractBalance()` có retry logic:
```typescript
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  throw new Error('Max retries reached');
};
```

**Lý do:**
- RPC providers có thể tạm thời không available
- Network latency có thể gây timeout
- Retry giúp tăng reliability

#### **4. State Management Flow (Luồng Quản Lý State)**

State được quản lý theo pattern **unidirectional data flow**:

```
User Action
    ↓
Hook (business logic)
    ↓
Service (blockchain call)
    ↓
Response từ blockchain
    ↓
Hook format data
    ↓
Store update (Zustand)
    ↓
Component re-render
```

**Lợi ích:**
- Dễ debug (data flow rõ ràng)
- Predictable state updates
- Dễ test từng layer

#### **5. Event-Driven Updates (Cập Nhật Theo Sự Kiện)**

Hệ thống sử dụng **event-driven architecture** để update UI real-time:

**Flow:**
1. Contract emit event khi có donation mới
2. Frontend listen event qua `contract.on('donationReceived', callback)`
3. Callback trigger `refreshData()`
4. UI tự động update với data mới

**Code:**
```typescript
useEffect(() => {
  const contract = getContract();
  if (!contract) return;

  const onDonationReceived = () => {
    refreshData(); // Refresh khi có donation mới
  };

  contract.on('donationReceived', onDonationReceived);
  
  return () => {
    contract.off('donationReceived', onDonationReceived);
  };
}, []);
```

#### **6. Data Formatting Pipeline (Pipeline Format Dữ Liệu)**

Dữ liệu từ blockchain luôn được format qua nhiều bước:

```
Blockchain Response (BigInt wei)
    ↓
ethers.formatEther() → String ETH
    ↓
parseFloat() → Number (nếu cần)
    ↓
toFixed(4) → Display format
    ↓
UI Display
```

**Ví dụ:**
```typescript
// Blockchain trả về: 5000000000000000000n (wei)
const balanceWei = await contract.getBalance();

// Format sang ETH: "5.0"
const balanceEth = ethers.formatEther(balanceWei);

// Format để hiển thị: "5.0000"
const displayBalance = parseFloat(balanceEth).toFixed(4);
```

#### **7. Transaction Lifecycle (Vòng Đời Transaction)**

Mỗi write operation trải qua các giai đoạn:

```
1. Pending (Chờ ký)
   - Transaction được tạo
   - Chờ user approve trong wallet
   
2. Signed (Đã ký)
   - Transaction được ký với private key
   - Có transaction hash
   
3. Broadcast (Đã gửi)
   - Transaction được broadcast lên network
   - Vào mempool
   
4. Pending (Chờ mine)
   - Miners chọn transaction
   - Chờ được mine vào block
   
5. Confirmed (Đã confirm)
   - Transaction được mine vào block
   - Có block number
   - Chờ confirmations (1-2 blocks)
   
6. Finalized (Hoàn thành)
   - Transaction đã được confirm đủ
   - State đã được update
   - Events đã được emit
```

**Code tracking:**
```typescript
const tx = await signer.sendTransaction({...});
// tx.hash: Transaction hash (ngay sau khi ký)

await tx.wait(); // Đợi transaction được mine
// tx.blockNumber: Block number khi được mine
// tx.confirmations: Số confirmations
```

### 1.1.5. Tóm Tắt Pipeline Chính

**Pipeline đọc dữ liệu (Read):**
- **Bước:** Component → Hook → Service → Provider → Blockchain → Response → Format → Store → UI
- **Thời gian:** ~100-500ms
- **Đặc điểm:** Nhanh, không cần ví, không tốn gas

**Pipeline ghi dữ liệu (Write):**
- **Bước:** Component → Hook → Service → Wallet Popup → Sign → Broadcast → Mine → Confirm → Event → Refresh → UI
- **Thời gian:** ~15-60s
- **Đặc điểm:** Chậm, cần ví, tốn gas, cần user approval

**Pipeline lắng nghe events:**
- **Bước:** Hook Setup → Register Listener → Polling → Detect Event → Decode → Callback → Refresh → UI
- **Thời gian:** ~4-12s (detection)
- **Đặc điểm:** Real-time, tự động update, không tốn gas

**Pipeline query historical events:**
- **Bước:** Component → Hook → Service → RPC Query → Decode → Format → Store → UI
- **Thời gian:** ~1-5s
- **Đặc điểm:** Load tất cả events, không real-time, không tốn gas

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







