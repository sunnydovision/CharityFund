# SOLID FUND - Frontend

React + TypeScript frontend cho SOLID FUND charity donation platform.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit: http://localhost:5173

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📝 Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

```env
VITE_CONTRACT_ADDRESS=0x...     # CharityFund contract address
VITE_SAFE_ADDRESS=0x...         # Gnosis Safe address
VITE_NETWORK=localhost          # localhost | sepolia | mainnet
VITE_RPC_URL=http://127.0.0.1:8545
```

## 🎨 Features

- **Wallet Connection**: MetaMask integration
- **Donate**: Send ETH donations
- **Dashboard**: View contract stats and progress
- **History**: Track all donations and transfers
- **Admin**: Manual transfer controls
- **Real-time**: Live blockchain event updates

## 🛠️ Tech Stack

- React 19
- TypeScript 5.9
- Vite 7.1
- Material-UI 5.15
- Ethers.js 6.9
- Zustand 4.4
- React Router 6.21

## 📁 Structure

```
frontend/
├── src/
│   ├── components/    # React components
│   ├── pages/        # Page components
│   ├── hooks/        # Custom hooks
│   ├── services/     # Web3 services
│   ├── store/        # Zustand stores
│   ├── constants/    # Config & ABIs
│   └── theme.ts      # MUI theme
├── public/           # Static assets
└── index.html        # Entry HTML
```

## 🔧 Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

## 📚 Documentation

See main repository README for complete documentation.
