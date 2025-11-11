## 1. Mục tiêu tổng thể

Hệ thống **Charity Donation DApp** cho phép người dùng quyên góp ETH vào một smart contract trung gian. Khi số dư vượt 5 ETH, contract tự động chuyển toàn bộ về ví **Gnosis Safe** (multisig 2/3).
Người quản trị (Safe owners) có thể rút hoặc thay đổi ví Safe trong tương lai.
Frontend cung cấp giao diện cho người dùng xem tổng số tiền, lịch sử, và donate trực tiếp qua MetaMask.
Không sử dụng backend — toàn bộ dữ liệu được lấy trực tiếp từ blockchain hoặc các API công khai (Etherscan, RPC provider).

---

## 2. Tổng quan kiến trúc hệ thống

### 2.1. Kiến trúc phân tầng

```
+---------------------------------------------------------------+
|                        Frontend (React)                       |
|---------------------------------------------------------------|
|   UI Layer: Component giao diện người dùng                    |
|   State Layer: Zustand / Context / Redux (tùy chọn)            |
|   Blockchain Layer: Ethers.js (connect MetaMask, read/write)  |
+---------------------------------------------------------------+
|                     Blockchain / Smart Contract               |
|---------------------------------------------------------------|
|   CharityFund.sol (main logic)                                |
|   Gnosis Safe (2/3 multisig)                                  |
|   MockSafe (local test only)                                  |
|   Sepolia Network / Local Hardhat node                        |
+---------------------------------------------------------------+
|                  Hosting & Infrastructure                     |
|---------------------------------------------------------------|
|   Frontend: Firebase Hosting                                  |
|   Smart Contract: Sepolia / Local Hardhat                     |
|   RPC Provider: Alchemy / Infura / Localhost                  |
|   Etherscan API (optional for query)                          |
+---------------------------------------------------------------+
```

---

## 3. Thành phần chính & nhiệm vụ

### 3.1. Smart Contract Layer

* **Contract chính:** `CharityFund`

  * Chức năng:

    * Nhận ETH (qua `receive()`).
    * Khi balance >= 5 ETH → auto chuyển toàn bộ đến địa chỉ Gnosis Safe.
    * Cho phép gọi thủ công `transferToSafe()` để đẩy quỹ (bất kỳ ai cũng có thể gọi).
    * Chỉ `safe` hiện tại có quyền cập nhật `safe` mới.
  * Biến trạng thái chính:

    * `safe: address`
    * `THRESHOLD: uint256 = 5 ether`
  * Event:

    * `DonationReceived(address donor, uint256 amount, uint256 balance, uint256 time)`
    * `AutoTransfer(uint256 amount, address to, uint256 time)`
    * `SafeUpdated(address old, address new, uint256 time)`

* **Contract phụ (local test):**

  * `MockSafe`: chỉ để nhận ETH và emit event → giúp test local auto transfer logic.

* **Network:**

  * Local: Hardhat Node (RPC: `http://127.0.0.1:8545`)
  * Testnet: Sepolia (Infura RPC)
  * Mainnet: optional, khi demo xong

* **Triển khai:**

  * Sử dụng Hardhat scripts cho compile, deploy, verify.
  * Môi trường local: deploy `MockSafe`, deploy `CharityFund(mockSafe.address)`.
  * Môi trường testnet: deploy `CharityFund(GNOSIS_SAFE_ADDRESS)`.

---

### 3.2. Frontend Layer (React)

#### 3.2.1. Công nghệ chính

* **Framework:** React + Vite
* **Thư viện web3:** `ethers.js`
* **State management:** Zustand
* **UI framework:** Material UI
* **Triển khai:** Firebase Hosting

#### 3.2.2. Cấu trúc thư mục gợi ý

```
frontend/
 ├── src/
 │   ├── components/
 │   │    ├── DonateForm.jsx
 │   │    ├── WalletConnect.jsx
 │   │    ├── AdminDashboard.jsx
 │   │    ├── DonationHistory.jsx
 │   │    └── ContractInfo.jsx
 │   ├── hooks/
 │   │    ├── useWallet.js
 │   │    ├── useContract.js
 │   │    └── useEvents.js
 │   ├── services/
 │   │    └── ethers.service.js  (tạo provider, contract instance)
 │   ├── pages/
 │   │    ├── Home.jsx
 │   │    ├── Donate.jsx
 │   │    └── Admin.jsx
 │   ├── constants/
 │   │    ├── contractABI.js
 │   │    ├── contractAddress.js
 │   │    └── networkConfig.js
 │   ├── App.jsx
 │   └── main.jsx
 ├── vite.config.js
 └── firebase.json
```

#### 3.2.3. Chức năng chi tiết

| Chức năng                               | Mô tả                                                                       | Nguồn dữ liệu                         |
| --------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| **Connect Wallet**                      | Kết nối MetaMask hoặc WalletConnect                                         | `window.ethereum`                     |
| **Donate ETH**                          | Gửi ETH tới địa chỉ contract, hiển thị receipt (tx hash, amount, timestamp) | Tx gửi qua `signer.sendTransaction()` |
| **Xem tổng số tiền đã nhận**            | Tổng hợp từ event `DonationReceived`                                        | Query `contract.queryFilter`          |
| **Xem tổng số tiền đã chuyển đi (chi)** | Tổng hợp event `AutoTransfer`                                               | Query `contract.queryFilter`          |
| **Xem lịch sử nhận**                    | Danh sách event `DonationReceived`                                          | `queryFilter` hoặc Etherscan API      |
| **Xem lịch sử chi**                     | Danh sách event `AutoTransfer`                                              | `queryFilter` hoặc Etherscan API      |
| **Hiển thị địa chỉ ví Smart Contract**  | Hiển thị trực tiếp trên UI                                                  | `.env` / constant                     |
| **Manual Transfer (optional)**          | Gọi hàm `transferToSafe()` từ giao diện admin                               | signer gọi hàm                        |
| **Search / filter donor**               | Lọc local trên danh sách event (frontend xử lý)                             | local state                           |

#### 3.2.4. Data Flow (Frontend)

```
User Action → MetaMask → Contract on Sepolia → Event emitted →
Ethers.js listens via queryFilter → Frontend UI updates
```

---

## 4. Quy trình triển khai và môi trường

### 4.1. Local Development

| Layer           | Công cụ                 | Mục tiêu                               |
| --------------- | ----------------------- | -------------------------------------- |
| Smart Contract  | Hardhat + MockSafe      | Viết, test logic nhận và tự chuyển quỹ |
| Blockchain Node | `npx hardhat node`      | RPC local                              |
| Frontend        | React (Vite dev server) | Kết nối `localhost:8545`               |
| Wallet          | MetaMask                | Kết nối local RPC                      |

**Cách test:**
Deploy MockSafe + CharityFund → kết nối MetaMask RPC localhost → gửi ETH → kiểm tra contract tự chuyển MockSafe.

---

### 4.2. Testnet (Sepolia)

| Thành phần     | Mô tả                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Smart Contract | Deploy CharityFund với `SAFE_ADDRESS` (Gnosis Safe thật trên Sepolia) |
| Wallet         | 3 ví multisig (đã tạo trên Safe Global)                               |
| Frontend       | Deploy Firebase, config `VITE_RPC_URL` = Alchemy/Infura Sepolia       |
| Data source    | Etherscan Sepolia API để tra lịch sử donate nếu cần                   |

---

### 4.3. Production (optional)

| Layer          | Hạ tầng đề xuất                 |
| -------------- | ------------------------------- |
| Smart Contract | Ethereum Mainnet                |
| Gnosis Safe    | Mainnet Safe                    |
| Frontend       | Firebase / Vercel / Netlify     |
| RPC Provider   | Infura/Alchemy mainnet endpoint |

---

## 5. Kiến trúc dữ liệu (Data Model)

Dù không có backend, vẫn cần mô hình hóa dữ liệu để AI Agent hiểu các entity và quan hệ.

### 5.1. Entities trong contract

| Entity       | Thuộc tính                                                                  | Mô tả                       |
| ------------ | --------------------------------------------------------------------------- | --------------------------- |
| **Donation** | `donor: address`, `amount: uint256`, `timestamp: uint256`, `txHash: string` | Từ event `DonationReceived` |
| **Transfer** | `amount: uint256`, `to: address`, `timestamp: uint256`, `txHash: string`    | Từ event `AutoTransfer`     |
| **Safe**     | `address`, `updatedAt`                                                      | Từ event `SafeUpdated`      |

### 5.2. Entities trong frontend (client-side model)

```ts
Donation {
  donor: string,
  amount: number,
  timestamp: number,
  txHash: string
}

Transfer {
  amount: number,
  to: string,
  timestamp: number,
  txHash: string
}

Safe {
  address: string,
  updatedAt: number
}
```

### 5.3. Derived data (tính toán từ events)

| Dữ liệu            | Nguồn                                      |
| ------------------ | ------------------------------------------ |
| `totalReceived`    | Sum of `Donation.amount`                   |
| `totalTransferred` | Sum of `Transfer.amount`                   |
| `currentBalance`   | `provider.getBalance(contractAddress)`     |
| `donorCount`       | Số lượng địa chỉ donor unique trong events |

---

## 6. Cấu hình môi trường & biến hệ thống

| Biến                     | Vai trò                                     |
| ------------------------ | ------------------------------------------- |
| `VITE_CONTRACT_ADDRESS`  | Địa chỉ contract trên Sepolia / local       |
| `VITE_RPC_URL`           | RPC endpoint (Alchemy / Infura / localhost) |
| `VITE_NETWORK`           | `"local"` hoặc `"sepolia"`                  |
| `VITE_SAFE_ADDRESS`      | Địa chỉ Gnosis Safe (hiển thị UI)           |
| `VITE_ETHERSCAN_API_KEY` | Nếu dùng API để tra lịch sử                 |

---

## 7. Bảo mật & hạn chế

* Không lưu private key trên frontend.
* Frontend chỉ đọc event từ blockchain, không ghi dữ liệu nhạy cảm.
* Các giao dịch donate, transfer đều require gas và xác nhận qua MetaMask.
* Khi test local, mock safe address chỉ để kiểm tra logic; không dùng cho demo thật.
* Không có backend nên mọi dữ liệu "thống kê" phải tính client-side mỗi lần load.

---

## 8. Hướng mở rộng tương lai (hiện tại chưa làm)

* Thêm backend (Firebase Functions hoặc Node server) để index event → cải thiện tốc độ và cho phép tìm kiếm nâng cao.
* Tích hợp TheGraph để query dữ liệu blockchain nhanh.
* Tự động gửi email receipt (dựa trên tx hash).
* Thêm cơ chế whitelist hoặc NFT chứng nhận người donate.

---

## 9. Tổng quan workflow AI Agent có thể thực hiện

1. **Generate Smart Contract Code:**

   * Input: Mô tả logic từ mục 3.1
   * Output: File `CharityFund.sol` + `MockSafe.sol`
   * Tool: Solidity template + Hardhat deploy scripts

2. **Generate Hardhat Project:**

   * Setup dependencies, tạo `hardhat.config.js`, scripts deploy/test.
   * Gắn RPC local & Sepolia từ .env.

3. **Generate Frontend React:**

   * Tạo cấu trúc thư mục theo mục 3.2.2
   * Sinh component cơ bản: WalletConnect, DonateForm, Dashboard
   * Tạo file `.env` mẫu với các biến hệ thống

4. **Generate Firebase Hosting Config:**

   * `firebase.json`, `build` folder deploy
   * Auto deploy script

5. **Run Local Test Flow:**

   * Deploy local contracts
   * Chạy React frontend (localhost:5173)
   * MetaMask RPC local
   * Gửi ETH, test auto-transfer
