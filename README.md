# SOLID FUND - Transparent Charity Donation Platform

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow)
![React](https://img.shields.io/badge/React-19.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 📖 Giới Thiệu

**SOLID FUND** là một nền tảng quyên góp từ thiện phi tập trung (DApp) được xây dựng trên blockchain Ethereum. Hệ thống tự động chuyển tiền quyên góp về ví **Gnosis Safe** (multisig 2/3) khi đạt ngưỡng 5 ETH, đảm bảo tính minh bạch và an toàn tuyệt đối.

### ✨ Tính Năng Chính

- 🔐 **Bảo mật tối đa**: Sử dụng Gnosis Safe multisig wallet
- ⚡ **Tự động hóa**: Auto-transfer khi đạt threshold 5 ETH
- 📊 **Minh bạch**: Tất cả giao dịch được ghi trên blockchain
- 🌐 **Không backend**: Dữ liệu đọc trực tiếp từ blockchain
- 🎨 **UI hiện đại**: Giao diện đẹp với Material-UI
- 📱 **Responsive**: Hoạt động tốt trên mọi thiết bị

run on terminal:

cd /Users/ngocuit/Desktop/Demo/frontend
     # ensure env exists
     printf "%s\n" \
       "VITE_NETWORK=sepolia" \
       "VITE_RPC_URL=https://rpc.sepolia.org" \
       "VITE_CONTRACT_ADDRESS=0x86A5966EDfd2437273749C51e0339e2c318e8B96" \
       "VITE_SAFE_ADDRESS=0x595f794dB3beA04c04d329264F627A322c307c21" \
       "VITE_ETHERSCAN_API_KEY=" \
       > .env
     npm install
     npm run dev

